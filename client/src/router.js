import { createRouter, createWebHistory } from 'vue-router';
import { VUE_PATHS } from '../../vue-routes.js';
import { setUnauthorizedHandler } from './api/client.js';
import { useAuth } from './composables/useAuth.js';
import { useNotification } from './composables/useNotification.js';
import ContactDetailsPage from './pages/ContactDetailsPage.vue';
import ContactFormPage from './pages/ContactFormPage.vue';
import ContactListPage from './pages/ContactListPage.vue';
import LoginPage from './pages/LoginPage.vue';

const routes = [
  { path: VUE_PATHS.contacts, name: 'contacts', component: ContactListPage },
  { path: VUE_PATHS.login, name: 'login', component: LoginPage },
  { path: VUE_PATHS.newContact, name: 'new-contact', component: ContactFormPage, meta: { requiresAuth: true } },
  { path: VUE_PATHS.contactDetails, name: 'contact-details', component: ContactDetailsPage, meta: { requiresAuth: true } },
  { path: VUE_PATHS.editContact, name: 'edit-contact', component: ContactFormPage, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'contacts' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

// This guard only improves navigation; the API is what actually enforces access.
router.beforeEach(async (to) => {
  const { ensureSession, isAuthenticated } = useAuth();
  await ensureSession();

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && isAuthenticated.value) {
    return { name: 'contacts' };
  }
});

// A signed-in user who receives a 401 has an expired session. A failed login is not
// affected, because nobody is signed in at that point.
setUnauthorizedHandler(() => {
  const { clearSession, isAuthenticated } = useAuth();
  if (!isAuthenticated.value) return;

  clearSession();
  useNotification().notify('A sessão expirou. Inicia sessão novamente.');
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
});

export default router;
