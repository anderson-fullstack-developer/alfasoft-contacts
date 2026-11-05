const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

// The session cookie is Secure, so outside local development the application only works over HTTPS.
export function httpsUrlFor({ protocol, hostname, href }) {
  if (protocol !== 'http:' || LOCAL_HOSTS.has(hostname)) return null;
  return href.replace(/^http:/, 'https:');
}
