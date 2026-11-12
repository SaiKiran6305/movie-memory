import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smoke } from './smoke.mjs';
const origin = 'https://movie.example.com';
test('checks landing, protected redirects, and private unauthenticated APIs', async () => {
  const calls = [];
  const errors = await smoke(origin, async (url, options) => {
    calls.push([url.pathname, options]);
    if (url.pathname.startsWith('/api/')) return new Response('{}', {
      status: 401, headers: { 'cache-control': 'private, no-store' },
    });
    if (url.pathname !== '/') return new Response(null, { status: 307, headers: { location: '/' } });
    return new Response('Landing');
  });
  assert.deepEqual(errors, []);
  assert.equal(calls.length, 5);
  assert.equal(calls[3][1].method, 'POST');
  assert.equal(calls[4][1].method, 'PUT');
  for (const [, options] of calls) {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers, undefined);
  }
});
test('fails on unexpected success, public API caching, and wrong redirects', async () => {
  const errors = await smoke(origin, async () => new Response('unexpected'));
  assert.equal(errors.length, 6);
});
test('reports network failures without printing underlying errors', async () => {
  const errors = await smoke(origin, async () => { throw new Error('private detail'); });
  assert.equal(errors.length, 5);
  assert.ok(!errors.join('').includes('private detail'));
});
test('rejects credentials and paths in target URLs', async () => {
  for (const url of ['https://user:password@example.com', `${origin}/dashboard`, 'file:///tmp'])
    await assert.rejects(smoke(url));
});
