import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './composables/useAuth.js';
import ContactDetailsPage from './pages/ContactDetailsPage.vue';
import ContactFormPage from './pages/ContactFormPage.vue';
import ContactListPage from './pages/ContactListPage.vue';
import LoginPage from './pages/LoginPage.vue';

// Paths must match VUE_ROUTES in app.js and must not start with /contacts or /auth, which belong to the API.
const routes = [
  { path: '/', name: 'contacts', component: ContactListPage },
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/novo', name: 'new-contact', component: ContactFormPage, meta: { requiresAuth: true } },
  { path: '/ver/:id', name: 'contact-details', component: ContactDetailsPage, meta: { requiresAuth: true } },
  { path: '/editar/:id', name: 'edit-contact', component: ContactFormPage, meta: { requiresAuth: true } },
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

export default router;
