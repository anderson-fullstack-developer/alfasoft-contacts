const PHONE_PATTERN = /^\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 254;

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
