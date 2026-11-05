import { fileURLToPath } from 'node:url';
import express from 'express';
import contactsRouter from './controllers/contacts.js';
import { UPLOADS_DIR, UPLOADS_URL } from './pictures.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

// Explicit list, so the Vue fallback never captures /contacts, /uploads or /cloudcmd.
const VUE_ROUTES = ['/', '/novo', '/ver/:id', '/editar/:id'];

const app = express();

app.disable('x-powered-by');
app.use(express.json());

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

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'O corpo do pedido é inválido.' });
  }

  console.error(err);
  res.status(500).json({ message: 'Ocorreu um erro interno.' });
});

export default app;
