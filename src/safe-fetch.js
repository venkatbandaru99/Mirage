/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 *
 * Fetch a spec from a user-supplied URL without letting the public server be
 * used to reach internal addresses (SSRF). Every connection - including each
 * redirect hop - resolves DNS through a lookup hook that rejects private,
 * loopback, link-local, CGNAT, multicast and other non-public addresses, so
 * DNS-rebinding tricks can't slip through between "check" and "connect".
 */

const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;

// Addresses a public web server has no business fetching from
const blockList = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4]
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv4'));
[
  // IPv4-mapped addresses (::ffff:a.b.c.d) are unwrapped in isBlockedAddress
  // and checked against the IPv4 rules instead: a ::ffff:0:0/96 rule here
  // would make BlockList block every IPv4 address.
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64],
  ['2001:db8::', 32], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv6'));

class SafeFetchError extends Error {}

function isBlockedAddress(address) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) {
    return blockList.check(mapped[1], 'ipv4');
  }
  // Hex form, e.g. ::ffff:7f00:1 (what URL parsing turns ::ffff:127.0.0.1 into)
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return blockList.check(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`, 'ipv4');
  }
  return blockList.check(address, net.isIPv6(address) ? 'ipv6' : 'ipv4');
}

// dns.lookup replacement used by http(s).request: resolves, then refuses to
// connect to blocked addresses.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
    const allowed = list.filter(a => !isBlockedAddress(a.address));
    if (allowed.length === 0) {
      return callback(new SafeFetchError(`Refusing to fetch from a private or reserved address (${hostname})`));
    }
    if (options.all) {
      return callback(null, allowed);
    }
    callback(null, allowed[0].address, allowed[0].family);
  });
}

// github.com/<owner>/<repo>/blob/<ref>/<path> -> raw file URL
function normalizeSpecUrl(input) {
  const url = new URL(input);
  if (url.hostname === 'github.com') {
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (match) {
      return new URL(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`);
    }
  }
  return url;
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return reject(new SafeFetchError('Only http and https URLs are supported'));
    }
    // A literal IP skips DNS, so check it here too
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(host) && isBlockedAddress(host)) {
      return reject(new SafeFetchError('Refusing to fetch from a private or reserved address'));
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'GET',
      lookup: safeLookup,
      headers: {
        'User-Agent': 'MirageAPI spec fetcher (+https://mirageapi.com)',
        Accept: 'application/json, application/yaml, text/yaml, text/plain, */*'
      },
      timeout: TIMEOUT_MS
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve({ redirect: new URL(res.headers.location, url) });
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new SafeFetchError(`The URL returned HTTP ${res.statusCode}`));
      }

      const chunks = [];
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          req.destroy(new SafeFetchError('The spec is larger than the 5 MB limit'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });

    req.on('timeout', () => req.destroy(new SafeFetchError('Timed out fetching the spec')));
    req.on('error', reject);
    req.end();
  });
}

// Returns the response body as text. Throws SafeFetchError for anything the
// user should see (bad URL, blocked address, HTTP error, too large, timeout).
async function fetchSpecText(input) {
  let url;
  try {
    url = normalizeSpecUrl(input);
  } catch (error) {
    throw new SafeFetchError('Please enter a valid URL');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let result;
    try {
      result = await requestOnce(url);
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      throw new SafeFetchError(`Could not fetch the URL: ${error.message}`);
    }
    if (!result.redirect) {
      return result.body;
    }
    url = result.redirect;
  }
  throw new SafeFetchError('Too many redirects');
}

module.exports = { fetchSpecText, SafeFetchError, isBlockedAddress, normalizeSpecUrl };
