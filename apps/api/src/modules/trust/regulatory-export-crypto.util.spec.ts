import { describe, expect, it } from '@jest/globals';
import {
  decryptRegulatoryPayload,
  encryptRegulatoryPayload,
  encryptionLabel,
  isRegulatoryExportStub,
} from './regulatory-export-crypto.util';

describe('regulatory-export-crypto.util', () => {
  const key = 'prod-regulatory-export-key-min-32-chars';

  it('encrypts and decrypts export payload', () => {
    const plain = 'section,count\naudit,10';
    const enc = encryptRegulatoryPayload(plain, key);
    expect(enc.algorithm).toBe('AES-256-GCM');
    expect(decryptRegulatoryPayload(enc, key)).toBe(plain);
  });

  it('labels live vs stub encryption', () => {
    expect(encryptionLabel(true)).toContain('dev');
    expect(encryptionLabel(false)).toBe('AES-256-GCM');
    expect(isRegulatoryExportStub('false')).toBe(false);
  });
});
