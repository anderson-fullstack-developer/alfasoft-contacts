// Must be the first import of the test helpers. These values are set before db.js loads
// .env, and dotenv never overrides existing variables, so the tests cannot reach a real database.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const TEST_DATABASE = 'contacts_test';

Object.assign(process.env, {
  DB_HOST: '127.0.0.1',
  DB_PORT: '3307',
  DB_NAME: TEST_DATABASE,
  DB_USER: 'contacts_test',
  DB_PASSWORD: 'contacts_test',
  UPLOADS_DIR: mkdtempSync(path.join(tmpdir(), 'contacts-test-uploads-'))
});
