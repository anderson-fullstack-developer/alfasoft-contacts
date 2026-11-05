import { TEST_DATABASE } from './test-env.js';
import app from '../app.js';
import { hashPassword } from '../auth.js';
import db from '../db.js';

export const TEST_USERNAME = 'test-admin';
export const TEST_PASSWORD = 'test-password';

async function assertTestDatabase() {
  const [[{ name }]] = await db.query('SELECT DATABASE() AS name');
  if (name !== TEST_DATABASE) throw new Error(`Refusing to run tests against database "${name}".`);
}

export async function startTestServer() {
  await assertTestDatabase();

  process.env.ADMIN_USERNAME = TEST_USERNAME;
  process.env.ADMIN_PASSWORD_HASH = await hashPassword(TEST_PASSWORD);
  process.env.SESSION_SECRET = 'test-session-secret';

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await db.end();
    }
  };
}

export const postLogin = (baseUrl, username, password) =>
  fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

export async function loginCookie(baseUrl) {
  const response = await postLogin(baseUrl, TEST_USERNAME, TEST_PASSWORD);
  return response.headers.get('set-cookie').split(';')[0];
}
