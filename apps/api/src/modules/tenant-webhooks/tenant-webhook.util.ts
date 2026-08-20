import { createHmac, randomUUID } from 'crypto';

export type TenantWebhookEvent =
  | 'booking.created'
  | 'booking.deposited'
  | 'payment.success'
  | 'contract.signed';

export type TenantWebhookSubscription = {
  id: string;
  label: string;
  targetUrl: string;
  events: TenantWebhookEvent[];
  enabled: boolean;
  secretPrefix: string;
  createdAt: string;
};

export type TenantWebhookDelivery = {
  id: string;
  subscriptionId: string;
  event: TenantWebhookEvent;
  status: 'DELIVERED' | 'FAILED' | 'SKIPPED';
  attempt: number;
  mode?: 'live' | 'simulate';
  responseCode?: number;
  deliveredAt: string;
  nextRetryAt?: string;
  error?: string;
};

export const DEFAULT_WEBHOOK_EVENTS: TenantWebhookEvent[] = [
  'booking.created',
  'booking.deposited',
  'payment.success',
  'contract.signed',
];

export function issueWebhookSecret(subscriptionId: string): string {
  return `whsec_${subscriptionId}_${Math.random().toString(36).slice(2, 10)}`;
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function computeRetryDelayMs(attempt: number): number {
  return 30_000 * 4 ** (attempt - 1);
}

export function simulateDelivery(input: {
  subscription: TenantWebhookSubscription;
  event: TenantWebhookEvent;
  payload: Record<string, unknown>;
}): TenantWebhookDelivery {
  const invalidUrl = !input.subscription.targetUrl.startsWith('https://');
  return {
    id: `whd_${Date.now()}`,
    subscriptionId: input.subscription.id,
    event: input.event,
    status: invalidUrl ? 'FAILED' : 'DELIVERED',
    attempt: 1,
    mode: 'simulate',
    responseCode: invalidUrl ? 0 : 200,
    deliveredAt: new Date().toISOString(),
    error: invalidUrl ? 'Pilot requires https:// target URL' : undefined,
  };
}

/** UC-NW-05 Phase 2 — HTTP delivery with HMAC signature */
export async function deliverWebhookHttp(input: {
  subscription: TenantWebhookSubscription;
  event: TenantWebhookEvent;
  payload: Record<string, unknown>;
  secret: string;
  attempt?: number;
}): Promise<TenantWebhookDelivery> {
  const id = `whd_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const deliveredAt = new Date().toISOString();
  const attempt = input.attempt ?? 1;

  if (!input.subscription.enabled) {
    return {
      id,
      subscriptionId: input.subscription.id,
      event: input.event,
      status: 'SKIPPED',
      attempt,
      deliveredAt,
      error: 'Subscription disabled',
    };
  }

  if (!input.subscription.targetUrl.startsWith('https://')) {
    return {
      id,
      subscriptionId: input.subscription.id,
      event: input.event,
      status: 'FAILED',
      attempt,
      responseCode: 0,
      deliveredAt,
      error: 'Target URL must use https://',
    };
  }

  const body = JSON.stringify({
    id,
    event: input.event,
    createdAt: deliveredAt,
    data: input.payload,
  });
  const signature = signWebhookPayload(input.secret, body);

  try {
    const res = await fetch(input.subscription.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wereal-Event': input.event,
        'X-Wereal-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        id,
        subscriptionId: input.subscription.id,
        event: input.event,
        status: 'FAILED',
        attempt,
        responseCode: res.status,
        deliveredAt,
        error: `HTTP ${res.status}`,
      };
    }

    return {
      id,
      subscriptionId: input.subscription.id,
      event: input.event,
      status: 'DELIVERED',
      attempt,
      mode: 'live',
      responseCode: res.status,
      deliveredAt,
    };
  } catch (err) {
    return {
      id,
      subscriptionId: input.subscription.id,
      event: input.event,
      status: 'FAILED',
      attempt,
      mode: 'live',
      responseCode: 0,
      deliveredAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
