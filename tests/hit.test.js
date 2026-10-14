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
  process.env.VERCEL_ENV = 'production';
  try {
    await run();
  } finally {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.VERCEL_ENV;
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

test('a preview deployment counts into its own key', async () => {
  await withEnv(async () => {
    process.env.VERCEL_ENV = 'preview';
    const urls = [];
    globalThis.fetch = async (url) => { urls.push(url); return { ok: true, json: async () => ({ result: 7 }) }; };
    const { default: handler } = await import('../api/hit.js?preview=1');
    const res = fakeResponse();
    await handler(request(), res);
    assert.equal(urls[0], 'https://redis.example/incr/hk-tolls:views:preview');
    assert.deepEqual(res.body, { views: 7 });

    // local runs (no VERCEL_ENV) are previews too
    delete process.env.VERCEL_ENV;
    urls.length = 0;
    await handler(request(), fakeResponse());
    assert.equal(urls[0], 'https://redis.example/incr/hk-tolls:views:preview');
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
