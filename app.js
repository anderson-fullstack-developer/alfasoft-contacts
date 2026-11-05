import { fileURLToPath } from 'node:url';
import express from 'express';
import { rejectCrossSiteWrites } from './auth.js';
import authRouter from './controllers/auth.js';
import contactsRouter from './controllers/contacts.js';
import { UPLOADS_DIR, UPLOADS_URL } from './pictures.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

// Explicit list, so the Vue fallback never captures /contacts, /uploads or /cloudcmd.
const VUE_ROUTES = ['/', '/login', '/novo', '/ver/:id', '/editar/:id'];

const app = express();

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
};

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
});
app.use(express.json());
app.use(rejectCrossSiteWrites);

app.use('/auth', authRouter);
app.use('/contacts', contactsRouter);
app.use(UPLOADS_URL, express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR, { index: false }));

app.get(VUE_ROUTES, (req, res, next) => {
  res.sendFile('index.html', { root: PUBLIC_DIR }, (err) => {
    if (err) next();
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Recurso não encontrado.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Malformed requests (bad JSON, oversized body, invalid URL) are the client's error.
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: 'O pedido é inválido.' });
  }

  console.error(err);
  res.status(500).json({ message: 'Ocorreu um erro interno.' });
});

export default app;
