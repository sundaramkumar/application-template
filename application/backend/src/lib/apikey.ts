import { randomBytes, createHash } from 'node:crypto';

/* API key generation + hashing.
   Keys are high-entropy random strings, so we store a fast SHA-256 hash (hex) and
   look up by it directly — bcrypt would force a per-row scan. Format: app_<base62>. */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEY_PREFIX = 'app_';
const PREFIX_DISPLAY_LEN = 12;  // chars kept for display (incl. "app_")

function base62(bytes: Buffer): string {
  let out = '';
  for (const b of bytes) out += ALPHABET[b % 62];
  return out;
}

export function hashKey(presented: string): string {
  return createHash('sha256').update(presented).digest('hex');
}

/** Generate a new key. Returns the plaintext (shown once), its display prefix,
    and the hash to persist. */
export function generateKey(): { key: string; prefix: string; hash: string } {
  const key = KEY_PREFIX + base62(randomBytes(40));
  return { key, prefix: key.slice(0, PREFIX_DISPLAY_LEN), hash: hashKey(key) };
}
