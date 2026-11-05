// Shared by the API and the Vue form, so both apply exactly the same rules.
// The API is the authority: the form only gives earlier feedback.

// Words of letters (any alphabet, with accents), joined by spaces, apostrophes, hyphens or dots.
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '’.-]+\p{L}[\p{L}\p{M}]*)*\.?$/u;
const NAME_ALLOWED_CHARACTER = /[\p{L}\p{M} '’.-]/u;
const PHONE_PATTERN = /^\d{9}$/;
const EMAIL_PATTERN = /^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

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

function findNameError(name) {
  if (!name) return 'Indica o nome.';
  if (/\d/.test(name)) return 'O nome não pode ter números.';

  const symbols = [...new Set(name)].filter((character) => !NAME_ALLOWED_CHARACTER.test(character));
  if (symbols.length > 0) return `O nome não pode ter estes símbolos: ${symbols.join(' ')}`;

  if (name.length <= 5) return `O nome tem de ter mais de 5 caracteres (tem ${name.length}).`;
  if (name.length > MAX_NAME_LENGTH) return `O nome não pode ter mais de ${MAX_NAME_LENGTH} caracteres.`;
  if (!NAME_PATTERN.test(name)) return 'O nome tem de começar por uma letra e os separadores têm de estar entre palavras.';
  return null;
}

function findContactError(contact) {
  if (!contact) return 'Indica o contacto.';
  if (PHONE_PATTERN.test(contact)) return null;
  if (/\D/.test(contact)) return 'O contacto tem de ter exatamente 9 dígitos, sem letras nem espaços.';
  return `O contacto tem de ter exatamente 9 dígitos (tem ${contact.length}).`;
}

function findEmailError(email) {
  if (!email) return 'Indica o email.';
  if (!email.includes('@')) return 'Email inválido: falta o @. Exemplo: nome@dominio.pt';
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return 'Email inválido. Exemplo: nome@dominio.pt';
  }
  return null;
}

export function validateContact(body = {}) {
  const values = {
    name: asText(body.name).trim().replace(/\s+/g, ' '),
    contact: asText(body.contact),
    email: asText(body.email).trim().toLowerCase()
  };

  const candidates = {
    name: findNameError(values.name),
    contact: findContactError(values.contact),
    email: findEmailError(values.email)
  };

  const errors = Object.fromEntries(Object.entries(candidates).filter(([, message]) => message));

  return { values, errors };
}

export function validatePictureFile(file) {
  if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) return PICTURE_MESSAGES.invalidType;
  if (file.size > MAX_PICTURE_BYTES) return PICTURE_MESSAGES.tooLarge;
  return null;
}
