import { createRouter, createWebHistory } from 'vue-router';
import ContactDetailsPage from './pages/ContactDetailsPage.vue';
import ContactFormPage from './pages/ContactFormPage.vue';
import ContactListPage from './pages/ContactListPage.vue';

// Paths must match VUE_ROUTES in app.js and must not start with /contacts, which belongs to the API.
const routes = [
  { path: '/', name: 'contacts', component: ContactListPage },
  { path: '/novo', name: 'new-contact', component: ContactFormPage },
  { path: '/ver/:id', name: 'contact-details', component: ContactDetailsPage },
  { path: '/editar/:id', name: 'edit-contact', component: ContactFormPage },
  { path: '/:pathMatch(.*)*', redirect: { name: 'contacts' } }
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});
