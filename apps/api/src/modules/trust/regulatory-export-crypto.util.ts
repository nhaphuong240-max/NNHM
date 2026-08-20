import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/** Derive 32-byte key from env secret (T7-S5 — NHNN regulatory export). */
export function deriveRegulatoryExportKey(secret: string): Buffer {
  return createHash('sha256').update(secret.trim()).digest();
}

export function isRegulatoryExportStub(stubFlag: string | undefined): boolean {
  return (stubFlag ?? 'true') !== 'false';
}

export type EncryptedExportPayload = {
  algorithm: 'AES-256-GCM';
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptRegulatoryPayload(
  plaintext: string,
  encryptionKey: string,
): EncryptedExportPayload {
  const key = deriveRegulatoryExportKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

export function decryptRegulatoryPayload(
  payload: EncryptedExportPayload,
  encryptionKey: string,
): string {
  const key = deriveRegulatoryExportKey(encryptionKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptionLabel(stub: boolean): string {
  return stub ? 'AES-256-GCM-dev-plaintext' : 'AES-256-GCM';
}
