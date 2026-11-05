// Shared by the API and the Vue form, so both apply exactly the same rules.
// The API is the authority: the form only gives earlier feedback.

const PHONE_PATTERN = /^\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 254;

export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PICTURE_MESSAGES = {
  required: 'A fotografia é obrigatória.',
  tooLarge: 'A fotografia não pode ter mais de 5 MB.',
  invalidType: 'A fotografia tem de ser JPEG, PNG ou WebP.',
  invalidUpload: 'O envio da fotografia é inválido.'
};

const asText = (value) => (typeof value === 'string' ? value : '');

export function validateContact(body = {}) {
  const values = {
    name: asText(body.name).trim(),
    contact: asText(body.contact),
    email: asText(body.email).trim().toLowerCase()
  };

  const errors = {};

  if (values.name.length <= 5) {
    errors.name = 'O nome tem de ter mais de 5 caracteres.';
  } else if (values.name.length > MAX_NAME_LENGTH) {
    errors.name = `O nome não pode ter mais de ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!PHONE_PATTERN.test(values.contact)) {
    errors.contact = 'O contacto tem de ter exatamente 9 dígitos.';
  }

  if (values.email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Indica um endereço de email válido.';
  }

  return { values, errors };
}

export function validatePictureFile(file) {
  if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) return PICTURE_MESSAGES.invalidType;
  if (file.size > MAX_PICTURE_BYTES) return PICTURE_MESSAGES.tooLarge;
  return null;
}
