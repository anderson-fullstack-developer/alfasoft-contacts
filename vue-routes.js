// Shared by Express and Vue Router, so a page opened directly always reaches the Vue application.
// A path must not start with /contacts or /auth, which belong to the API.
export const VUE_PATHS = {
  contacts: '/',
  login: '/login',
  newContact: '/novo',
  contactDetails: '/ver/:id',
  editContact: '/editar/:id'
};
