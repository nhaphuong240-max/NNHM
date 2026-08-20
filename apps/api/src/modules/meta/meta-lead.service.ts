import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { computeSlaMs, parseMetaCreatedTime } from '../portal/omnichannel-latency.util';
import { parseMetaFieldData } from './meta-lead.parser';
import { MetaGraphClient } from './meta-graph.client';
import { verifyMetaWebhookSignature } from './meta-signature.util';
import type { MetaLeadChannelMeta, MetaWebhookPayload } from './meta.types';

@Injectable()
export class MetaLeadService {
  private readonly logger = new Logger(MetaLeadService.name);

  constructor(
    @InjectRepository(MetaLeadEventEntity)
    private readonly events: Repository<MetaLeadEventEntity>,
    @InjectRepository(MetaPageBindingEntity)
    private readonly pages: Repository<MetaPageBindingEntity>,
    private readonly crm: CrmService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly graph: MetaGraphClient,
  ) {}

  status() {
    return {
      module: 'meta-lead-ads',
      uc: 'UC-NW-02',
      tc: 'TC-21',
      rules: ['BR-05'],
      graphMode: this.graph.isLiveMode() ? 'LIVE' : 'SANDBOX',
    };
  }

  async connectPage(
    tenantId: string,
    input: { pageId: string; pageName: string; pageAccessToken: string },
    actorId?: string,
  ) {
    const pageId = input.pageId.trim();
    const existing = await this.pages.findOne({ where: { pageId } });
    const id = existing?.id ?? `mpb_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const binding = await this.pages.save({
      id,
      tenantId,
      pageId,
      pageName: input.pageName.trim() || pageId,
      pageAccessToken: input.pageAccessToken.trim(),
      isActive: true,
    });

    await this.audit.append({
      tenantId,
      entityType: 'meta_page_binding',
      entityId: binding.id,
      action: 'CONNECT',
      payload: { pageId, pageName: binding.pageName, hasToken: Boolean(binding.pageAccessToken) },
      actorId: actorId ?? null,
    });

    return {
      data: {
        id: binding.id,
        pageId: binding.pageId,
        pageName: binding.pageName,
        isActive: binding.isActive,
        hasToken: Boolean(binding.pageAccessToken),
      },
      meta: { uc: ['UC-NW-02'], mode: 'page-connect' },
    };
  }

  verifySubscription(mode: string | undefined, token: string | undefined, challenge: string | undefined) {
    const expected = this.config.get<string>('META_VERIFY_TOKEN', 'wereal-meta-verify-dev');
    if (mode === 'subscribe' && token === expected && challenge) {
      return challenge;
    }
    throw new UnauthorizedException({ detail: 'Invalid Meta webhook verify token' });
  }

  assertSignature(payload: Record<string, unknown>, signature?: string) {
    const secret = this.config.get<string>('META_APP_SECRET');
    const skip = this.config.get<string>('META_WEBHOOK_SKIP_SIGNATURE') === 'true';
    if (!secret) {
      if (skip) return;
      this.logger.warn('META_APP_SECRET not set — skipping signature verify (dev only)');
      return;
    }
    if (!verifyMetaWebhookSignature(payload, signature, secret)) {
      throw new UnauthorizedException({ detail: 'Invalid Meta webhook signature' });
    }
  }

  async getIntegrationStatus(tenantId: string) {
    const [pages, recentEvents, processedCount, failedCount] = await Promise.all([
      this.pages.find({ where: { tenantId, isActive: true } }),
      this.events.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.events.count({ where: { tenantId, status: 'PROCESSED' } }),
      this.events.count({ where: { tenantId, status: 'FAILED' } }),
    ]);

    return {
      data: {
        channel: 'META',
        pages: pages.map((p) => ({
          id: p.id,
          pageId: p.pageId,
          pageName: p.pageName,
          isActive: p.isActive,
        })),
        stats: { processed: processedCount, failed: failedCount },
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          leadgenId: e.leadgenId,
          pageId: e.pageId,
          status: e.status,
          leadId: e.leadId,
          createdAt: e.createdAt.toISOString(),
          lastError: e.lastError,
        })),
      },
      meta: { tenantId, zaloStatus: 'ACTIVE' },
    };
  }

  async handleWebhook(payload: MetaWebhookPayload, signature?: string) {
    this.assertSignature(payload as unknown as Record<string, unknown>, signature);

    if (payload.object !== 'page' || !payload.entry?.length) {
      return { received: true, processed: 0 };
    }

    const results = [];
    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        results.push(await this.processLeadgen(change.value));
      }
    }

    return {
      received: true,
      processed: results.filter((r) => r.processed && !r.idempotentReplay).length,
      results,
    };
  }

  /** Admin sandbox — TC-21 step 2/3 without Meta app */
  async simulateLead(tenantId: string, input: {
    pageId: string;
    leadgenId?: string;
    fieldData: { name: string; values: string[] }[];
    campaignId?: string;
    adId?: string;
    formId?: string;
  }) {
    const binding = await this.pages.findOne({
      where: { tenantId, pageId: input.pageId, isActive: true },
    });
    if (!binding) {
      throw new NotFoundException({ detail: `Meta page ${input.pageId} not bound to tenant` });
    }

    return this.processLeadgen({
      leadgen_id: input.leadgenId ?? `lg_sim_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      page_id: input.pageId,
      form_id: input.formId ?? 'form_sim',
      ad_id: input.adId ?? 'ad_sim',
      campaign_id: input.campaignId ?? 'camp_sim',
      created_time: Math.floor(Date.now() / 1000),
      field_data: input.fieldData,
    });
  }

  private async processLeadgen(
    incoming: MetaWebhookPayload['entry'][0]['changes'][0]['value'],
  ) {
    const leadgenId = incoming.leadgen_id?.trim();
    const pageId = incoming.page_id?.trim();
    if (!leadgenId || !pageId) {
      throw new UnprocessableEntityException({ detail: 'leadgen_id and page_id required' });
    }

    let value = incoming;

    const existing = await this.events.findOne({ where: { leadgenId } });
    if (existing?.leadId) {
      return {
        leadgenId,
        leadId: existing.leadId,
        processed: true,
        idempotentReplay: true,
        status: existing.status,
      };
    }

    const binding = await this.pages.findOne({ where: { pageId, isActive: true } });
    if (!binding) {
      throw new NotFoundException({ detail: `Meta page ${pageId} is not connected` });
    }

    const eventId = `mle_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    let event: MetaLeadEventEntity;

    try {
      event = await this.events.save({
        id: eventId,
        tenantId: binding.tenantId,
        leadgenId,
        pageId,
        status: 'PROCESSING',
        leadId: null,
        payload: value as unknown as Record<string, unknown>,
        lastError: null,
      });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const replay = await this.events.findOne({ where: { leadgenId } });
        if (replay?.leadId) {
          return {
            leadgenId,
            leadId: replay.leadId,
            processed: true,
            idempotentReplay: true,
            status: replay.status,
          };
        }
      }
      throw err;
    }

    try {
      let fieldData = value.field_data;
      if (!fieldData?.length) {
        const token =
          binding.pageAccessToken?.trim() ||
          this.config.get<string>('META_PAGE_ACCESS_TOKEN')?.trim();
        if (!token) {
          throw new Error('field_data missing — connect page token or set META_PAGE_ACCESS_TOKEN');
        }
        const graphLead = await this.graph.fetchLead(leadgenId, token);
        fieldData = graphLead.field_data;
        value = {
          ...value,
          field_data: fieldData,
          ad_id: value.ad_id ?? graphLead.ad_id,
          campaign_id: value.campaign_id ?? graphLead.campaign_id,
          form_id: value.form_id ?? graphLead.form_id,
        };
      }

      if (!fieldData?.length) {
        throw new Error('Meta lead missing field_data after Graph fetch');
      }

      const parsed = parseMetaFieldData(fieldData);
      const channelMeta: MetaLeadChannelMeta = {
        channel: 'META',
        leadgenId,
        pageId,
        formId: value.form_id,
        adId: value.ad_id,
        adgroupId: value.adgroup_id,
        campaignId: value.campaign_id,
        createdTime: value.created_time,
      };

      const leadResult = await this.crm.createLead(
        binding.tenantId,
        {
          fullName: parsed.fullName,
          phone: parsed.phone,
          email: parsed.email,
          message: parsed.message,
          unitId: parsed.unitId,
          listingId: parsed.listingId,
          source: 'META_LEAD',
          consent: {
            privacyAccepted: true,
            privacyPolicyVersion: '2026-07-01',
            marketing: true,
          },
          utm: {
            utm_source: 'meta',
            utm_medium: 'lead_ads',
            utm_campaign: value.campaign_id ?? '',
            utm_content: value.ad_id ?? '',
          },
          channelMeta: { ...channelMeta },
        },
        `meta:${leadgenId}`,
      );

      event.status = 'PROCESSED';
      event.leadId = leadResult.data.id;
      const processedAt = new Date();
      const channelAt = parseMetaCreatedTime(value as unknown as Record<string, unknown>);
      const metrics = computeSlaMs(processedAt, event.createdAt, channelAt);
      event.processedAt = processedAt;
      event.ingestMs = metrics.ingestMs;
      event.slaMs = metrics.slaMs;
      await this.events.save(event);

      await this.audit.append({
        tenantId: binding.tenantId,
        entityType: 'meta_lead_event',
        entityId: event.id,
        action: 'META_LEAD_SYNCED',
        payload: {
          leadgenId,
          pageId,
          leadId: leadResult.data.id,
          campaignId: value.campaign_id,
          adId: value.ad_id,
          idempotentReplay: leadResult.meta?.idempotentReplay ?? false,
          ingestMs: event.ingestMs,
          slaMs: event.slaMs,
        },
        actorId: null,
      });

      this.logger.log(`UC-NW-02 Meta lead ${leadgenId} → ${leadResult.data.id}`);

      return {
        leadgenId,
        leadId: leadResult.data.id,
        processed: true,
        idempotentReplay: leadResult.meta?.idempotentReplay ?? false,
        status: 'PROCESSED' as const,
        tier: leadResult.data.attributes.tier,
        scoreStatus: leadResult.data.attributes.scoreStatus,
        ingestMs: event.ingestMs,
        slaMs: event.slaMs,
      };
    } catch (err) {
      event.status = 'FAILED';
      event.lastError = err instanceof Error ? err.message : String(err);
      await this.events.save(event);
      throw err;
    }
  }
}
