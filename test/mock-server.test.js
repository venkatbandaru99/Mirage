// Mock responses, simulation controls, validation and Swagger 2.0 support
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { SAMPLE_SPEC, SWAGGER2_SPEC, parse, startServer, client, UUID } = require('./helpers');
const MockServer = require('../src/server');

const CUSTOMER_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('route matching', () => {
  const server = new MockServer({});
  const routes = { 'GET /a': { n: 1 }, 'GET /a/{id}': { n: 2 }, 'GET /x.y/{p}/z': { n: 3 } };

  test('exact, templated, escaped and non-matching paths', () => {
    assert.equal(server._matchRoute(routes, 'GET', '/a').route.n, 1);
    assert.deepEqual(server._matchRoute(routes, 'GET', '/a/42').pathParams, { id: '42' });
    assert.deepEqual(server._matchRoute(routes, 'GET', '/x.y/a%20b/z').pathParams, { p: 'a b' });
    assert.equal(server._matchRoute(routes, 'GET', '/xzy/q/z'), null);
    assert.equal(server._matchRoute(routes, 'POST', '/a'), null);
    assert.equal(server._matchRoute(routes, 'GET', '/a/1/2'), null);
  });
});

describe('sample spec (CLI mode)', () => {
  let ctx;
  let get;
  before(async () => {
    ctx = await startServer(await parse(SAMPLE_SPEC));
    get = client(ctx.base);
  });
  after(() => ctx.close());

  test('GET returns generated data matching the schema', async () => {
    const res = await get('/customers');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    for (const customer of res.body) {
      assert.match(customer.id, UUID);
      assert.ok(['active', 'inactive', 'pending'].includes(customer.status));
    }
  });

  test('path parameters are validated', async () => {
    assert.equal((await get(`/customers/${CUSTOMER_ID}`)).status, 200);
    const invalid = await get('/customers/not-a-uuid');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.errors[0].in, 'path');
    assert.equal((await get('/customers/not-a-uuid?__validate=false')).status, 200);
    assert.equal((await get('/customers/not-a-uuid', { headers: { 'x-mirage-validate': 'false' } })).status, 200);
  });

  test('query parameters are validated and coerced', async () => {
    assert.equal((await get('/customers?limit=10')).status, 200);
    const invalid = await get('/customers?limit=abc');
    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body.errors.map(e => e.path), ['/limit']);
  });

  test('POST bodies are validated; valid ones are echoed with an id', async () => {
    const invalid = await get('/customers', { method: 'POST', json: { firstName: 'A', email: 'nope' } });
    assert.equal(invalid.status, 400);
    const paths = invalid.body.errors.map(e => e.path);
    assert.ok(paths.includes('/lastName'));
    assert.ok(paths.includes('/email'));

    const missing = await get('/customers', { method: 'POST' });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.errors[0].message, 'request body is required');

    const valid = await get('/customers', {
      method: 'POST',
      json: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }
    });
    assert.equal(valid.status, 201);
    assert.equal(valid.body.firstName, 'Ada');
    assert.match(valid.body.id, UUID);
  });

  test('status simulation uses the spec response when defined', async () => {
    const specDefined = await get(`/customers/${CUSTOMER_ID}?__status=404`);
    assert.equal(specDefined.status, 404);
    assert.ok('error' in specDefined.body || 'message' in specDefined.body);

    const generic = await get(`/customers/${CUSTOMER_ID}`, { headers: { prefer: 'code=503' } });
    assert.equal(generic.status, 503);
    assert.equal(generic.body.message, 'Simulated 503 response');

    const noContent = await get(`/customers/${CUSTOMER_ID}`, { headers: { 'x-mirage-status': '204' } });
    assert.equal(noContent.status, 204);
    assert.equal(noContent.body, null);

    // A forced status skips validation
    assert.equal((await get('/customers/not-a-uuid?__status=500')).status, 500);
  });

  test('latency simulation', async () => {
    const start = Date.now();
    const res = await get('/customers?__delay=300');
    assert.equal(res.status, 200);
    assert.ok(Date.now() - start >= 290, 'responds after the delay');
    assert.equal(res.headers.get('x-mirage-delay'), '300');
  });

  test('spec examples are opt-in', async () => {
    const generated = await get(`/customers/${CUSTOMER_ID}`);
    const example = await get(`/customers/${CUSTOMER_ID}?__example=true`);
    const viaPrefer = await get(`/customers/${CUSTOMER_ID}`, { headers: { prefer: 'example' } });
    assert.equal(example.body.email, 'john.doe@example.com');
    assert.deepEqual(viaPrefer.body, example.body);
    assert.notEqual(generated.body.email, 'john.doe@example.com');
  });

  test('unknown routes are 404 with the available routes', async () => {
    const res = await get('/nope');
    assert.equal(res.status, 404);
    assert.ok(res.body.availableRoutes.includes('GET /customers'));
  });

  test('sample requests generated for the app always pass validation', async () => {
    for (const route of ['POST /customers', 'POST /orders', 'GET /customers/{id}', 'GET /orders']) {
      for (let i = 0; i < 25; i++) {
        const sample = (await get(`/api/sample-request?route=${encodeURIComponent(route)}`)).body;
        const query = new URLSearchParams(sample.query).toString();
        const res = await get(`${sample.path}${query ? `?${query}` : ''}`, {
          method: route.split(' ')[0],
          ...(sample.body !== undefined && { json: sample.body })
        });
        assert.ok(res.status < 400, `${route} -> ${res.status} ${JSON.stringify(res.body)}`);
      }
    }
  });
});

describe('--no-validate', () => {
  test('accepts requests that do not match the spec', async () => {
    const ctx = await startServer(await parse(SAMPLE_SPEC), { validateRequests: false });
    try {
      assert.equal((await client(ctx.base)('/customers/not-a-uuid')).status, 200);
    } finally {
      await ctx.close();
    }
  });
});

describe('Swagger 2.0', () => {
  let ctx;
  let get;
  before(async () => {
    ctx = await startServer(await parse(SWAGGER2_SPEC));
    get = client(ctx.base);
  });
  after(() => ctx.close());

  test('responses are generated from 2.0 schemas', async () => {
    const res = await get('/pets?limit=3');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    for (const pet of res.body) {
      assert.equal(typeof pet.id, 'number');
      assert.equal(typeof pet.name, 'string');
    }
  });

  test('2.0 parameters and body parameters are validated', async () => {
    assert.equal((await get('/pets')).status, 400); // limit is required
    assert.equal((await get('/pets/abc')).status, 400); // petId is an integer
    assert.equal((await get('/pets/7')).status, 200);
    assert.equal((await get('/pets', { method: 'POST', json: { tag: 'dog' } })).status, 400);
  });

  test('2.0 response examples', async () => {
    const res = await get('/pets?__example=true', { method: 'POST', json: { name: 'Rex' } });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { id: 1, name: 'Rex', tag: 'dog' });
  });
});
