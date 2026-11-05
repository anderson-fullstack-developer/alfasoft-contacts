const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Searches only the contacts already loaded, so the API stays unchanged.
export function filterContacts(contacts, query) {
  const term = normalize(query.trim());
  if (!term) return contacts;
  return contacts.filter(({ name, contact, email }) =>
    [name, contact, email].some((value) => normalize(value).includes(term))
  );
}
