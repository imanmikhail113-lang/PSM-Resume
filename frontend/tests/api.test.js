import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, authRequest, WorkspaceError, API_BASE_URL } from '../src/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const config = { client_id: '', csrf_token: 'test-csrf', nonce: 'test-nonce' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('API uses the frontend origin and includes session cookies', async () => {
  assert.equal(API_BASE_URL, '');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/config');
    assert.equal(options.credentials, 'include');
    return json(config);
  };
  assert.deepEqual(await authRequest('config'), config);
});

test('successful config supplies CSRF on subsequent writes', async () => {
  globalThis.fetch = async () => json(config);
  await authRequest('config');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get('X-CSRF-Token'), 'test-csrf');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    return json({ ok: true });
  };
  await apiFetch('/api/analyze', { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }), body: '{}' });
});

test('configuration retries a temporary network failure', async () => {
  let calls = 0;
  globalThis.fetch = async () => { if (++calls < 3) throw new TypeError('network'); return json(config); };
  assert.deepEqual(await authRequest('config'), config);
  assert.equal(calls, 3);
});

test('Google sign-in is never automatically replayed', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('network'); };
  await assert.rejects(authRequest('google', { method: 'POST' }), error => error.code === 'connection');
  assert.equal(calls, 1);
});

test('missing auth deployment is distinguished from connectivity', async () => {
  globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404 });
  await assert.rejects(authRequest('config'), error => error instanceof WorkspaceError && error.code === 'deployment');
});

test('HTML fallback never surfaces JSON parsing errors to users', async () => {
  globalThis.fetch = async () => new Response('<html>SPA fallback</html>');
  await assert.rejects(authRequest('config'), error => error.code === 'response');
});

test('incompatible API responses cannot initialize Google sign-in', async () => {
  globalThis.fetch = async () => json({ client_id: 'client' });
  await assert.rejects(authRequest('config'), error => error.code === 'deployment');
});

test('an unauthenticated session stays a normal 401', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({ message: 'Not signed in.' }, 401); };
  await assert.rejects(authRequest('session'), error => error.status === 401);
  assert.equal(calls, 1);
});
