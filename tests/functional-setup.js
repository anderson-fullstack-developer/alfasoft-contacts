// Runs the API in plain Node, because the browser environment of the tests replaces Node globals such as URL.
import { loginCookie, startTestServer } from './helpers.js';

export default async function setup({ provide }) {
  const server = await startTestServer();

  provide('baseUrl', server.baseUrl);
  // A real signed session. The simulated browser would discard the Secure cookie over HTTP.
  provide('sessionCookie', await loginCookie(server.baseUrl));
  provide('database', {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  return () => server.stop();
}
