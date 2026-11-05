import { request } from './client.js';

const CONTACTS_URL = '/contacts';

export const listContacts = () => request(CONTACTS_URL);

export const getContact = (id) => request(`${CONTACTS_URL}/${encodeURIComponent(id)}`);

export const createContact = (formData) =>
  request(CONTACTS_URL, { method: 'POST', body: formData });

export const updateContact = (id, formData) =>
  request(`${CONTACTS_URL}/${encodeURIComponent(id)}`, { method: 'PUT', body: formData });

export const deleteContact = (id) =>
  request(`${CONTACTS_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
