import { describe, expect, test } from 'vitest';
import { httpsUrlFor } from './httpsRedirect.js';

const location = (href) => {
  const { protocol, hostname } = new URL(href);
  return { protocol, hostname, href };
};

describe('httpsUrlFor', () => {
  test('envia um endereço HTTP público para HTTPS, mantendo o caminho', () => {
    expect(httpsUrlFor(location('http://contactos.exemplo.pt/ver/7?a=1'))).toBe('https://contactos.exemplo.pt/ver/7?a=1');
  });

  test('não redireciona um endereço que já usa HTTPS', () => {
    expect(httpsUrlFor(location('https://contactos.exemplo.pt/'))).toBeNull();
  });

  test('não redireciona o desenvolvimento local', () => {
    expect(httpsUrlFor(location('http://localhost:3000/'))).toBeNull();
    expect(httpsUrlFor(location('http://127.0.0.1:3000/'))).toBeNull();
  });
});
