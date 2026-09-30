// Shared helpers for the node:test suites
const path = require('path');
const SpecParser = require('../src/parser');
const MockServer = require('../src/server');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const SAMPLE_SPEC = path.join(__dirname, '../examples/sample-spec.yaml');
const SWAGGER2_SPEC = path.join(__dirname, 'fixtures/petstore-swagger2.yaml');

// Run fn with console.log silenced (the parser and server are chatty)
async function quietly(fn) {
  const log = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
  }
}

async function parse(specPath) {
  return quietly(async () => {
    const parser = new SpecParser();
    await parser.parseSpec(specPath);
    return parser.getParsedPaths();
  });
}

// Start a MockServer on a random port. Returns { base, server, close }.
async function startServer(parsedPaths, options = {}) {
  const server = await quietly(() => new MockServer(parsedPaths, options));
  const httpServer = await new Promise(resolve => {
    const s = server.getApp().listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${httpServer.address().port}`;
  const close = () => new Promise(resolve => {
    server.shareStore.close();
    httpServer.close(resolve);
  });
  return { base, server, close };
}

// fetch that silences request logging and keeps one cookie (a session)
function client(base) {
  let cookie = null;
  return async (urlPath, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers.cookie = cookie;
    if (options.json !== undefined) {
      headers['content-type'] = 'application/json';
      options = { ...options, body: JSON.stringify(options.json) };
    }
    const res = await quietly(() => fetch(base + urlPath, { ...options, headers }));
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status, headers: res.headers, body };
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = { SAMPLE_SPEC, SWAGGER2_SPEC, parse, startServer, client, quietly, UUID };
