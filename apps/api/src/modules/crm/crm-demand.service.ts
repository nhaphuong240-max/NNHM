import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { SavedSearchEntity } from '../../database/entities/saved-search.entity';
import { UserEntity } from '../../database/entities/user.entity';
import {
  ViewingEntity,
  type ViewingOutcome,
  type ViewingStatus,
} from '../../database/entities/viewing.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from './crm.service';
import { normalizePhone } from './phone.util';
import { shouldMaskRegistrationPii, type RegistrationViewer } from './registration-abac.util';
import { hasViewingSlotConflict } from './viewing-slot.util';
import { assertViewingChecklistComplete, nextTaskForOutcome } from './viewing-checklist.util';

const PROTECTION_DAYS = 30;

const VIEWING_OUTCOMES: ViewingOutcome[] = [
  'COMPLETED_INTERESTED',
  'COMPLETED_NEEDS_OPTIONS',
  'PRICE_OBJECTION',
  'FINANCE_OBJECTION',
  'LEGAL_CONCERN',
  'NOT_SUITABLE',
  'NO_SHOW_CUSTOMER',
  'NO_SHOW_AGENT',
  'CANCELED',
];

@Injectable()
export class CrmDemandService {
  constructor(
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(LeadRegistrationEntity)
    private readonly registrations: Repository<LeadRegistrationEntity>,
    @InjectRepository(SavedSearchEntity)
    private readonly savedSearches: Repository<SavedSearchEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly crm: CrmService,
    private readonly audit: AuditService,
  ) {}

  private async resolveViewer(actorId?: string): Promise<RegistrationViewer | undefined> {
    if (!actorId) return undefined;
    const user = await this.users.findOne({ where: { id: actorId } });
    if (!user) return { userId: actorId, organizationId: null, role: 'AGENT' };
    return {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };
  }

  mapViewing(row: ViewingEntity) {
    const nextTask =
      row.status === 'COMPLETED' && row.outcome ? nextTaskForOutcome(row.outcome) : null;
    return {
      id: row.id,
      attributes: {
        leadId: row.leadId,
        unitId: row.unitId,
        projectId: row.projectId,
        listingId: row.listingId,
        requestedSlot: row.requestedSlot?.toISOString() ?? null,
        mode: row.mode,
        status: row.status,
        outcome: row.outcome,
        note: row.note,
        assignedTo: row.assignedTo,
        nextTask,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  }

  mapRegistration(row: LeadRegistrationEntity, maskPii: boolean) {
    return {
      id: row.id,
      attributes: {
        fullName: maskPii ? '••••' : row.fullName,
        phone: maskPii ? `${row.phoneNormalized.slice(0, 4)}****` : row.phone,
        projectId: row.projectId,
        unitId: row.unitId,
        leadId: maskPii ? undefined : row.leadId,
        registeredBy: row.registeredBy,
        status: row.status,
        protectedUntil: row.protectedUntil.toISOString(),
        intent: row.intent,
        note: maskPii ? undefined : row.note,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }

  mapSavedSearch(row: SavedSearchEntity) {
    return {
      id: row.id,
      attributes: {
        visitorId: row.visitorId,
        intent: row.intent,
        q: row.q,
        filters: row.filters,
        alertFrequency: row.alertFrequency,
        marketingConsent: row.marketingConsent,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }

  async requestViewing(
    tenantId: string,
    input: {
      fullName: string;
      phone: string;
      email?: string;
      unitId?: string;
      projectId?: string;
      listingId?: string;
      requestedSlot?: string;
      note?: string;
      inquiryType?: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string; marketing?: boolean };
    },
  ) {
    const lead = await this.crm.createLead(tenantId, {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      unitId: input.unitId,
      listingId: input.listingId,
      projectId: input.projectId,
      inquiryType: input.inquiryType,
      message: input.note,
      source: 'PUBLIC_VIEWING',
      consent: input.consent,
    });

    const slot = input.requestedSlot ? new Date(input.requestedSlot) : null;
    if (slot && Number.isNaN(slot.getTime())) {
      throwBusinessError(BusinessErrorCode.VIEWING_SLOT_INVALID, 'requestedSlot is invalid');
    }

    const id = `vw_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.viewings.save({
      id,
      tenantId,
      leadId: lead.data.id,
      unitId: input.unitId?.trim() ?? null,
      projectId: input.projectId?.trim() ?? null,
      listingId: input.listingId?.trim() ?? null,
      requestedSlot: slot,
      mode: slot ? 'TIMESLOT' : 'CALLBACK',
      status: 'REQUESTED',
      outcome: null,
      note: input.note?.trim() ?? null,
      assignedTo: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'viewing',
      entityId: id,
      action: 'CREATE',
      payload: { leadId: lead.data.id, unitId: row.unitId },
      actorId: null,
    });

    return {
      data: this.mapViewing(row),
      meta: { leadId: lead.data.id, deduplicated: lead.meta?.deduplicated ?? false },
    };
  }

  async listViewings(tenantId: string) {
    const rows = await this.viewings.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return { data: rows.map((row) => this.mapViewing(row)), meta: { count: rows.length } };
  }

  async patchViewing(
    tenantId: string,
    viewingId: string,
    input: {
      status?: ViewingStatus;
      outcome?: ViewingOutcome;
      note?: string;
      checklist?: Record<string, boolean>;
    },
    actorId?: string,
  ) {
    const row = await this.viewings.findOne({ where: { id: viewingId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Viewing ${viewingId} not found` });

    if (input.status === 'CONFIRMED') {
      row.status = 'CONFIRMED';
      if (!row.assignedTo && actorId) row.assignedTo = actorId;
      const siblings = await this.viewings.find({
        where: { tenantId, assignedTo: row.assignedTo ?? undefined },
      });
      const conflict = hasViewingSlotConflict(row, siblings.filter((v) => v.id !== row.id));
      if (conflict) {
        throwBusinessError(
          BusinessErrorCode.VIEWING_SLOT_CONFLICT,
          `Agent already has viewing ${conflict.id} at this slot`,
          { conflictViewingId: conflict.id },
        );
      }
    } else if (input.status) {
      row.status = input.status;
    }
    if (input.checklist) {
      row.checklist = { ...(row.checklist ?? {}), ...input.checklist };
      const { complete } = assertViewingChecklistComplete(row.checklist);
      if (complete) row.checklistCompletedAt = new Date();
    }
    if (input.outcome) {
      if (!VIEWING_OUTCOMES.includes(input.outcome)) {
        throw new UnprocessableEntityException({ detail: 'Invalid viewing outcome' });
      }
      if (!input.outcome.startsWith('NO_SHOW') && input.outcome !== 'CANCELED') {
        const { complete, missing } = assertViewingChecklistComplete(row.checklist);
        if (!complete) {
          throwBusinessError(
            BusinessErrorCode.VIEWING_CHECKLIST_INCOMPLETE,
            `Complete checklist before outcome: ${missing.join(', ')}`,
            { missing },
          );
        }
      }
      row.outcome = input.outcome;
      if (input.outcome.startsWith('NO_SHOW')) row.status = 'NO_SHOW';
      else if (input.outcome === 'CANCELED') row.status = 'CANCELED';
      else row.status = 'COMPLETED';
    }
    if (input.note?.trim()) row.note = input.note.trim();
    if (actorId) row.assignedTo = actorId;
    await this.viewings.save(row);

    if (row.status === 'CONFIRMED' || row.status === 'COMPLETED') {
      await this.crm.patchLead(tenantId, row.leadId, { stage: 'VIEWING' }, actorId).catch(() => undefined);
      await this.extendProtectionForLead(tenantId, row.leadId);
    }

    await this.audit.append({
      tenantId,
      entityType: 'viewing',
      entityId: row.id,
      action: 'PATCH',
      payload: { status: row.status, outcome: row.outcome, checklist: row.checklist },
      actorId: actorId ?? null,
    });

    if (row.status === 'COMPLETED' && row.outcome) {
      const next = nextTaskForOutcome(row.outcome);
      if (next) {
        await this.crm.createActivity(
          tenantId,
          { leadId: row.leadId, type: 'NOTE', summary: `Next: ${next}` },
          actorId,
          { skipAudit: true },
        );
      }
    }

    return { data: this.mapViewing(row) };
  }

  async registerCustomer(
    tenantId: string,
    input: {
      fullName: string;
      phone: string;
      projectId: string;
      unitId?: string;
      intent?: string;
      note?: string;
      consent?: { privacyAccepted?: boolean; privacyPolicyVersion?: string };
    },
    actorId: string,
  ) {
    if (!input.fullName?.trim() || !input.phone?.trim() || !input.projectId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'fullName, phone and projectId are required' });
    }
    const phoneNormalized = normalizePhone(input.phone);
    if (phoneNormalized.length < 9) {
      throwBusinessError(BusinessErrorCode.PHONE_INVALID, 'phone is invalid');
    }

    const now = new Date();
    const existing = await this.registrations.find({
      where: { tenantId, phoneNormalized, projectId: input.projectId.trim() },
      order: { createdAt: 'ASC' },
    });
    const active = existing.find((row) => row.status === 'ACCEPTED' && row.protectedUntil > now);

    if (active && active.registeredBy !== actorId) {
      return {
        data: this.mapRegistration(active, true),
        meta: { result: 'EXISTING_PROTECTED' as const },
      };
    }
    if (active && active.registeredBy === actorId) {
      return {
        data: this.mapRegistration(active, false),
        meta: { result: 'EXISTING_ELIGIBLE' as const },
      };
    }

    const lead = await this.crm.createLead(
      tenantId,
      {
        fullName: input.fullName,
        phone: input.phone,
        unitId: input.unitId,
        projectId: input.projectId,
        inquiryType: input.intent ?? 'buy',
        message: input.note,
        source: 'AGENT_REGISTRATION',
        consent: input.consent,
      },
      undefined,
      actorId,
    );

    const actor = await this.users.findOne({ where: { id: actorId } });
    const protectedUntil = new Date(now.getTime() + PROTECTION_DAYS * 24 * 60 * 60 * 1000);
    const id = `lr_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.registrations.save({
      id,
      tenantId,
      phoneNormalized,
      phone: input.phone.trim(),
      fullName: input.fullName.trim(),
      projectId: input.projectId.trim(),
      unitId: input.unitId?.trim() ?? null,
      leadId: lead.data.id,
      registeredBy: actorId,
      registeredByOrgId: actor?.organizationId ?? null,
      status: 'ACCEPTED',
      protectedUntil,
      intent: input.intent?.trim() || 'buy',
      note: input.note?.trim() ?? null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'lead_registration',
      entityId: id,
      action: 'CREATE',
      payload: { projectId: row.projectId, leadId: row.leadId, protectedUntil: protectedUntil.toISOString() },
      actorId,
    });

    return { data: this.mapRegistration(row, false), meta: { result: 'ACCEPTED' as const } };
  }

  async listRegistrations(tenantId: string, actorId?: string) {
    const viewer = await this.resolveViewer(actorId);
    const rows = await this.registrations.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return {
      data: rows.map((row) =>
        this.mapRegistration(
          row,
          shouldMaskRegistrationPii(
            {
              registeredBy: row.registeredBy,
              registeredByOrgId: row.registeredByOrgId,
              status: row.status,
            },
            viewer,
          ),
        ),
      ),
      meta: { count: rows.length, protectionDays: PROTECTION_DAYS, abac: 'org-v1' },
    };
  }

  async saveSearch(
    tenantId: string,
    input: {
      visitorId: string;
      intent?: string;
      q?: string;
      filters?: Record<string, unknown>;
      alertFrequency?: 'none' | 'daily' | 'instant';
      marketingConsent?: boolean;
    },
  ) {
    if (!input.visitorId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'visitorId is required' });
    }
    const id = `ss_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.savedSearches.save({
      id,
      tenantId,
      visitorId: input.visitorId.trim(),
      intent: input.intent?.trim() || 'buy',
      q: input.q?.trim() ?? '',
      filters: input.filters ?? {},
      alertFrequency: input.alertFrequency ?? 'none',
      marketingConsent: Boolean(input.marketingConsent),
    });
    return { data: this.mapSavedSearch(row) };
  }

  async listSavedSearches(tenantId: string, visitorId: string) {
    if (!visitorId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'visitorId is required' });
    }
    const rows = await this.savedSearches.find({
      where: { tenantId, visitorId: visitorId.trim() },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { data: rows.map((row) => this.mapSavedSearch(row)) };
  }

  async viewingAvailability(
    tenantId: string,
    agentId: string,
    from: string,
    to: string,
  ) {
    const fromDt = new Date(from);
    const toDt = new Date(to);
    const rows = await this.viewings.find({
      where: { tenantId, assignedTo: agentId },
      order: { requestedSlot: 'ASC' },
    });
    const busy = rows
      .filter((r) => r.requestedSlot && ['CONFIRMED', 'REQUESTED'].includes(r.status))
      .filter((r) => r.requestedSlot! >= fromDt && r.requestedSlot! <= toDt)
      .map((r) => ({
        viewingId: r.id,
        slot: r.requestedSlot!.toISOString(),
        status: r.status,
      }));
    return { data: busy, meta: { agentId, from, to, count: busy.length } };
  }

  async deleteSavedSearch(tenantId: string, id: string, visitorId: string) {
    const row = await this.savedSearches.findOne({ where: { id, tenantId, visitorId } });
    if (!row) throw new NotFoundException({ detail: 'Saved search not found' });
    await this.savedSearches.remove(row);
    return { data: { id } };
  }

  private async extendProtectionForLead(tenantId: string, leadId: string) {
    const rows = await this.registrations.find({ where: { tenantId, leadId, status: 'ACCEPTED' } });
    const next = new Date(Date.now() + PROTECTION_DAYS * 24 * 60 * 60 * 1000);
    for (const row of rows) {
      if (row.protectedUntil < next) {
        row.protectedUntil = next;
        await this.registrations.save(row);
      }
    }
  }
}
