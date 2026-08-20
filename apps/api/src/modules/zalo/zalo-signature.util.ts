import { createHash, timingSafeEqual } from 'crypto';

/** Zalo OA webhook signature — appId + data + timestamp + OA secret (SHA256). */
export function verifyZaloWebhookSignature(
  appId: string,
  data: string,
  timestamp: string,
  signature: string | undefined,
  oaSecret: string,
): boolean {
  if (!signature?.trim()) return false;
  const raw = `${appId}${data}${timestamp}${oaSecret}`;
  const expected = createHash('sha256').update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
