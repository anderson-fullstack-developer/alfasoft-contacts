import { Router } from 'express';
import multer from 'multer';
import db from '../db.js';
import {
  MAX_PICTURE_BYTES,
  UPLOADS_URL,
  detectImageExtension,
  removePicture,
  savePicture
} from '../pictures.js';
import { validateContact } from '../validation/contact.js';

const DUPLICATE_ENTRY = 1062;
const VALID_ID = /^[1-9]\d*$/;

const router = Router();

const parsePicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PICTURE_BYTES, files: 1 }
}).single('picture');

// Express 4 does not catch errors from async handlers on its own.
const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);

const toResponse = (row) => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  email: row.email,
  picture: `${UPLOADS_URL}/${row.picture}`
});

const notFound = (res) => res.status(404).json({ message: 'Contacto não encontrado.' });

function receivePicture(req, res, next) {
  parsePicture(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'A fotografia não pode ter mais de 5 MB.'
          : 'O envio da fotografia é inválido.';
      return res.status(400).json({ errors: { picture: message } });
    }
    return next(err);
  });
}

async function findById(id) {
  if (!VALID_ID.test(id)) return null;
  const [rows] = await db.execute(
    'SELECT id, name, contact, email, picture FROM contacts WHERE id = ?',
    [id]
  );
  return rows[0] ?? null;
}

function checkContact(req, { pictureRequired }) {
  const { values, errors } = validateContact(req.body);
  const extension = req.file ? detectImageExtension(req.file.buffer) : null;

  if (req.file && !extension) {
    errors.picture = 'A fotografia tem de ser JPEG, PNG ou WebP.';
  } else if (!req.file && pictureRequired) {
    errors.picture = 'A fotografia é obrigatória.';
  }

  return { values, errors, extension };
}

const hasErrors = (errors) => Object.keys(errors).length > 0;

function duplicateErrors(err) {
  if (err.errno !== DUPLICATE_ENTRY) return null;
  return err.sqlMessage.includes('uq_contacts_contact')
    ? { contact: 'Já existe um contacto com este número.' }
    : { email: 'Já existe um contacto com este email.' };
}

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, name, contact, email, picture FROM contacts ORDER BY id DESC'
  );
  res.json(rows.map(toResponse));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const contact = await findById(req.params.id);
  if (!contact) return notFound(res);
  res.json(toResponse(contact));
}));

router.post('/', receivePicture, asyncHandler(async (req, res) => {
  const { values, errors, extension } = checkContact(req, { pictureRequired: true });
  if (hasErrors(errors)) return res.status(400).json({ errors });

  const picture = await savePicture(req.file.buffer, extension);

  try {
    const [result] = await db.execute(
      'INSERT INTO contacts (name, contact, email, picture) VALUES (?, ?, ?, ?)',
      [values.name, values.contact, values.email, picture]
    );
    res.status(201).json(toResponse({ id: result.insertId, ...values, picture }));
  } catch (err) {
    await removePicture(picture);
    const duplicate = duplicateErrors(err);
    if (duplicate) return res.status(409).json({ errors: duplicate });
    throw err;
  }
}));

router.put('/:id', receivePicture, asyncHandler(async (req, res) => {
  const current = await findById(req.params.id);
  if (!current) return notFound(res);

  const { values, errors, extension } = checkContact(req, { pictureRequired: false });
  if (hasErrors(errors)) return res.status(400).json({ errors });

  const newPicture = req.file ? await savePicture(req.file.buffer, extension) : null;
  const picture = newPicture ?? current.picture;

  try {
    await db.execute(
      'UPDATE contacts SET name = ?, contact = ?, email = ?, picture = ? WHERE id = ?',
      [values.name, values.contact, values.email, picture, current.id]
    );
  } catch (err) {
    if (newPicture) await removePicture(newPicture);
    const duplicate = duplicateErrors(err);
    if (duplicate) return res.status(409).json({ errors: duplicate });
    throw err;
  }

  if (newPicture) await removePicture(current.picture);
  res.json(toResponse({ id: current.id, ...values, picture }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const current = await findById(req.params.id);
  if (!current) return notFound(res);

  await db.execute('DELETE FROM contacts WHERE id = ?', [current.id]);
  await removePicture(current.picture);
  res.status(204).end();
}));

export default router;
