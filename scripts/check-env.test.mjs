import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEnvironment } from './check-env.mjs';
const valid = {
  DATABASE_URL: 'postgresql://user:private-password@db-pooler.example.neon.tech/movie?sslmode=require',
  DIRECT_URL: 'postgresql://user:private-password@db.example.neon.tech/movie?sslmode=require',
  AUTH_URL: 'https://movie.example.com', AUTH_SECRET: 'a'.repeat(40),
  AUTH_GOOGLE_ID: 'test-client', AUTH_GOOGLE_SECRET: 'private-google', OPENAI_API_KEY: 'private-key',
};
test('accepts a deployment configuration and local development URLs', () => {
  assert.deepEqual(checkEnvironment(valid), []);
  assert.deepEqual(checkEnvironment({ ...valid, AUTH_URL: 'http://localhost:3000' }), []);
});
test('reports missing settings and unsafe deployment configuration', () => {
  assert.equal(checkEnvironment({}).length, 7);
  for (const patch of [
    { AUTH_URL: 'http://movie.example.com' }, { AUTH_URL: 'https://movie.example.com/callback' },
    { AUTH_SECRET: 'short' }, { DIRECT_URL: valid.DATABASE_URL },
    { DATABASE_URL: valid.DATABASE_URL.replace('?sslmode=require', '') },
    { DATABASE_URL: 'not a URL' }, { NEXT_PUBLIC_OPENAI_API_KEY: 'private-key' },
  ]) assert.ok(checkEnvironment({ ...valid, ...patch }).length > 0);
});
test('never includes credential values in diagnostics', () => {
  const output = checkEnvironment({ ...valid, DATABASE_URL: 'private-password', AUTH_URL: 'private-google' }).join('\n');
  for (const value of ['private-password', 'private-google', 'private-key']) assert.ok(!output.includes(value));
});
