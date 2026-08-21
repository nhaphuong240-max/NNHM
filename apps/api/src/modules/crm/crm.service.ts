import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { LeadScoringService } from '../ai-scoring/lead-scoring.service';
import { LeadConversionService } from '../ai-scoring/lead-conversion.service';
import { PROVISIONAL_LEAD_SCORE } from '../ai-scoring/lead-scoring.engine';
import { StreamEventsService } from '../stream/stream-events.service';
import type {
  CreateActivityInput,
  CreateLeadInput,
  CreateLeadResult,
  LeadRecord,
  PatchLeadInput,
} from './crm.types';
import {
  assertStageTransition,
  isActivityType,
  isPipelineStage,
  LOST_REASONS,
  mapActivityEntity,
  mapLeadEntity,
} from './crm.types';
import { resolveLeadAttribution } from './lead-attribution.util';
import { parseLeadImportCsv } from './crm-lead-import.util';
import type { LeadImportCommitInput, LeadImportPreviewInput } from './crm.types';
import {
  computeSlaBucket,
  idleHours,
  SLA_DUE_SOON_HOURS,
  SLA_HOURS,
  slaHoursRemaining,
} from './crm-sla.util';
import { MobileAgentService } from '../mobile-agent/mobile-agent.service';

export const PRIVACY_POLICY_VERSION = '2026-07-01';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(CrmActivityEntity)
    private readonly activities: Repository<CrmActivityEntity>,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
    private readonly leadScoring: LeadScoringService,
    private readonly consentLedger: ConsentLedgerService,
    private readonly leadConversion: LeadConversionService,
    @Inject(forwardRef(() => MobileAgentService))
    private readonly mobileAgent: MobileAgentService,
  ) {}

  status() {
    return {
      module: 'crm',
      sprint: 'S3',
      ucs: ['UC-CRM-01', 'UC-CRM-02', 'UC-CRM-03', 'UC-CRM-04', 'UC-CRM-06'],
    };
  }

  async listLeads(tenantId: string) {
    const rows = await this.leads.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      take: 200,
    });

    return {
      data: rows.map(mapLeadEntity),
      meta: { count: rows.length, tenantId, source: 'postgres' },
    };
  }

  async createLead(
    tenantId: string,
    input: CreateLeadInput,
    idempotencyKey?: string,
    actorId?: string,
  ): Promise<CreateLeadResult> {
    if (idempotencyKey) {
      const replay = await this.leads.findOne({ where: { tenantId, idempotencyKey } });
      if (replay) {
        return { data: mapLeadEntity(replay), meta: { idempotentReplay: true } };
      }
    }

    if (!input.fullName?.trim()) {
      throw new UnprocessableEntityException({
        detail: 'fullName is required',
      });
    }

    if (!input.phone?.trim()) {
      throw new UnprocessableEntityException({
        detail: 'phone is required',
      });
    }

    const source = input.source?.trim() || 'PUBLIC_FORM';
    this.assertConsent(source, input.consent);

    const id = `ld_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const consentGiven = Boolean(input.consent?.privacyAccepted);
    const privacyPolicyVersion = input.consent?.privacyPolicyVersion?.trim() ?? null;
    const marketingConsent = Boolean(input.consent?.marketing);
    const attribution = resolveLeadAttribution({
      utm: input.utm,
      channelMeta: input.channelMeta,
      campaignId: input.campaignId,
    });

    const row = await this.leads.save({
      id,
      tenantId,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() ?? null,
      source,
      score: PROVISIONAL_LEAD_SCORE,
      tier: 'NEW',
      scoreStatus: 'PENDING',
      status: 'NEW',
      routingStatus: 'PENDING',
      assignedTo: null,
      scoringMeta: null,
      channelMeta: input.channelMeta ?? null,
      unitId: input.unitId?.trim() ?? null,
      listingId: input.listingId?.trim() ?? null,
      message: input.message?.trim() ?? null,
      idempotencyKey: idempotencyKey ?? null,
      consentGiven,
      consentAt: consentGiven ? new Date() : null,
      privacyPolicyVersion,
      marketingConsent,
      utmCampaign: attribution.utmCampaign,
      campaignId: attribution.campaignId,
      lostReason: null,
      lastActivityAt: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: id,
      action: 'CREATE',
      payload: {
        source,
        scoreStatus: 'PENDING',
        provisionalScore: PROVISIONAL_LEAD_SCORE,
        unitId: row.unitId,
        channelMeta: row.channelMeta,
        consentGiven,
        privacyPolicyVersion,
        marketingConsent,
        utmCampaign: attribution.utmCampaign,
        campaignId: attribution.campaignId,
      },
      actorId: actorId ?? null,
    });

    if (consentGiven) {
      await this.consentLedger.record(tenantId, {
        subjectType: 'LEAD',
        subjectId: id,
        purpose: 'PRIVACY',
        policyVersion: privacyPolicyVersion ?? PRIVACY_POLICY_VERSION,
        granted: true,
        channel: source,
        actorId,
      });
    }
    if (marketingConsent) {
      await this.consentLedger.record(tenantId, {
        subjectType: 'LEAD',
        subjectId: id,
        purpose: 'MARKETING',
        policyVersion: privacyPolicyVersion ?? PRIVACY_POLICY_VERSION,
        granted: true,
        channel: source,
        actorId,
      });
    }

    await this.leadScoring.enqueue(tenantId, id, {
      source,
      unitId: input.unitId,
      email: input.email,
      message: input.message,
      utm: input.utm,
    });

    if (row.unitId) {
      await this.streamEvents.publish(tenantId, {
        event: 'lead.created',
        data: {
          leadId: id,
          unitId: row.unitId,
          tier: row.tier,
          scoreStatus: row.scoreStatus,
          timestamp: row.createdAt.toISOString(),
        },
      });
    }

    const refreshed = await this.leads.findOne({ where: { id, tenantId } });
    const leadRow = refreshed ?? row;

    if (source !== 'CSV_IMPORT') {
      void this.mobileAgent
        .notifyNewLead(tenantId, {
          leadId: id,
          fullName: leadRow.fullName,
          source,
          assignedTo: leadRow.assignedTo,
        })
        .catch(() => undefined);
    }

    return { data: mapLeadEntity(leadRow) };
  }

  /** UC-CRM-04 — CSV import preview (SCR-AGENT-008) */
  async previewLeadImport(tenantId: string, input: LeadImportPreviewInput) {
    if (!input.csvText?.trim()) {
      throw new UnprocessableEntityException({ detail: 'csvText is required' });
    }

    const existing = await this.leads.find({ where: { tenantId }, select: { phone: true } });
    const existingPhones = new Set(existing.map((row) => row.phone.trim()));
    const { rows, headers } = parseLeadImportCsv(input.csvText, {
      columnMap: input.columnMap,
      existingPhones,
    });

    return {
      data: { rows, headers },
      meta: {
        tenantId,
        total: rows.length,
        validCount: rows.filter((r) => r.valid).length,
        invalidCount: rows.filter((r) => !r.valid).length,
        duplicateCount: rows.filter((r) => r.duplicatePhone).length,
        uc: ['UC-CRM-04'],
        screen: 'SCR-AGENT-008',
      },
    };
  }

  /** UC-CRM-04 — commit validated import rows */
  async commitLeadImport(tenantId: string, input: LeadImportCommitInput, actorId?: string) {
    if (!input.rows?.length) {
      throw new UnprocessableEntityException({ detail: 'rows must not be empty' });
    }

    const source = input.defaultSource?.trim() || 'CSV_IMPORT';
    const skipDuplicates = input.skipDuplicates !== false;
    const created: LeadRecord[] = [];
    const skipped: { phone: string; reason: string }[] = [];

    for (const row of input.rows) {
      if (!row.fullName?.trim() || !row.phone?.trim()) {
        skipped.push({ phone: row.phone ?? '', reason: 'invalid_row' });
        continue;
      }

      if (skipDuplicates) {
        const dup = await this.leads.findOne({
          where: { tenantId, phone: row.phone.trim() },
        });
        if (dup) {
          skipped.push({ phone: row.phone, reason: 'duplicate' });
          continue;
        }
      }

      const result = await this.createLead(
        tenantId,
        {
          fullName: row.fullName,
          phone: row.phone,
          email: row.email,
          unitId: row.unitId,
          message: row.message,
          source,
          channelMeta: { import: true },
        },
        undefined,
        actorId,
      );

      if (input.assignTo?.trim()) {
        const leadRow = await this.leads.findOne({ where: { id: result.data.id, tenantId } });
        if (leadRow) {
          leadRow.assignedTo = input.assignTo.trim();
          leadRow.routingStatus = 'ASSIGNED';
          await this.leads.save(leadRow);
          result.data.attributes.assignedTo = leadRow.assignedTo ?? undefined;
          result.data.attributes.routingStatus = leadRow.routingStatus;
        }
      }

      created.push(result.data);
    }

    await this.audit.append({
      tenantId,
      entityType: 'lead_import',
      entityId: `import_${Date.now()}`,
      action: 'IMPORT',
      payload: { createdCount: created.length, skippedCount: skipped.length, source },
      actorId: actorId ?? null,
    });

    return {
      data: created,
      meta: {
        createdCount: created.length,
        skippedCount: skipped.length,
        skipped,
        uc: ['UC-CRM-04'],
        screen: 'SCR-AGENT-008',
      },
    };
  }

  async findLead(tenantId: string, leadId: string): Promise<LeadRecord | null> {
    const row = await this.leads.findOne({ where: { id: leadId, tenantId } });
    return row ? mapLeadEntity(row) : null;
  }

  async getLead(tenantId: string, leadId: string) {
    const record = await this.findLead(tenantId, leadId.trim());
    if (!record) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }
    return { data: record, meta: { tenantId } };
  }

  /** UC-CRM-06 · SCR-AGENT-SLA — task board read-model */
  async getSlaTasks(tenantId: string) {
    const rows = await this.leads.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      take: 200,
    });

    const overdue: NonNullable<ReturnType<CrmService['mapSlaTask']>>[] = [];
    const dueSoon: NonNullable<ReturnType<CrmService['mapSlaTask']>>[] = [];
    let tracked = 0;

    for (const row of rows) {
      const task = this.mapSlaTask(row);
      if (!task) continue;
      tracked += 1;
      if (task.attributes.bucket === 'overdue') overdue.push(task);
      if (task.attributes.bucket === 'due_soon') dueSoon.push(task);
    }

    overdue.sort((a, b) => b.attributes.idleHours - a.attributes.idleHours);
    dueSoon.sort((a, b) => b.attributes.idleHours - a.attributes.idleHours);

    const recentActivities = await this.activities
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere("a.metadata->>'slaAction' IS NOT NULL")
      .orderBy('a.created_at', 'DESC')
      .take(15)
      .getMany();

    return {
      data: {
        summary: {
          slaHours: SLA_HOURS,
          dueSoonHours: SLA_DUE_SOON_HOURS,
          trackedLeads: tracked,
          overdueCount: overdue.length,
          dueSoonCount: dueSoon.length,
        },
        overdue,
        dueSoon,
        recentSlaEvents: recentActivities.map(mapActivityEntity),
      },
      meta: {
        tenantId,
        uc: ['UC-CRM-06'],
        screen: 'SCR-AGENT-SLA',
        source: 'postgres',
      },
    };
  }

  async recordSlaReminder(
    tenantId: string,
    leadId: string,
    input: { channel?: 'ZALO' | 'CALL' | 'NOTE'; message?: string },
    actorId?: string,
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId.trim(), tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const bucket = computeSlaBucket(lead);
    if (!bucket) {
      throw new UnprocessableEntityException({
        detail: 'SLA reminders apply to NEW/CONTACTED leads only',
      });
    }

    const channel = input.channel ?? 'ZALO';
    const type = channel === 'CALL' ? 'CALL' : channel === 'NOTE' ? 'NOTE' : 'ZALO';
    const summary =
      input.message?.trim() ||
      `SLA reminder (${bucket}) — follow up within ${Math.ceil(slaHoursRemaining(lead) ?? 0)}h`;

    const activity = await this.createActivity(
      tenantId,
      {
        leadId: lead.id,
        type,
        summary,
        metadata: {
          slaAction: 'REMINDER',
          slaBucket: bucket,
          idleHours: Math.round(idleHours(lead) * 10) / 10,
          channel,
        },
      },
      actorId,
    );

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: lead.id,
      action: 'SLA_REMINDER',
      payload: {
        bucket,
        channel,
        activityId: activity.data.id,
      },
      actorId: actorId ?? null,
    });

    return {
      data: activity.data,
      meta: { uc: ['UC-CRM-06'], screen: 'SCR-AGENT-SLA', action: 'REMINDER' },
    };
  }

  async recordSlaEscalation(
    tenantId: string,
    leadId: string,
    input: { reason?: string },
    actorId?: string,
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId.trim(), tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const bucket = computeSlaBucket(lead);
    if (bucket !== 'overdue') {
      throw new UnprocessableEntityException({
        detail: 'Escalation requires overdue SLA (48h idle on NEW/CONTACTED)',
      });
    }

    const summary = input.reason?.trim() || 'Escalate to Agency Admin — SLA breached';

    const activity = await this.createActivity(
      tenantId,
      {
        leadId: lead.id,
        type: 'NOTE',
        summary,
        metadata: {
          slaAction: 'ESCALATION',
          slaBucket: bucket,
          idleHours: Math.round(idleHours(lead) * 10) / 10,
          escalatedTo: 'AGENCY_ADMIN',
        },
      },
      actorId,
    );

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: lead.id,
      action: 'SLA_ESCALATION',
      payload: {
        reason: summary,
        activityId: activity.data.id,
        idleHours: idleHours(lead),
      },
      actorId: actorId ?? null,
    });

    return {
      data: activity.data,
      meta: { uc: ['UC-CRM-06'], screen: 'SCR-AGENT-SLA', action: 'ESCALATION' },
    };
  }

  private mapSlaTask(row: LeadEntity) {
    const bucket = computeSlaBucket(row);
    if (!bucket || bucket === 'ok') return null;

    return {
      id: row.id,
      attributes: {
        fullName: row.fullName,
        phone: row.phone,
        status: row.status,
        tier: row.tier,
        score: row.score,
        unitId: row.unitId ?? undefined,
        assignedTo: row.assignedTo ?? undefined,
        lastActivityAt: row.lastActivityAt?.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        bucket,
        idleHours: Math.round(idleHours(row) * 10) / 10,
        hoursRemaining: slaHoursRemaining(row),
      },
    };
  }

  async patchLead(
    tenantId: string,
    leadId: string,
    input: PatchLeadInput,
    actorId?: string,
  ) {
    const row = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const before = row.status;
    let nextStatus = row.status;

    if (input.stage) {
      if (!isPipelineStage(input.stage)) {
        throw new UnprocessableEntityException({ detail: `Invalid stage ${input.stage}` });
      }
      try {
        assertStageTransition(row.status, input.stage);
      } catch {
        throw new UnprocessableEntityException({
          detail: `Stage transition ${row.status} → ${input.stage} is not allowed`,
        });
      }
      nextStatus = input.stage;
    }

    if (nextStatus === 'BOOKING' && !row.unitId && !input.unitId?.trim()) {
      throw new UnprocessableEntityException({
        detail: 'unitId is required when moving to BOOKING stage',
      });
    }

    if (nextStatus === 'LOST') {
      const reason = input.lostReason?.trim();
      if (!reason) {
        throw new UnprocessableEntityException({
          detail: 'lostReason is required when stage is LOST',
        });
      }
      if (!LOST_REASONS.includes(reason as (typeof LOST_REASONS)[number])) {
        throw new UnprocessableEntityException({
          detail: `lostReason must be one of: ${LOST_REASONS.join(', ')}`,
        });
      }
      row.lostReason = reason;
    } else {
      row.lostReason = null;
    }

    if (input.unitId?.trim()) {
      row.unitId = input.unitId.trim();
    }

    row.status = nextStatus;
    row.updatedAt = new Date();
    const saved = await this.leads.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: leadId,
      action: 'PATCH',
      payload: {
        before: { status: before },
        after: { status: saved.status, unitId: saved.unitId, lostReason: saved.lostReason },
        notes: input.notes ?? null,
      },
      actorId: actorId ?? null,
    });

    if (before === 'NEW' && saved.status === 'CONTACTED' && this.leadConversion.isHotLead(saved)) {
      await this.leadConversion.record(tenantId, leadId, 'CONTACTED', { status: saved.status });
    }
    if (saved.status === 'BOOKING' && this.leadConversion.isHotLead(saved)) {
      await this.leadConversion.record(tenantId, leadId, 'BOOKED', { status: saved.status });
    }

    if (input.notes?.trim()) {
      await this.createActivity(
        tenantId,
        {
          leadId,
          type: 'NOTE',
          summary: input.notes.trim(),
        },
        actorId,
        { skipAudit: true },
      );
    }

    return { data: mapLeadEntity(saved) };
  }

  async listActivities(tenantId: string, leadId?: string, type?: string) {
    const qb = this.activities
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.created_at', 'DESC')
      .take(100);

    if (leadId?.trim()) {
      qb.andWhere('a.lead_id = :leadId', { leadId: leadId.trim() });
    }
    if (type?.trim()) {
      qb.andWhere('a.type = :type', { type: type.trim() });
    }

    const rows = await qb.getMany();
    return {
      data: rows.map(mapActivityEntity),
      meta: { count: rows.length, tenantId, leadId: leadId ?? undefined },
    };
  }

  async createActivity(
    tenantId: string,
    input: CreateActivityInput,
    actorId?: string,
    opts?: { skipAudit?: boolean },
  ) {
    if (!input.leadId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'leadId is required' });
    }
    if (!isActivityType(input.type)) {
      throw new UnprocessableEntityException({
        detail: 'type must be CALL, NOTE, VISIT, ZALO, or MEETING',
      });
    }

    const lead = await this.leads.findOne({
      where: { id: input.leadId.trim(), tenantId },
    });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${input.leadId} not found` });
    }

    const id = `act_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.activities.save({
      id,
      tenantId,
      leadId: lead.id,
      type: input.type,
      summary: input.summary?.trim() ?? null,
      metadata: input.metadata ?? null,
      createdBy: actorId ?? null,
    });

    lead.lastActivityAt = row.createdAt;
    lead.updatedAt = new Date();
    await this.leads.save(lead);

    if (!opts?.skipAudit) {
      await this.audit.append({
        tenantId,
        entityType: 'lead',
        entityId: lead.id,
        action: 'ACTIVITY',
        payload: {
          activityId: id,
          type: input.type,
          summary: row.summary,
        },
        actorId: actorId ?? null,
      });
    }

    return { data: mapActivityEntity(row) };
  }

  private assertConsent(
    source: string,
    consent?: CreateLeadInput['consent'],
  ): void {
    const requiresPdpa =
      source === 'PUBLIC_FORM' || source === 'PUBLIC_UNIT_DETAIL' || source === 'PUBLIC_SERP';

    if (consent?.marketing && !consent.privacyPolicyVersion?.trim()) {
      throw new UnprocessableEntityException({
        detail: 'privacyPolicyVersion is required when marketing consent is true (BR-15)',
      });
    }

    if (!requiresPdpa) return;

    if (!consent?.privacyAccepted) {
      throw new UnprocessableEntityException({
        type: 'https://wereal.dev/problems/consent-required',
        title: 'Consent required',
        detail: 'consent.privacyAccepted is required for public lead forms (BR-15)',
      });
    }

    if (!consent?.privacyPolicyVersion?.trim()) {
      throw new UnprocessableEntityException({
        detail: 'privacyPolicyVersion is required (BR-15)',
      });
    }
  }
}
