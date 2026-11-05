import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { TEST_PASSWORD, TEST_USERNAME, loginCookie, postLogin, startTestServer } from './helpers.js';

const MAX_FAILED_LOGINS = 10;

let server;
let baseUrl;
let cookie;

const createWithHeaders = (headers) =>
  fetch(`${baseUrl}/contacts`, { method: 'POST', headers: { cookie, ...headers }, body: new FormData() });

before(async () => {
  server = await startTestServer();
  baseUrl = server.baseUrl;
  cookie = await loginCookie(baseUrl);
});

after(() => server.stop());

describe('pedidos de outros sites (CSRF)', () => {
  for (const site of ['cross-site', 'same-site']) {
    test(`recusa Sec-Fetch-Site: ${site}`, async () => {
      assert.equal((await createWithHeaders({ 'Sec-Fetch-Site': site })).status, 403);
    });
  }

  test('recusa login a partir de um subdomínio vizinho', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-site' },
      body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD })
    });
    assert.equal(response.status, 403);
  });

  test('sem Sec-Fetch-Site, recusa uma origem diferente', async () => {
    const response = await createWithHeaders({ Origin: 'https://outro.recruitment.alfasoft.pt' });
    assert.equal(response.status, 403);
  });

  test('sem Sec-Fetch-Site, recusa uma origem malformada', async () => {
    assert.equal((await createWithHeaders({ Origin: 'null' })).status, 403);
  });

  test('aceita pedidos da própria origem', async () => {
    assert.equal((await createWithHeaders({ 'Sec-Fetch-Site': 'same-origin' })).status, 400);
    assert.equal((await createWithHeaders({ Origin: baseUrl })).status, 400);
  });

  test('aceita clientes sem navegador, como a REST Client', async () => {
    assert.equal((await createWithHeaders({})).status, 400);
  });

  test('um pedido de leitura de outro site continua a funcionar', async () => {
    const response = await fetch(`${baseUrl}/contacts`, { headers: { 'Sec-Fetch-Site': 'cross-site' } });
    assert.equal(response.status, 200);
  });
});

describe('limite de tentativas de login', () => {
  test('um login certo não conta para o limite', async () => {
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS + 2; attempt += 1) {
      assert.equal((await postLogin(baseUrl, TEST_USERNAME, TEST_PASSWORD)).status, 200);
    }
  });

  test('bloqueia com 429 depois de demasiadas tentativas falhadas', async () => {
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      assert.equal((await postLogin(baseUrl, TEST_USERNAME, 'errada')).status, 401);
    }

    const blocked = await postLogin(baseUrl, TEST_USERNAME, 'errada');
    assert.equal(blocked.status, 429);
    assert.ok((await blocked.json()).message);
    assert.ok(blocked.headers.get('ratelimit-reset') ?? blocked.headers.get('ratelimit'));
  });

  test('durante o bloqueio, nem a password certa passa', async () => {
    assert.equal((await postLogin(baseUrl, TEST_USERNAME, TEST_PASSWORD)).status, 429);
  });

  test('a sessão já iniciada continua a funcionar', async () => {
    const response = await fetch(`${baseUrl}/contacts/999999999`, { headers: { cookie } });
    assert.equal(response.status, 404);
  });
});
