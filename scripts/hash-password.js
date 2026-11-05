import { hashPassword } from '../auth.js';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

console.log(await hashPassword(password));
