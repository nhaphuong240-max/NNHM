import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  TenantConfigVersionEntity,
  type TenantConfigDomain,
} from '../../database/entities/tenant-config-version.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import type { SsoProviderConfig } from '../identity/sso.util';
import type { GatewayRouteRule } from '../payment/payment-gateway-routing.util';
import { DEFAULT_GATEWAY_RULES } from '../payment/payment-gateway-routing.util';
import type { SettlementScheduleConfig } from '../commission/commission-settlement-scheduler.util';
import { DEFAULT_SETTLEMENT_SCHEDULE } from '../commission/commission-settlement-scheduler.util';
import type { TenantWebhookSubscription } from '../tenant-webhooks/tenant-webhook.util';
import { parseLiveRailsOverlay, type LiveRails } from './live-rails.util';

export type ConfigReadMode = 'v1' | 'v2' | 'dual';
export type ConfigWriteMode = 'v1' | 'v2' | 'dual';

@Injectable()
export class TenantConfigService {
  constructor(
    @InjectRepository(TenantConfigVersionEntity)
    private readonly versions: Repository<TenantConfigVersionEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  readMode(): ConfigReadMode {
    const mode = this.config.get<string>('CONFIG_PLATFORM_READ', 'dual');
    if (mode === 'v1' || mode === 'v2') return mode;
    return 'dual';
  }

  writeMode(): ConfigWriteMode {
    const mode = this.config.get<string>('CONFIG_PLATFORM_WRITE', 'dual');
    if (mode === 'v1' || mode === 'v2') return mode;
    return 'dual';
  }

  status() {
    return {
      module: 'tenant-config',
      readMode: this.readMode(),
      writeMode: this.writeMode(),
      domains: [
        'SSO_PROVIDER',
        'PAYMENT_GATEWAY',
        'WEBHOOK',
        'SETTLEMENT_SCHEDULE',
        'LIVE_RAILS',
      ],
    };
  }

  async getHistory(tenantId: string, domain?: TenantConfigDomain) {
    const where: Record<string, string> = { tenantId };
    if (domain) where.domain = domain;

    const rows = await this.versions.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        domain: row.domain,
        entityId: row.entityId,
        version: row.version,
        effectiveAt: row.effectiveAt.toISOString(),
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
      })),
      meta: { tenantId, count: rows.length, readMode: this.readMode() },
    };
  }

  async loadSsoProviders(tenantId: string): Promise<SsoProviderConfig[]> {
    const fromV2 = await this.loadLatestByDomain<SsoProviderConfig>(
      tenantId,
      'SSO_PROVIDER',
      'provider',
    );
    const readMode = this.readMode();

    if (readMode === 'v2') return fromV2;
    const fromV1 = await this.loadSsoProvidersFromAudit(tenantId);

    if (readMode === 'v1') return fromV1;
    return fromV2.length ? fromV2 : fromV1;
  }

  async saveSsoProvider(
    tenantId: string,
    provider: SsoProviderConfig,
    actorId?: string | null,
  ): Promise<void> {
    const writeMode = this.writeMode();

    if (writeMode === 'v1' || writeMode === 'dual') {
      await this.audit.append({
        tenantId,
        entityType: 'sso_provider',
        entityId: provider.id,
        action: 'UPSERT',
        payload: { provider },
        actorId: actorId ?? null,
      });
    }

    if (writeMode === 'v2' || writeMode === 'dual') {
      await this.appendVersion(tenantId, 'SSO_PROVIDER', provider.id, { provider }, actorId);
    }

    await this.audit.append({
      tenantId,
      entityType: 'tenant_config',
      entityId: provider.id,
      action: 'CONFIG_CHANGED',
      payload: { domain: 'SSO_PROVIDER', providerId: provider.id },
      actorId: actorId ?? null,
    });
  }

  async loadPaymentGatewayRules(tenantId: string): Promise<GatewayRouteRule[]> {
    const fromV2 = await this.loadSinglePayload<{ rules?: GatewayRouteRule[] }>(
      tenantId,
      'PAYMENT_GATEWAY',
      tenantId,
    );
    const readMode = this.readMode();
    const v2Rules = fromV2?.rules;

    if (readMode === 'v2') return v2Rules?.length ? v2Rules : DEFAULT_GATEWAY_RULES;

    const fromV1 = await this.loadPaymentRulesFromAudit(tenantId);
    if (readMode === 'v1') return fromV1;

    if (v2Rules?.length) return v2Rules;
    return fromV1;
  }

  async savePaymentGatewayRules(
    tenantId: string,
    rules: GatewayRouteRule[],
    actorId?: string | null,
  ): Promise<void> {
    const writeMode = this.writeMode();

    if (writeMode === 'v1' || writeMode === 'dual') {
      await this.audit.append({
        tenantId,
        entityType: 'payment_gateway_config',
        entityId: tenantId,
        action: 'UPDATE_RULES',
        payload: { rules },
        actorId: actorId ?? null,
      });
    }

    if (writeMode === 'v2' || writeMode === 'dual') {
      await this.appendVersion(tenantId, 'PAYMENT_GATEWAY', tenantId, { rules }, actorId);
    }

    await this.audit.append({
      tenantId,
      entityType: 'tenant_config',
      entityId: tenantId,
      action: 'CONFIG_CHANGED',
      payload: { domain: 'PAYMENT_GATEWAY', ruleCount: rules.length },
      actorId: actorId ?? null,
    });
  }

  async loadWebhookSubscriptions(tenantId: string): Promise<TenantWebhookSubscription[]> {
    const fromV2 = await this.loadSinglePayload<{ subscriptions?: TenantWebhookSubscription[] }>(
      tenantId,
      'WEBHOOK',
      tenantId,
    );
    const readMode = this.readMode();
    const v2Subs = fromV2?.subscriptions ?? [];

    if (readMode === 'v2') return v2Subs;
    const fromV1 = await this.loadWebhookSubscriptionsFromAudit(tenantId);
    if (readMode === 'v1') return fromV1;
    return v2Subs.length ? v2Subs : fromV1;
  }

  async saveWebhookSubscriptions(
    tenantId: string,
    subscriptions: TenantWebhookSubscription[],
    actorId?: string | null,
  ): Promise<void> {
    const writeMode = this.writeMode();

    if (writeMode === 'v1' || writeMode === 'dual') {
      await this.audit.append({
        tenantId,
        entityType: 'tenant_webhook_config',
        entityId: tenantId,
        action: 'UPDATE',
        payload: { subscriptions },
        actorId: actorId ?? null,
      });
    }

    if (writeMode === 'v2' || writeMode === 'dual') {
      await this.appendVersion(tenantId, 'WEBHOOK', tenantId, { subscriptions }, actorId);
    }

    await this.audit.append({
      tenantId,
      entityType: 'tenant_config',
      entityId: tenantId,
      action: 'CONFIG_CHANGED',
      payload: { domain: 'WEBHOOK', subscriptionCount: subscriptions.length },
      actorId: actorId ?? null,
    });
  }

  async loadSettlementSchedule(tenantId: string): Promise<SettlementScheduleConfig> {
    const fromV2 = await this.loadSinglePayload<{ config?: SettlementScheduleConfig }>(
      tenantId,
      'SETTLEMENT_SCHEDULE',
      tenantId,
    );
    const readMode = this.readMode();
    const v2Config = fromV2?.config;

    if (readMode === 'v2') return v2Config ?? { ...DEFAULT_SETTLEMENT_SCHEDULE };
    const fromV1 = await this.loadSettlementScheduleFromAudit(tenantId);
    if (readMode === 'v1') return fromV1;
    return v2Config ?? fromV1;
  }

  async saveSettlementSchedule(
    tenantId: string,
    scheduleConfig: SettlementScheduleConfig,
    actorId?: string | null,
    auditAction: 'UPDATE' | 'RUN' = 'UPDATE',
  ): Promise<void> {
    const writeMode = this.writeMode();

    if (writeMode === 'v1' || writeMode === 'dual') {
      await this.audit.append({
        tenantId,
        entityType: 'commission_settlement_schedule',
        entityId: tenantId,
        action: auditAction,
        payload: { config: scheduleConfig },
        actorId: actorId ?? null,
      });
    }

    if (writeMode === 'v2' || writeMode === 'dual') {
      await this.appendVersion(
        tenantId,
        'SETTLEMENT_SCHEDULE',
        tenantId,
        { config: scheduleConfig },
        actorId,
      );
    }

    await this.audit.append({
      tenantId,
      entityType: 'tenant_config',
      entityId: tenantId,
      action: 'CONFIG_CHANGED',
      payload: { domain: 'SETTLEMENT_SCHEDULE', auditAction },
      actorId: actorId ?? null,
    });
  }

  /** Backfill v2 tables from latest audit snapshots (T2-S1 migration) */
  async backfillFromAudit(tenantId: string, actorId?: string | null) {
    const providers = await this.loadSsoProvidersFromAudit(tenantId);
    for (const provider of providers) {
      await this.appendVersion(tenantId, 'SSO_PROVIDER', provider.id, { provider }, actorId, 1);
    }

    const rules = await this.loadPaymentRulesFromAudit(tenantId);
    if (rules.length) {
      await this.appendVersion(tenantId, 'PAYMENT_GATEWAY', tenantId, { rules }, actorId, 1);
    }

    const subscriptions = await this.loadWebhookSubscriptionsFromAudit(tenantId);
    if (subscriptions.length) {
      await this.appendVersion(
        tenantId,
        'WEBHOOK',
        tenantId,
        { subscriptions },
        actorId,
        1,
      );
    }

    const schedule = await this.loadSettlementScheduleFromAudit(tenantId);
    await this.appendVersion(
      tenantId,
      'SETTLEMENT_SCHEDULE',
      tenantId,
      { config: schedule },
      actorId,
      1,
    );

    return {
      data: {
        ssoProviders: providers.length,
        paymentRules: rules.length,
        webhooks: subscriptions.length,
        settlementSchedule: true,
      },
      meta: { tenantId, action: 'backfill' },
    };
  }

  async loadLiveRailsOverlay(tenantId: string): Promise<Partial<LiveRails>> {
    const row = await this.loadSinglePayload<Record<string, unknown>>(
      tenantId,
      'LIVE_RAILS',
      tenantId,
    );
    return parseLiveRailsOverlay(row);
  }

  async saveLiveRailsOverlay(
    tenantId: string,
    overlay: Partial<LiveRails>,
    actorId?: string | null,
  ): Promise<void> {
    const writeMode = this.writeMode();
    const payload = parseLiveRailsOverlay(overlay as Record<string, unknown>);

    if (writeMode === 'v1' || writeMode === 'dual') {
      await this.audit.append({
        tenantId,
        entityType: 'tenant_live_rails',
        entityId: tenantId,
        action: 'UPDATE',
        payload,
        actorId: actorId ?? null,
      });
    }

    if (writeMode === 'v2' || writeMode === 'dual') {
      await this.appendVersion(tenantId, 'LIVE_RAILS', tenantId, payload, actorId);
    }

    await this.audit.append({
      tenantId,
      entityType: 'tenant_config',
      entityId: tenantId,
      action: 'CONFIG_CHANGED',
      payload: { domain: 'LIVE_RAILS' },
      actorId: actorId ?? null,
    });
  }

  private async appendVersion(
    tenantId: string,
    domain: TenantConfigDomain,
    entityId: string,
    payload: Record<string, unknown>,
    actorId?: string | null,
    forceVersion?: number,
  ) {
    const latest = await this.versions.findOne({
      where: { tenantId, domain, entityId },
      order: { version: 'DESC' },
    });
    const version = forceVersion ?? (latest ? latest.version + 1 : 1);

    await this.versions.save({
      id: `tcv_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      domain,
      entityId,
      version,
      payload,
      effectiveAt: new Date(),
      createdBy: actorId ?? null,
    });
  }

  private async loadLatestByDomain<T>(
    tenantId: string,
    domain: TenantConfigDomain,
    payloadKey: string,
  ): Promise<T[]> {
    const rows = await this.versions.find({
      where: { tenantId, domain },
      order: { version: 'DESC', createdAt: 'DESC' },
    });

    const latestByEntity = new Map<string, T>();
    for (const row of rows) {
      if (latestByEntity.has(row.entityId)) continue;
      const value = row.payload[payloadKey];
      if (value) latestByEntity.set(row.entityId, value as T);
    }
    return [...latestByEntity.values()];
  }

  private async loadSinglePayload<T>(
    tenantId: string,
    domain: TenantConfigDomain,
    entityId: string,
  ): Promise<T | null> {
    const row = await this.versions.findOne({
      where: { tenantId, domain, entityId },
      order: { version: 'DESC' },
    });
    return (row?.payload ?? null) as T | null;
  }

  private async loadSsoProvidersFromAudit(tenantId: string): Promise<SsoProviderConfig[]> {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'sso_provider', action: 'UPSERT' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const seen = new Set<string>();
    const providers: SsoProviderConfig[] = [];
    for (const row of rows) {
      const provider = (row.payload as { provider?: SsoProviderConfig })?.provider;
      if (provider && !seen.has(provider.id)) {
        seen.add(provider.id);
        providers.push(provider);
      }
    }
    return providers;
  }

  private async loadPaymentRulesFromAudit(tenantId: string): Promise<GatewayRouteRule[]> {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'payment_gateway_config', action: 'UPDATE_RULES' },
      order: { createdAt: 'DESC' },
    });
    const payload = (row?.payload ?? {}) as { rules?: GatewayRouteRule[] };
    return payload.rules?.length ? payload.rules : DEFAULT_GATEWAY_RULES;
  }

  private async loadWebhookSubscriptionsFromAudit(
    tenantId: string,
  ): Promise<TenantWebhookSubscription[]> {
    const createRows = await this.auditEvents.find({
      where: { tenantId, entityType: 'tenant_webhook_subscription', action: 'CREATE' },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const configRow = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'tenant_webhook_config', action: 'UPDATE' },
      order: { createdAt: 'DESC' },
    });
    const configPayload = (configRow?.payload ?? {}) as {
      subscriptions?: TenantWebhookSubscription[];
    };
    const enabledMap = new Map(
      (configPayload.subscriptions ?? []).map((s) => [s.id, s.enabled] as const),
    );

    const subs = createRows
      .map((row) => (row.payload as { subscription?: TenantWebhookSubscription })?.subscription)
      .filter(Boolean) as TenantWebhookSubscription[];

    return subs.map((s) => ({
      ...s,
      enabled: enabledMap.has(s.id) ? enabledMap.get(s.id)! : s.enabled,
    }));
  }

  private async loadSettlementScheduleFromAudit(
    tenantId: string,
  ): Promise<SettlementScheduleConfig> {
    const row = await this.auditEvents.findOne({
      where: { tenantId, entityType: 'commission_settlement_schedule', action: 'UPDATE' },
      order: { createdAt: 'DESC' },
    });
    const payload = (row?.payload ?? {}) as { config?: SettlementScheduleConfig };
    return payload.config ?? { ...DEFAULT_SETTLEMENT_SCHEDULE };
  }

  static hashIp(ip?: string | null): string | null {
    if (!ip?.trim()) return null;
    return createHash('sha256').update(ip.trim()).digest('hex').slice(0, 32);
  }
}
