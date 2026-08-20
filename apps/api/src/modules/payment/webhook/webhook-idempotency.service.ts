import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { QueryFailedError, Repository } from 'typeorm';
import { PaymentWebhookEventEntity } from '../../../database/entities/payment-webhook-event.entity';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import type { PaymentWebhookResult } from './webhook.types';

const DEFAULT_TTL_SECONDS = 604800; // 7 days — BR-21 / ADR-004

export type WebhookClaim =
  | { kind: 'new'; record: PaymentWebhookEventEntity }
  | { kind: 'duplicate'; record: PaymentWebhookEventEntity };

@Injectable()
export class WebhookIdempotencyService {
  constructor(
    @InjectRepository(PaymentWebhookEventEntity)
    private readonly events: Repository<PaymentWebhookEventEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private redisKey(eventId: string): string {
    return `webhook:event:${eventId}`;
  }

  async claim(
    tenantId: string,
    eventId: string,
    payload: Record<string, unknown>,
    meta: {
      eventType: string;
      transactionId: string;
      paymentIntentId: string;
    },
  ): Promise<WebhookClaim> {
    const existing = await this.events.findOne({ where: { eventId } });
    if (existing) {
      return { kind: 'duplicate', record: existing };
    }

    const ttl = this.config.get<number>('WEBHOOK_IDEMPOTENCY_TTL_SECONDS', DEFAULT_TTL_SECONDS);
    await this.redis.set(this.redisKey(eventId), '1', 'EX', ttl, 'NX');

    try {
      const record = await this.events.save({
        eventId,
        tenantId,
        eventType: meta.eventType,
        transactionId: meta.transactionId,
        paymentIntentId: meta.paymentIntentId,
        status: 'PROCESSING',
        payload,
      });
      return { kind: 'new', record };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const replay = await this.events.findOne({ where: { eventId } });
        if (replay) return { kind: 'duplicate', record: replay };
      }
      throw error;
    }
  }

  async complete(record: PaymentWebhookEventEntity, result: PaymentWebhookResult): Promise<void> {
    record.status = 'PROCESSED';
    record.result = result as unknown as Record<string, unknown>;
    record.ledgerEntryId = result.ledgerEntryId ?? null;
    await this.events.save(record);
  }

  resultFromRecord(record: PaymentWebhookEventEntity): PaymentWebhookResult {
    if (record.result) {
      return {
        ...(record.result as unknown as PaymentWebhookResult),
        idempotentReplay: true,
      };
    }
    return {
      received: true,
      processed: record.status === 'PROCESSED',
      idempotentReplay: true,
      ledgerEntryId: record.ledgerEntryId ?? undefined,
      paymentIntentId: record.paymentIntentId,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error as { driverError?: { code?: string } }).driverError?.code === '23505';
  }
}
