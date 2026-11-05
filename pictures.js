import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOADS_DIR = fileURLToPath(new URL('./uploads/', import.meta.url));
export const UPLOADS_URL = '/uploads';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The type is read from the file's first bytes, because the name and the
// Content-Type sent by the client can both be false.
export function detectImageExtension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return '.png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return '.webp';
  }

  return null;
}

export async function savePicture(buffer, extension) {
  const filename = `${randomUUID()}${extension}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

// Best effort: the database change is already final when this runs, so a
// leftover file must not turn a successful request into an error.
export async function removePicture(filename) {
  try {
    await rm(path.join(UPLOADS_DIR, path.basename(filename)), { force: true });
  } catch (err) {
    console.error(`Could not remove picture ${filename}:`, err);
  }
}
