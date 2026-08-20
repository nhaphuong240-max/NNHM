import { createHmac } from 'crypto';

/** Mirror `apps/api` webhook-signature.util — keep keys sorted for HMAC. */
export function signWebhookPayload(payload: Record<string, unknown>, secret: string): string {
  const { signature: _sig, ...rest } = payload;
  const body = JSON.stringify(rest, Object.keys(rest).sort());
  return createHmac('sha256', secret).update(body).digest('hex');
}
