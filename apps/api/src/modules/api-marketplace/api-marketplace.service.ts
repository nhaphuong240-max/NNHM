import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ApiPartnerEntity } from '../../database/entities/api-partner.entity';
import { ApiPartnerKeyEntity } from '../../database/entities/api-partner-key.entity';
import { ApiWebhookDeliveryEntity } from '../../database/entities/api-webhook-delivery.entity';
import { AuditService } from '../audit/audit.service';
import {
  DEMO_API_PARTNERS,
  type ApiPartnerRecord,
  type ApiWebhookDelivery,
  issuePartnerKey,
} from './api-marketplace.types';

@Injectable()
export class ApiMarketplaceService {
  constructor(
    @InjectRepository(ApiPartnerEntity)
    private readonly partners: Repository<ApiPartnerEntity>,
    @InjectRepository(ApiPartnerKeyEntity)
    private readonly keys: Repository<ApiPartnerKeyEntity>,
    @InjectRepository(ApiWebhookDeliveryEntity)
    private readonly deliveries: Repository<ApiWebhookDeliveryEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-NW-04 · SCR-ADMIN-004 */
  async listPartners(tenantId: string, category?: ApiPartnerRecord['category']) {
    await this.ensureSeedPartners(tenantId);
    const qb = this.partners
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .orderBy('p.created_at', 'DESC');
    if (category) qb.andWhere('p.category = :category', { category });
    const rows = await qb.getMany();
    const recentDeliveries = await this.recentDeliveries(tenantId);

    return {
      data: {
        partners: rows.map((p) => this.mapPartner(p)),
        recentDeliveries,
      },
      meta: {
        tenantId,
        partnerCount: rows.length,
        uc: ['UC-NW-04', 'T5-S3'],
        screen: 'SCR-ADMIN-004',
      },
    };
  }

  async registerPartner(
    tenantId: string,
    input: {
      name: string;
      category: ApiPartnerRecord['category'];
      webhookUrl?: string;
    },
    actorId?: string,
  ) {
    const id = `ptn_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const apiKey = issuePartnerKey(id);
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    await this.partners.save({
      id,
      tenantId,
      name: input.name.trim(),
      category: input.category,
      status: 'REGISTER',
      webhookUrl: input.webhookUrl?.trim() || null,
      rateLimitPerMin: 60,
      eventsConsumed: 0,
    });

    await this.keys.save({
      id: `pk_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      partnerId: id,
      keyHash: apiKeyHash,
      keyPrefix: `${apiKey.slice(0, 12)}****`,
      revokedAt: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'api_partner',
      entityId: id,
      action: 'REGISTER',
      payload: { name: input.name, category: input.category },
      actorId: actorId ?? null,
    });

    const partner = await this.partners.findOneOrFail({ where: { id } });
    return {
      data: { partner: this.mapPartner(partner), apiKey },
      meta: { uc: ['UC-NW-04', 'T5-S3'], screen: 'SCR-ADMIN-004', status: 'REGISTER' },
    };
  }

  async approvePartner(tenantId: string, partnerId: string, actorId?: string) {
    const partner = await this.partners.findOne({ where: { id: partnerId, tenantId } });
    if (!partner) throw new NotFoundException({ detail: `Partner ${partnerId} not found` });
    partner.status = 'SANDBOX';
    await this.partners.save(partner);
    await this.audit.append({
      tenantId,
      entityType: 'api_partner',
      entityId: partnerId,
      action: 'APPROVE',
      payload: { status: 'SANDBOX' },
      actorId: actorId ?? null,
    });
    return { data: this.mapPartner(partner), meta: { uc: ['T5-S3'], status: 'SANDBOX' } };
  }

  async activatePartner(tenantId: string, partnerId: string, actorId?: string) {
    const partner = await this.partners.findOne({ where: { id: partnerId, tenantId } });
    if (!partner) throw new NotFoundException({ detail: `Partner ${partnerId} not found` });
    partner.status = 'ACTIVE';
    await this.partners.save(partner);
    await this.audit.append({
      tenantId,
      entityType: 'api_partner',
      entityId: partnerId,
      action: 'ACTIVATE',
      payload: { status: 'ACTIVE' },
      actorId: actorId ?? null,
    });
    return { data: this.mapPartner(partner), meta: { uc: ['T5-S3'], status: 'ACTIVE' } };
  }

  async simulateWebhook(
    tenantId: string,
    partnerId: string,
    input: { event?: string },
    actorId?: string,
  ) {
    const partner = await this.partners.findOne({ where: { id: partnerId, tenantId } });
    if (!partner) throw new NotFoundException({ detail: `Partner ${partnerId} not found` });

    const deliveryId = `wh_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const status = partner.status === 'ACTIVE' || partner.status === 'SANDBOX' ? 'DELIVERED' : 'FAILED';
    const saved = await this.deliveries.save({
      id: deliveryId,
      tenantId,
      partnerId,
      event: input.event?.trim() || 'booking.deposited',
      status,
      responseCode: status === 'DELIVERED' ? 200 : 403,
      deliveredAt: new Date(),
      payload: { simulated: true },
    });

    partner.eventsConsumed += 1;
    await this.partners.save(partner);

    await this.audit.append({
      tenantId,
      entityType: 'api_webhook_delivery',
      entityId: deliveryId,
      action: 'SIMULATE',
      payload: { deliveryId: saved.id, event: saved.event, status: saved.status },
      actorId: actorId ?? null,
    });

    return {
      data: this.mapDelivery(saved),
      meta: { uc: ['UC-NW-04', 'T5-S4'], screen: 'SCR-ADMIN-004', mode: 'webhook-stub' },
    };
  }

  async recordDelivery(input: {
    tenantId: string;
    partnerId: string;
    event: string;
    status: ApiWebhookDelivery['status'];
    responseCode?: number;
    payload?: Record<string, unknown>;
  }) {
    const id = `wh_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const saved = await this.deliveries.save({
      id,
      tenantId: input.tenantId,
      partnerId: input.partnerId,
      event: input.event,
      status: input.status,
      responseCode: input.responseCode ?? 200,
      deliveredAt: new Date(),
      payload: input.payload ?? null,
    });
    await this.partners.increment({ id: input.partnerId }, 'eventsConsumed', 1);
    return saved;
  }

  async validateApiKey(tenantId: string, apiKey: string) {
    const hash = createHash('sha256').update(apiKey.trim()).digest('hex');
    const keyRow = await this.keys.findOne({
      where: { tenantId, keyHash: hash },
    });
    if (!keyRow || keyRow.revokedAt) throw new UnauthorizedException({ detail: 'Invalid partner API key' });

    const partner = await this.partners.findOne({ where: { id: keyRow.partnerId, tenantId } });
    if (!partner || partner.status === 'SUSPENDED') {
      throw new UnauthorizedException({ detail: 'Partner suspended or not found' });
    }

    return {
      partnerId: partner.id,
      partner: this.mapPartner(partner),
      rateLimitPerMin: partner.rateLimitPerMin,
    };
  }

  async findPartnerByCategory(tenantId: string, category: ApiPartnerRecord['category']) {
    return this.partners.findOne({ where: { tenantId, category, status: 'ACTIVE' } });
  }

  private async ensureSeedPartners(tenantId: string) {
    const seeds: Array<{ name: string; category: ApiPartnerRecord['category']; status: ApiPartnerEntity['status'] }> = [
      { name: 'Vietcombank Sandbox', category: 'BANK', status: 'ACTIVE' },
      { name: 'MISA ERP Connector', category: 'ERP', status: 'SANDBOX' },
      { name: 'VN Notary Hub', category: 'NOTARY', status: 'SANDBOX' },
    ];
    for (const seed of seeds) {
      const existing = await this.partners.findOne({ where: { tenantId, category: seed.category } });
      if (existing) continue;
      const id = `ptn_${seed.category.toLowerCase()}_${randomUUID().replace(/-/g, '').slice(0, 6)}`;
      await this.partners.save({
        id,
        tenantId,
        name: seed.name,
        category: seed.category,
        status: seed.status,
        webhookUrl: `https://sandbox.${seed.category.toLowerCase()}.example/wereal/webhook`,
        rateLimitPerMin: 120,
        eventsConsumed: 0,
      });
    }
  }

  private async recentDeliveries(tenantId: string): Promise<ApiWebhookDelivery[]> {
    const rows = await this.deliveries.find({
      where: { tenantId },
      order: { deliveredAt: 'DESC' },
      take: 10,
    });
    return rows.map((r) => this.mapDelivery(r));
  }

  private mapPartner(row: ApiPartnerEntity): ApiPartnerRecord {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      status: row.status === 'REGISTER' ? 'PENDING' : row.status === 'SANDBOX' ? 'ACTIVE' : row.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
      webhookUrl: row.webhookUrl ?? undefined,
      apiKeyPrefix: `${row.id.slice(0, 8)}****`,
      rateLimitPerMin: row.rateLimitPerMin,
      eventsConsumed: row.eventsConsumed,
      lastDeliveryAt: row.updatedAt?.toISOString(),
    };
  }

  private mapDelivery(row: ApiWebhookDeliveryEntity): ApiWebhookDelivery {
    return {
      id: row.id,
      partnerId: row.partnerId,
      event: row.event,
      status: row.status,
      deliveredAt: row.deliveredAt.toISOString(),
      responseCode: row.responseCode ?? undefined,
    };
  }
}
