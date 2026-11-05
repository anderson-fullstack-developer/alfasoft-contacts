import { Router } from 'express';
import multer from 'multer';
import {
  deleteContact,
  findAllContacts,
  findContactById,
  insertContact,
  updateContact
} from '../models/contacts.js';
import { UPLOADS_URL, detectImageExtension, removePicture, savePicture } from '../pictures.js';
import { MAX_PICTURE_BYTES, PICTURE_MESSAGES, validateContact } from '../validation/contact.js';

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

const sendNotFound = (res) => res.status(404).json({ message: 'Contacto não encontrado.' });

const hasErrors = (errors) => Object.keys(errors).length > 0;

const findContact = (id) => (VALID_ID.test(id) ? findContactById(id) : null);

function receivePicture(req, res, next) {
  parsePicture(req, res, (err) => {
    if (!err) return next();
    const picture = err.code === 'LIMIT_FILE_SIZE' ? PICTURE_MESSAGES.tooLarge : PICTURE_MESSAGES.invalidUpload;
    return res.status(400).json({ errors: { picture } });
  });
}

function checkContact(req, { pictureRequired }) {
  const { values, errors } = validateContact(req.body);
  const extension = req.file ? detectImageExtension(req.file.buffer) : null;

  if (req.file && !extension) {
    errors.picture = PICTURE_MESSAGES.invalidType;
  } else if (!req.file && pictureRequired) {
    errors.picture = PICTURE_MESSAGES.required;
  }

  return { values, errors, extension };
}

function sendDuplicateOrRethrow(err, res) {
  if (err.errno !== DUPLICATE_ENTRY) throw err;

  const errors = err.sqlMessage.includes('uq_contacts_contact')
    ? { contact: 'Já existe um contacto com este número.' }
    : { email: 'Já existe um contacto com este email.' };

  res.status(409).json({ errors });
}

router.get('/', asyncHandler(async (req, res) => {
  const contacts = await findAllContacts();
  res.json(contacts.map(toResponse));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const contact = await findContact(req.params.id);
  if (!contact) return sendNotFound(res);
  res.json(toResponse(contact));
}));

router.post('/', receivePicture, asyncHandler(async (req, res) => {
  const { values, errors, extension } = checkContact(req, { pictureRequired: true });
  if (hasErrors(errors)) return res.status(400).json({ errors });

  const picture = await savePicture(req.file.buffer, extension);

  try {
    const id = await insertContact({ ...values, picture });
    res.status(201).json(toResponse({ id, ...values, picture }));
  } catch (err) {
    await removePicture(picture);
    sendDuplicateOrRethrow(err, res);
  }
}));

router.put('/:id', receivePicture, asyncHandler(async (req, res) => {
  const current = await findContact(req.params.id);
  if (!current) return sendNotFound(res);

  const { values, errors, extension } = checkContact(req, { pictureRequired: false });
  if (hasErrors(errors)) return res.status(400).json({ errors });

  const newPicture = req.file ? await savePicture(req.file.buffer, extension) : null;
  const picture = newPicture ?? current.picture;

  try {
    await updateContact(current.id, { ...values, picture });
  } catch (err) {
    if (newPicture) await removePicture(newPicture);
    return sendDuplicateOrRethrow(err, res);
  }

  if (newPicture) await removePicture(current.picture);
  res.json(toResponse({ id: current.id, ...values, picture }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const current = await findContact(req.params.id);
  if (!current) return sendNotFound(res);

  await deleteContact(current.id);
  await removePicture(current.picture);
  res.status(204).end();
}));

export default router;
