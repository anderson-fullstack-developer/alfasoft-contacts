import db from '../db.js';

const COLUMNS = 'id, name, contact, email, picture';

async function inTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// The row stays locked until the transaction ends, so simultaneous requests
// cannot lose track of which picture file is the current one.
async function lockCurrentPicture(connection, id) {
  const [rows] = await connection.execute('SELECT picture FROM contacts WHERE id = ? FOR UPDATE', [id]);
  return rows[0]?.picture ?? null;
}

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

// Without a new picture, the current one is kept. Returns null if the contact no longer exists.
export function updateContact(id, { name, contact, email, newPicture }) {
  return inTransaction(async (connection) => {
    const previousPicture = await lockCurrentPicture(connection, id);
    if (!previousPicture) return null;

    const picture = newPicture ?? previousPicture;
    await connection.execute(
      'UPDATE contacts SET name = ?, contact = ?, email = ?, picture = ? WHERE id = ?',
      [name, contact, email, picture, id]
    );
    return { picture, previousPicture };
  });
}

// Returns the picture of the deleted contact, or null if the contact no longer exists.
export function deleteContact(id) {
  return inTransaction(async (connection) => {
    const picture = await lockCurrentPicture(connection, id);
    if (picture) await connection.execute('DELETE FROM contacts WHERE id = ?', [id]);
    return picture;
  });
}
