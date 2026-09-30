// Safe URL fetching, request validator edge cases and data generation
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { fetchSpecText, isBlockedAddress, normalizeSpecUrl } = require('../src/safe-fetch');
const { validateRequest } = require('../src/request-validator');
const DataGenerator = require('../src/generator');

describe('safe-fetch', () => {
  test('blocks private, loopback, link-local and mapped addresses', () => {
    for (const address of ['127.0.0.1', '10.0.0.5', '172.16.3.4', '192.168.1.1', '169.254.169.254',
      '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
      assert.equal(isBlockedAddress(address), true, address);
    }
    for (const address of ['8.8.8.8', '1.1.1.1', '::ffff:8.8.8.8', '2606:4700::1']) {
      assert.equal(isBlockedAddress(address), false, address);
    }
  });

  test('refuses to fetch internal URLs, in any notation', async () => {
    const server = http.createServer((req, res) => res.end('secret'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    try {
      for (const url of [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`, `http://127.1:${port}/`,
        `http://2130706433:${port}/`, `http://[::ffff:127.0.0.1]:${port}/`, 'http://169.254.169.254/latest/']) {
        await assert.rejects(fetchSpecText(url), /private or reserved/, url);
      }
      await assert.rejects(fetchSpecText('file:///etc/passwd'), /Only http and https/);
      await assert.rejects(fetchSpecText('not a url'), /valid URL/);
    } finally {
      server.close();
    }
  });

  test('rewrites GitHub blob links to raw files', () => {
    assert.equal(normalizeSpecUrl('https://github.com/o/r/blob/main/api/openapi.yaml').href,
      'https://raw.githubusercontent.com/o/r/main/api/openapi.yaml');
  });
});

describe('request validator', () => {
  test('OpenAPI 3.0 boolean exclusiveMinimum', () => {
    const route = { parameters: [{ name: 'n', in: 'query', required: true, schema: { type: 'number', minimum: 0, exclusiveMinimum: true } }] };
    assert.equal(validateRequest(route, { query: { n: '0' } }).length, 1);
    assert.deepEqual(validateRequest(route, { query: { n: '0.5' } }), []);
  });

  test('readOnly properties are not required in requests; circular schemas work', () => {
    const node = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
    node.properties.child = node;
    const route = {
      requestBody: {
        required: true,
        schema: { type: 'object', required: ['id', 'tree'], properties: { id: { type: 'string', readOnly: true }, tree: node } }
      }
    };
    assert.deepEqual(validateRequest(route, { body: { tree: { name: 'a', child: { name: 'b' } } } }), []);
    // The repeated (circular) schema accepts anything, so only tree.name is checked
    assert.deepEqual(validateRequest(route, { body: { tree: { child: {} } } }).map(e => e.path), ['/tree/name']);
  });

  test('float multipleOf does not produce false errors', () => {
    const route = { requestBody: { schema: { type: 'number', multipleOf: 0.01 } } };
    for (const value of [1280.36, 9262.3, 0.07, 3599.43]) {
      assert.deepEqual(validateRequest(route, { body: value }), [], String(value));
    }
  });
});

describe('data generator', () => {
  const generator = new DataGenerator();

  test('field names give realistic values within constraints', () => {
    for (let i = 0; i < 50; i++) {
      const value = generator.generateFromSchema({ type: 'string', maxLength: 3 }, 0, 'city');
      assert.ok(value.length >= 1 && value.length <= 3, value);
      const long = generator.generateFromSchema({ type: 'string', minLength: 80 });
      assert.ok(long.length >= 80, `minLength 80 -> ${long.length}`);
    }
    assert.match(generator.generateFromSchema({ type: 'string' }, 0, 'customerId'), /^[0-9a-f-]{36}$/);
  });

  test('generated strings always satisfy their pattern', () => {
    const pattern = '^[+]?[1-9]\\d{1,14}$';
    for (let i = 0; i < 200; i++) {
      assert.match(generator.generateFromSchema({ type: 'string', pattern }, 0, 'phone'), new RegExp(pattern));
    }
  });

  test('examples mode prefers schema examples', () => {
    const schema = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string', example: 'Ada' } }
    };
    const value = generator.generateFromExamples(schema);
    assert.equal(value.name, 'Ada');
    assert.equal(typeof value.id, 'string');
  });
});
