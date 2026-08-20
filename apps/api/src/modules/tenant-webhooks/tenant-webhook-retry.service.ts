import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import {
  computeRetryDelayMs,
  deliverWebhookHttp,
  type TenantWebhookDelivery,
  type TenantWebhookEvent,
  type TenantWebhookSubscription,
} from './tenant-webhook.util';

export const WEBHOOK_RETRY_QUEUE = 'webhook:retry:queue';
export const WEBHOOK_RETRY_PREFIX = 'webhook:retry:';
export const WEBHOOK_MAX_ATTEMPTS = 3;

export type WebhookRetryPayload = {
  tenantId: string;
  subscriptionId: string;
  deliveryId: string;
  event: TenantWebhookEvent;
  payload: Record<string, unknown>;
  secret: string;
  attempt: number;
};

@Injectable()
export class TenantWebhookRetryService {
  private readonly logger = new Logger(TenantWebhookRetryService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async enqueue(input: WebhookRetryPayload) {
    const nextRetryAt = Date.now() + computeRetryDelayMs(input.attempt);
    const key = `${WEBHOOK_RETRY_PREFIX}${input.deliveryId}`;
    await this.redis.set(key, JSON.stringify({ ...input, nextRetryAt }));
    await this.redis.zadd(WEBHOOK_RETRY_QUEUE, nextRetryAt, input.deliveryId);
    this.logger.log(
      `Webhook retry queued ${input.deliveryId} attempt=${input.attempt} at=${new Date(nextRetryAt).toISOString()}`,
    );
    return { deliveryId: input.deliveryId, nextRetryAt: new Date(nextRetryAt).toISOString() };
  }

  async processDue(
    deliver: (input: WebhookRetryPayload) => Promise<TenantWebhookDelivery>,
  ): Promise<TenantWebhookDelivery[]> {
    const now = Date.now();
    const dueIds = await this.redis.zrangebyscore(WEBHOOK_RETRY_QUEUE, 0, now, 'LIMIT', 0, 20);
    const results: TenantWebhookDelivery[] = [];

    for (const deliveryId of dueIds) {
      await this.redis.zrem(WEBHOOK_RETRY_QUEUE, deliveryId);
      const raw = await this.redis.get(`${WEBHOOK_RETRY_PREFIX}${deliveryId}`);
      if (!raw) continue;

      const payload = JSON.parse(raw) as WebhookRetryPayload;
      const delivery = await deliver({ ...payload, attempt: payload.attempt + 1 });
      results.push(delivery);

      if (delivery.status === 'FAILED' && delivery.attempt < WEBHOOK_MAX_ATTEMPTS) {
        await this.enqueue({
          ...payload,
          attempt: delivery.attempt,
        });
      } else {
        await this.redis.del(`${WEBHOOK_RETRY_PREFIX}${deliveryId}`);
      }
    }

    return results;
  }
}
