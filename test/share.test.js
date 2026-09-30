// Shareable mock URLs and the share store
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { SAMPLE_SPEC, startServer, client } = require('./helpers');
const { ShareStore, RateLimiter } = require('../src/share-store');

const specText = fs.readFileSync(SAMPLE_SPEC, 'utf8');

describe('shared mock URLs (web mode)', () => {
  let ctx;
  let app; // a browser session
  let clock = Date.now();

  before(async () => {
    const shareStore = new ShareStore({ now: () => clock });
    ctx = await startServer({}, { webMode: true, shareStore });
    app = client(ctx.base);
  });
  after(() => ctx.close());

  test('sharing needs a loaded spec', async () => {
    const res = await app('/api/share', { method: 'POST' });
    assert.equal(res.status, 400);
  });

  test('create, call without a session, update, stop', async () => {
    assert.equal((await app('/api/parse-spec', { method: 'POST', json: { spec: specText, type: 'yaml' } })).status, 200);

    const created = await app('/api/share', { method: 'POST' });
    assert.equal(created.status, 200);
    assert.match(created.body.id, /^[A-Za-z0-9_-]{8}$/);
    assert.equal(created.body.url, `${ctx.base}/m/${created.body.id}`);
    assert.equal((await app('/api/share')).body.share.id, created.body.id);

    // A different caller with no cookie
    const anyone = client(ctx.base);
    const res = await anyone(`/m/${created.body.id}/customers`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.headers.get('x-robots-tag'), 'noindex');
    assert.equal(res.headers.get('set-cookie'), null, 'no session for shared mocks');

    // Controls and validation work on shared mocks too
    assert.equal((await anyone(`/m/${created.body.id}/customers/not-a-uuid`)).status, 400);
    assert.equal((await anyone(`/m/${created.body.id}/customers?__status=500`)).status, 500);
    assert.ok((await anyone(`/m/${created.body.id}/_mirage/routes`)).body.routes.includes('GET /customers'));
    assert.equal((await anyone(`/m/${created.body.id}/nope`)).status, 404);

    // Updating keeps the link
    const updated = await app('/api/share', { method: 'POST' });
    assert.equal(updated.body.id, created.body.id);

    // Stop sharing
    assert.equal((await app('/api/share', { method: 'DELETE' })).body.removed, true);
    const gone = await anyone(`/m/${created.body.id}/customers`);
    assert.equal(gone.status, 404);
    assert.equal(gone.body.error, 'Share not found or expired');
  });

  test('links expire after 7 days', async () => {
    const created = await app('/api/share', { method: 'POST' });
    const anyone = client(ctx.base);
    assert.equal((await anyone(`/m/${created.body.id}/customers`)).status, 200);
    clock += 7 * 24 * 60 * 60 * 1000 + 1;
    assert.equal((await anyone(`/m/${created.body.id}/customers`)).status, 404);
  });

  test('unknown share ids are 404', async () => {
    assert.equal((await client(ctx.base)('/m/AAAAAAAA/customers')).status, 404);
  });
});

describe('ShareStore', () => {
  test('evicts the oldest share beyond the cap', () => {
    const store = new ShareStore({ maxShares: 2 });
    const a = store.save('s1', { parsedPaths: {} });
    store.save('s2', { parsedPaths: {} });
    store.save('s3', { parsedPaths: {} });
    assert.equal(store.get(a.id), undefined);
    assert.equal(store.shares.size, 2);
    store.close();
  });

  test('rejects specs over the size limit', () => {
    const store = new ShareStore({ maxBytes: 100 });
    assert.throws(() => store.save('s', { parsedPaths: { big: 'x'.repeat(200) } }), /too large/);
    store.close();
  });
});

describe('RateLimiter', () => {
  test('blocks after the limit within a window, then resets', () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    assert.equal(limiter.allow('k'), true);
    assert.equal(limiter.allow('k'), true);
    assert.equal(limiter.allow('k'), false);
    assert.equal(limiter.allow('other'), true);
    now = 1000;
    assert.equal(limiter.allow('k'), true);
  });
});
