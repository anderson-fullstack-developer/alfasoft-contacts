import { request } from './client.js';

export const fetchSession = () => request('/auth/me');

export const postLogin = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

export const postLogout = () => request('/auth/logout', { method: 'POST' });
