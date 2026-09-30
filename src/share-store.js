/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 *
 * In-memory store for shared mocks (mirageapi.com/m/<id>/...). Shares expire
 * after 7 days and are lost when the server restarts - fine for a first
 * version; swap this class for a Redis/Postgres-backed one to keep them.
 */

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

class ShareStore {
  constructor({
    ttlMs = 7 * DAY_MS,
    maxShares = 2000,
    maxBytes = 2 * 1024 * 1024,
    sweepIntervalMs = 60 * 60 * 1000,
    now = () => Date.now()
  } = {}) {
    this.ttlMs = ttlMs;
    this.maxShares = maxShares;
    this.maxBytes = maxBytes;
    this.now = now;
    this.shares = new Map(); // id -> share (insertion order = oldest first)
    this.bySession = new Map(); // creator session id -> share id

    // Drop expired shares periodically; unref so it never keeps the process alive
    this.sweeper = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweeper.unref();
  }

  _newId() {
    let id;
    do {
      id = crypto.randomBytes(6).toString('base64url'); // 8 URL-safe chars
    } while (this.shares.has(id));
    return id;
  }

  // Create the session's share, or update it in place so its link survives
  // spec edits. Throws if the spec is too large to share.
  save(sessionId, { parsedPaths, title, specVersion }) {
    const size = Buffer.byteLength(JSON.stringify(parsedPaths));
    if (size > this.maxBytes) {
      throw new Error(`This spec is too large to share (limit ${Math.round(this.maxBytes / 1024 / 1024)} MB)`);
    }

    const existing = this.get(this.bySession.get(sessionId));
    const createdAt = this.now();
    const share = {
      id: existing ? existing.id : this._newId(),
      parsedPaths,
      title: title || 'Untitled API',
      specVersion,
      creatorSessionId: sessionId,
      createdAt: existing ? existing.createdAt : createdAt,
      updatedAt: createdAt,
      expiresAt: createdAt + this.ttlMs
    };

    // Re-insert so updated shares move to the "newest" end for eviction
    this.shares.delete(share.id);
    this.shares.set(share.id, share);
    this.bySession.set(sessionId, share.id);

    while (this.shares.size > this.maxShares) {
      const oldestId = this.shares.keys().next().value;
      this._remove(oldestId);
    }
    return share;
  }

  // The share, or undefined when unknown or expired
  get(id) {
    if (!id) return undefined;
    const share = this.shares.get(id);
    if (!share) return undefined;
    if (share.expiresAt <= this.now()) {
      this._remove(id);
      return undefined;
    }
    return share;
  }

  getForSession(sessionId) {
    return this.get(this.bySession.get(sessionId));
  }

  deleteForSession(sessionId) {
    const id = this.bySession.get(sessionId);
    if (!id) return false;
    this._remove(id);
    return true;
  }

  sweep() {
    for (const id of [...this.shares.keys()]) {
      this.get(id); // removes it if expired
    }
  }

  _remove(id) {
    const share = this.shares.get(id);
    if (!share) return;
    this.shares.delete(id);
    if (this.bySession.get(share.creatorSessionId) === id) {
      this.bySession.delete(share.creatorSessionId);
    }
  }

  close() {
    clearInterval(this.sweeper);
  }
}

// Fixed-window counter: allow(key) is false once `limit` hits happen within
// `windowMs`. Used to rate-limit share creation and shared-mock traffic.
class RateLimiter {
  constructor({ limit, windowMs, now = () => Date.now() }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.windows = new Map();
  }

  allow(key) {
    const now = this.now();
    let window = this.windows.get(key);
    if (!window || now - window.start >= this.windowMs) {
      window = { start: now, count: 0 };
      this.windows.set(key, window);
      // Keep memory bounded: occasionally drop stale windows
      if (this.windows.size > 10000) {
        for (const [k, w] of this.windows) {
          if (now - w.start >= this.windowMs) this.windows.delete(k);
        }
      }
    }
    window.count += 1;
    return window.count <= this.limit;
  }
}

module.exports = { ShareStore, RateLimiter };
