import { computed, ref } from 'vue';
import { fetchSession, postLogin, postLogout } from '../api/auth.js';

// Module-level state: the header, the router guard and the pages share one session.
const username = ref(null);
const isAuthenticated = computed(() => username.value !== null);

let sessionCheck = null;

// Runs once per page load. If the check fails, the user is treated as signed out.
function ensureSession() {
  sessionCheck ??= fetchSession()
    .then((session) => {
      username.value = session.username;
    })
    .catch(() => {
      username.value = null;
    });
  return sessionCheck;
}

async function login(name, password) {
  const session = await postLogin(name, password);
  username.value = session.username;
}

function clearSession() {
  username.value = null;
}

async function logout() {
  await postLogout();
  clearSession();
}

export function useAuth() {
  return { username, isAuthenticated, ensureSession, login, logout, clearSession };
}
