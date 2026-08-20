import { createHmac, timingSafeEqual } from 'crypto';

export function signWebhookPayload(payload: Record<string, unknown>, secret: string): string {
  const body = canonicalWebhookBody(payload);
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(
  payload: Record<string, unknown>,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature?.trim()) return false;
  const expected = signWebhookPayload(payload, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Stable JSON for HMAC — excludes signature field */
export function canonicalWebhookBody(payload: Record<string, unknown>): string {
  const { signature: _sig, ...rest } = payload;
  return JSON.stringify(rest, Object.keys(rest).sort());
}
