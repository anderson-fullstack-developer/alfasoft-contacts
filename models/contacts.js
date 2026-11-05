import db from '../db.js';

const COLUMNS = 'id, name, contact, email, picture';

export async function findAllContacts() {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM contacts ORDER BY id DESC`);
  return rows;
}

export async function findContactById(id) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM contacts WHERE id = ?`, [id]);
  return rows[0] ?? null;
}

export async function insertContact({ name, contact, email, picture }) {
  const [result] = await db.execute(
    'INSERT INTO contacts (name, contact, email, picture) VALUES (?, ?, ?, ?)',
    [name, contact, email, picture]
  );
  return result.insertId;
}

export async function updateContact(id, { name, contact, email, picture }) {
  await db.execute(
    'UPDATE contacts SET name = ?, contact = ?, email = ?, picture = ? WHERE id = ?',
    [name, contact, email, picture, id]
  );
}

export async function deleteContact(id) {
  await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
}
