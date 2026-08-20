import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import {
  WEBHOOK_MAX_ATTEMPTS,
  TenantWebhookRetryService,
  type WebhookRetryPayload,
} from './tenant-webhook-retry.service';
import {
  DEFAULT_WEBHOOK_EVENTS,
  deliverWebhookHttp,
  issueWebhookSecret,
  simulateDelivery,
  type TenantWebhookDelivery,
  type TenantWebhookEvent,
  type TenantWebhookSubscription,
} from './tenant-webhook.util';

@Injectable()
export class TenantWebhookService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly retry: TenantWebhookRetryService,
    private readonly tenantConfig: TenantConfigService,
  ) {}

  /** UC-NW-05 · SCR-DEV-013 */
  async listSubscriptions(tenantId: string) {
    const subscriptions = await this.loadSubscriptions(tenantId);
    const deliveries = await this.recentDeliveries(tenantId);

    return {
      data: { subscriptions, recentDeliveries: deliveries, availableEvents: DEFAULT_WEBHOOK_EVENTS },
      meta: { tenantId, count: subscriptions.length, uc: ['UC-NW-05'], screen: 'SCR-DEV-013' },
    };
  }

  async createSubscription(
    tenantId: string,
    input: {
      label: string;
      targetUrl: string;
      events?: TenantWebhookEvent[];
    },
    actorId?: string,
  ) {
    const id = `whk_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const secret = issueWebhookSecret(id);
    const subscription: TenantWebhookSubscription = {
      id,
      label: input.label.trim(),
      targetUrl: input.targetUrl.trim(),
      events: input.events?.length ? input.events : [...DEFAULT_WEBHOOK_EVENTS],
      enabled: true,
      secretPrefix: `${secret.slice(0, 14)}****`,
      createdAt: new Date().toISOString(),
    };

    await this.audit.append({
      tenantId,
      entityType: 'tenant_webhook_subscription',
      entityId: id,
      action: 'CREATE',
      payload: { subscription, secret },
      actorId: actorId ?? null,
    });

    const current = await this.tenantConfig.loadWebhookSubscriptions(tenantId);
    await this.tenantConfig.saveWebhookSubscriptions(
      tenantId,
      [subscription, ...current.filter((s) => s.id !== subscription.id)],
      actorId,
    );

    return {
      data: { subscription, secret },
      meta: { uc: ['UC-NW-05'], screen: 'SCR-DEV-013' },
    };
  }

  async simulateDelivery(
    tenantId: string,
    subscriptionId: string,
    input: { event?: TenantWebhookEvent; payload?: Record<string, unknown> },
    actorId?: string,
  ) {
    const subscriptions = await this.loadSubscriptions(tenantId);
    const subscription = subscriptions.find((s) => s.id === subscriptionId.trim());
    if (!subscription) {
      throw new NotFoundException({ detail: `Webhook subscription ${subscriptionId} not found` });
    }

    const event = input.event ?? 'booking.created';
    const delivery = simulateDelivery({
      subscription,
      event,
      payload: input.payload ?? { demo: true, tenantId },
    });

    await this.audit.append({
      tenantId,
      entityType: 'tenant_webhook_delivery',
      entityId: delivery.id,
      action: 'SIMULATE',
      payload: { subscriptionId, delivery, event },
      actorId: actorId ?? null,
    });

    return {
      data: delivery,
      meta: { uc: ['UC-NW-05'], screen: 'SCR-DEV-013', mode: 'simulate' },
    };
  }

  /** Phase 2 — dispatch domain event to all matching subscriptions */
  async emitEvent(
    tenantId: string,
    event: TenantWebhookEvent,
    payload: Record<string, unknown>,
  ) {
    const subscriptions = await this.loadSubscriptions(tenantId);
    const secrets = await this.loadSubscriptionSecrets(tenantId);
    const targets = subscriptions.filter((s) => s.enabled && s.events.includes(event));
    const deliveries: TenantWebhookDelivery[] = [];

    for (const subscription of targets) {
      const secret = secrets.get(subscription.id);
      const delivery = secret
        ? await deliverWebhookHttp({ subscription, event, payload, secret })
        : simulateDelivery({ subscription, event, payload });

      deliveries.push(delivery);
      await this.audit.append({
        tenantId,
        entityType: 'tenant_webhook_delivery',
        entityId: delivery.id,
        action: secret ? 'DELIVER' : 'SIMULATE',
        payload: { subscriptionId: subscription.id, delivery, event },
        actorId: null,
      });

      if (secret && delivery.status === 'FAILED' && delivery.attempt < WEBHOOK_MAX_ATTEMPTS) {
        const queued = await this.retry.enqueue({
          tenantId,
          subscriptionId: subscription.id,
          deliveryId: delivery.id,
          event,
          payload,
          secret,
          attempt: delivery.attempt,
        });
        delivery.nextRetryAt = queued.nextRetryAt;
      }
    }

    return {
      data: { event, delivered: deliveries.filter((d) => d.status === 'DELIVERED').length, deliveries },
      meta: { uc: ['UC-NW-05'], mode: 'event-dispatch' },
    };
  }

  /** Retry a failed delivery (called by retry job) */
  async retryDelivery(input: WebhookRetryPayload): Promise<TenantWebhookDelivery> {
    const subscriptions = await this.loadSubscriptions(input.tenantId);
    const subscription = subscriptions.find((s) => s.id === input.subscriptionId);
    if (!subscription) {
      return {
        id: input.deliveryId,
        subscriptionId: input.subscriptionId,
        event: input.event,
        status: 'FAILED',
        attempt: input.attempt + 1,
        mode: 'live',
        deliveredAt: new Date().toISOString(),
        error: 'Subscription not found',
      };
    }

    const delivery = await deliverWebhookHttp({
      subscription,
      event: input.event,
      payload: input.payload,
      secret: input.secret,
      attempt: input.attempt + 1,
    });

    await this.audit.append({
      tenantId: input.tenantId,
      entityType: 'tenant_webhook_delivery',
      entityId: delivery.id,
      action: delivery.status === 'DELIVERED' ? 'DELIVER' : 'RETRY_FAILED',
      payload: {
        subscriptionId: input.subscriptionId,
        delivery,
        event: input.event,
        retryAttempt: delivery.attempt,
      },
      actorId: null,
    });

    return delivery;
  }

  async toggleSubscription(
    tenantId: string,
    subscriptionId: string,
    enabled: boolean,
    actorId?: string,
  ) {
    const subscriptions = await this.loadSubscriptions(tenantId);
    const idx = subscriptions.findIndex((s) => s.id === subscriptionId.trim());
    if (idx < 0) {
      throw new NotFoundException({ detail: `Webhook subscription ${subscriptionId} not found` });
    }

    subscriptions[idx] = { ...subscriptions[idx]!, enabled };

    await this.tenantConfig.saveWebhookSubscriptions(tenantId, subscriptions, actorId);

    return this.listSubscriptions(tenantId);
  }

  private async loadSubscriptions(tenantId: string): Promise<TenantWebhookSubscription[]> {
    return this.tenantConfig.loadWebhookSubscriptions(tenantId);
  }

  private async recentDeliveries(tenantId: string): Promise<TenantWebhookDelivery[]> {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'tenant_webhook_delivery' },
      order: { createdAt: 'DESC' },
      take: 15,
    });

    return rows
      .map((row) => {
        const payload = row.payload as { delivery?: TenantWebhookDelivery };
        const delivery = payload.delivery;
        if (!delivery) return null;
        return {
          ...delivery,
          mode:
            delivery.mode ??
            (row.action === 'DELIVER' || row.action === 'RETRY_FAILED'
              ? 'live'
              : row.action === 'SIMULATE'
                ? 'simulate'
                : undefined),
        };
      })
      .filter(Boolean) as TenantWebhookDelivery[];
  }

  private async loadSubscriptionSecrets(tenantId: string): Promise<Map<string, string>> {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'tenant_webhook_subscription', action: 'CREATE' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      const payload = row.payload as { subscription?: TenantWebhookSubscription; secret?: string };
      if (payload.subscription?.id && payload.secret) {
        map.set(payload.subscription.id, payload.secret);
      }
    }
    return map;
  }
}
