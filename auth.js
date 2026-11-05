import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'contacts_session';
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

export async function checkCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return false;

  const passwordMatches = await verifyPassword(password, requireEnv('ADMIN_PASSWORD_HASH'));
  return passwordMatches && username === requireEnv('ADMIN_USERNAME');
}

const sign = (payload) =>
  createHmac('sha256', requireEnv('SESSION_SECRET')).update(payload).digest('base64url');

// The session is a signed token held in the cookie, so the server keeps no session state.
export function createSessionToken(username) {
  const payload = Buffer.from(
    JSON.stringify({ username, expiresAt: Date.now() + SESSION_MAX_AGE_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const { username, expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return expiresAt > Date.now() ? username : null;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const cookies = req.headers.cookie?.split(';') ?? [];
  const prefix = `${name}=`;
  const match = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return match?.slice(prefix.length);
}

export function getSessionUsername(req) {
  const token = readCookie(req, SESSION_COOKIE);
  return token ? readSessionToken(token) : null;
}

export function requireAuth(req, res, next) {
  if (getSessionUsername(req)) return next();
  res.status(401).json({ message: 'Inicia sessão para continuar.' });
}
