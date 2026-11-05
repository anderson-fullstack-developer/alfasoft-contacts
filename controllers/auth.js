import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../async-handler.js';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  checkCredentials,
  createSessionToken,
  getSessionUsername
} from '../auth.js';

// SameSite=Lax blocks unrelated sites; rejectCrossSiteWrites also covers neighbouring subdomains.
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;

// Each attempt runs scrypt, which is deliberately expensive, so this also limits CPU abuse.
const limitFailedLogins = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: MAX_FAILED_LOGINS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    console.warn(`Login rate limit reached for ${req.ip}`);
    res.status(429).json({ message: 'Demasiadas tentativas falhadas. Tenta novamente daqui a 15 minutos.' });
  }
});

const router = Router();

router.post('/login', limitFailedLogins, asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!(await checkCredentials(username, password))) {
    return res.status(401).json({ message: 'Utilizador ou palavra-passe incorretos.' });
  }

  res.cookie(SESSION_COOKIE, createSessionToken(username), {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE_MS
  });
  res.json({ username });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  res.status(204).end();
});

router.get('/me', (req, res) => {
  res.json({ username: getSessionUsername(req) });
});

export default router;
