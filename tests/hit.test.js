// tests/hit.test.js
// Drives api/hit.js with a stubbed Redis REST endpoint, the same pattern the
// traffic proxy test uses: stub fetch, fake response, dynamic import.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const fakeResponse = () => ({
  statusCode: null,
  headers: {},
  body: null,
  status(code) { this.statusCode = code; return this; },
  setHeader(name, value) { this.headers[name] = value; },
  json(body) { this.body = body; return this; },
});

const withEnv = async (run) => {
  process.env.KV_REST_API_URL = 'https://redis.example';
  process.env.KV_REST_API_TOKEN = 'secret';
  try {
    await run();
  } finally {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  }
};

const request = (extra = {}) => ({ method: 'POST', headers: { 'user-agent': 'Mozilla/5.0' }, ...extra });

test('a normal visit increments the counter and answers the new total', async () => {
  await withEnv(async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ result: 42 }) };
    };
    const { default: handler } = await import('../api/hit.js?normal=1');
    const res = fakeResponse();
    await handler(request(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { views: 42 });
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://redis.example/incr/hk-tolls:views');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer secret');
    delete globalThis.fetch;
  });
});

test('a bot never touches the counter', async () => {
  await withEnv(async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; };
    const { default: handler } = await import('../api/hit.js?bot=1');
    const res = fakeResponse();
    await handler(request({ headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { views: null });
    assert.equal(called, false, 'no Redis call for a crawler');
    delete globalThis.fetch;
  });
});

test('only POST is answered', async () => {
  const { default: handler } = await import('../api/hit.js?method=1');
  const res = fakeResponse();
  await handler(request({ method: 'GET' }), res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'method not allowed' });
  assert.equal(res.headers.Allow, 'POST');
});

test('no Redis environment means no counter — quietly', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const { default: handler } = await import('../api/hit.js?noenv=1');
  const res = fakeResponse();
  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { views: null });
  assert.equal(called, false);
  delete globalThis.fetch;
});

test('a Redis failure is a quiet null, never a broken page', async () => {
  await withEnv(async () => {
    globalThis.fetch = async () => { throw new Error('redis down'); };
    const { default: handler } = await import('../api/hit.js?down=1');
    const res = fakeResponse();
    await handler(request(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { views: null });
    delete globalThis.fetch;
  });
});
