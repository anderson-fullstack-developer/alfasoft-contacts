import { beforeEach, describe, expect, test, vi } from 'vitest';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Each test loads fresh modules, because the session state lives at module level.
async function loadApp({ signedIn }) {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async (path) => {
    if (path === '/auth/me') return jsonResponse(200, { username: signedIn ? 'admin' : null });
    return jsonResponse(401, { message: 'Inicia sessão para continuar.' });
  }));

  const { default: router } = await import('./router.js');
  const { useAuth } = await import('./composables/useAuth.js');
  const { useNotification } = await import('./composables/useNotification.js');
  const { getContact } = await import('./api/contacts.js');
  return { router, auth: useAuth(), notification: useNotification().notification, getContact };
}

beforeEach(() => {
  window.happyDOM.setURL('http://localhost:3000/');
});

describe('sessão expirada', () => {
  test('termina a sessão, avisa e leva ao login, guardando a página atual', async () => {
    const { router, auth, notification, getContact } = await loadApp({ signedIn: true });
    await router.push('/editar/7');
    expect(auth.isAuthenticated.value).toBe(true);

    await expect(getContact(7)).rejects.toThrow('Inicia sessão');

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'));
    expect(router.currentRoute.value.query.redirect).toBe('/editar/7');
    expect(auth.isAuthenticated.value).toBe(false);
    expect(notification.value).toContain('sessão expirou');
  });

  test('uma password errada mostra só o erro, sem avisar nem navegar', async () => {
    const { router, auth, notification } = await loadApp({ signedIn: false });
    await router.push('/login');

    await expect(auth.login('admin', 'errada')).rejects.toThrow();

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBeUndefined();
    expect(notification.value).toBe('');
  });
});
