export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function request(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new ApiError('Não foi possível contactar o servidor. Verifica a ligação e tenta novamente.');
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (response.ok) return body;

  throw new ApiError(body?.message ?? 'Ocorreu um erro. Tenta novamente.', {
    status: response.status,
    fieldErrors: body?.errors
  });
}
