import { Router } from 'express';
import { asyncHandler } from '../async-handler.js';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  checkCredentials,
  createSessionToken,
  getSessionUsername
} from '../auth.js';

// SameSite=Lax stops other sites from sending this cookie on POST, PUT and DELETE requests.
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
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
