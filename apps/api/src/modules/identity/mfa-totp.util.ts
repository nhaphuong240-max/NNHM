import { createHmac } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(input: string): Buffer {
  const normalized = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

/** RFC 6238 TOTP — UC-ID-03 staging MFA (no 123456 when MFA_SANDBOX=false) */
export function generateTotp(secret: string, stepSec = 30, atMs = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / stepSec);
  return hotp(secret, counter);
}

export function verifyTotp(secret: string, token: string, window = 1, atMs = Date.now()): boolean {
  const normalized = token.replace(/\D/g, '').padStart(6, '0');
  if (normalized.length !== 6) return false;
  const stepSec = 30;
  const counter = Math.floor(atMs / 1000 / stepSec);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === normalized) return true;
  }
  return false;
}
