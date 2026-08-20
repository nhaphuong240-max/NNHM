import { createHmac, timingSafeEqual } from 'crypto';

export function verifyMetaWebhookSignature(
  payload: Record<string, unknown>,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature?.startsWith('sha256=')) return false;
  const body = JSON.stringify(payload);
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const received = signature.slice(7);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
