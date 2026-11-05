import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { TEST_PASSWORD, TEST_USERNAME, loginCookie, postLogin, startTestServer } from './helpers.js';

let server;
let baseUrl;

const statusOf = async (path, options) => (await fetch(`${baseUrl}${path}`, options)).status;

before(async () => {
  server = await startTestServer();
  baseUrl = server.baseUrl;
});

after(() => server.stop());

describe('acesso sem sessão', () => {
  test('a lista é pública', async () => {
    assert.equal(await statusOf('/contacts'), 200);
  });

  for (const [method, path] of [
    ['GET', '/contacts/1'],
    ['POST', '/contacts'],
    ['PUT', '/contacts/1'],
    ['DELETE', '/contacts/1']
  ]) {
    test(`${method} ${path} devolve 401`, async () => {
      assert.equal(await statusOf(path, { method }), 401);
    });
  }
});

describe('login', () => {
  test('recusa password errada', async () => {
    const response = await postLogin(baseUrl, TEST_USERNAME, 'errada');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
  });

  test('recusa utilizador errado', async () => {
    assert.equal((await postLogin(baseUrl, 'outro', TEST_PASSWORD)).status, 401);
  });

  test('recusa pedido sem credenciais', async () => {
    assert.equal((await postLogin(baseUrl)).status, 401);
  });

  test('cria um cookie HttpOnly, Secure e SameSite', async () => {
    const response = await postLogin(baseUrl, TEST_USERNAME, TEST_PASSWORD);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
  });

  test('com sessão, os detalhes deixam de devolver 401', async () => {
    const cookie = await loginCookie(baseUrl);
    assert.equal(await statusOf('/contacts/999999999', { headers: { cookie } }), 404);
  });

  test('/auth/me indica o utilizador com e sem sessão', async () => {
    const cookie = await loginCookie(baseUrl);
    const withSession = await (await fetch(`${baseUrl}/auth/me`, { headers: { cookie } })).json();
    const withoutSession = await (await fetch(`${baseUrl}/auth/me`)).json();
    assert.equal(withSession.username, TEST_USERNAME);
    assert.equal(withoutSession.username, null);
  });

  test('recusa um cookie adulterado', async () => {
    const cookie = await loginCookie(baseUrl);
    const [name, value] = cookie.split('=');
    const [, signature] = value.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ username: TEST_USERNAME, expiresAt: Date.now() + 1e9 })
    ).toString('base64url');
    const headers = { cookie: `${name}=${forgedPayload}.${signature}` };
    assert.equal(await statusOf('/contacts/1', { headers }), 401);
  });

  test('o logout limpa o cookie', async () => {
    const response = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /contacts_session=;/);
  });
});
