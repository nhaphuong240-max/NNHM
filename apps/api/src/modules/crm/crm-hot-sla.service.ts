import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SlaBreachLogEntity } from '../../database/entities/sla-breach-log.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { DemandPolicyService } from './demand-policy.service';
import { assertSlaApplicable, hotFirstTouchDeadline, isBusinessTime } from './sla-calendar.util';
import { mapLeadEntity } from './crm.types';

@Injectable()
export class CrmHotSlaService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(SlaBreachLogEntity)
    private readonly breachLogs: Repository<SlaBreachLogEntity>,
    private readonly policy: DemandPolicyService,
    private readonly audit: AuditService,
  ) {}

  async stampHotSlaOnRoute(tenantId: string, lead: LeadEntity) {
    if (lead.tier !== 'HOT') return lead;
    const payload = await this.policy.resolvePayload(tenantId);
    const now = new Date();
    if (!isBusinessTime(now, payload.sla)) {
      lead.hotSlaDueAt = null;
      return lead;
    }
    lead.hotSlaDueAt = hotFirstTouchDeadline(now, payload);
    lead.hotSlaBreached = false;
    return lead;
  }

  async recordFirstTouch(tenantId: string, leadId: string, actorId: string) {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) return null;
    if (!lead.firstTouchAt) {
      lead.firstTouchAt = new Date();
      lead.status = lead.status === 'NEW' ? 'CONTACTED' : lead.status;
      await this.leads.save(lead);
      await this.audit.append({
        tenantId,
        entityType: 'lead',
        entityId: leadId,
        action: 'FIRST_TOUCH',
        actorId,
        payload: { at: lead.firstTouchAt.toISOString() },
      });
    }
    return lead;
  }

  /** P0 FR-LEAD-008 — Today board for agent */
  async getToday(tenantId: string, agentId?: string) {
    const now = new Date();
    const payload = await this.policy.resolvePayload(tenantId);
    const slaApplicable = isBusinessTime(now, payload.sla);

    const qb = this.leads
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.tier = :tier', { tier: 'HOT' })
      .orderBy('l.hot_sla_due_at', 'ASC', 'NULLS LAST')
      .take(50);

    if (agentId) {
      qb.andWhere('l.assigned_to = :agentId', { agentId });
    }

    const hotRows = await qb.getMany();
    const overdue = hotRows.filter(
      (l) =>
        l.hotSlaDueAt &&
        l.hotSlaDueAt <= now &&
        !l.firstTouchAt &&
        !l.hotSlaBreached,
    );

    const queue = hotRows.map((l) => {
      const dueMs = l.hotSlaDueAt ? l.hotSlaDueAt.getTime() - now.getTime() : null;
      return {
        ...mapLeadEntity(l),
        hotSlaDueAt: l.hotSlaDueAt?.toISOString() ?? null,
        firstTouchAt: l.firstTouchAt?.toISOString() ?? null,
        countdownMs: dueMs,
        overdue: Boolean(dueMs !== null && dueMs <= 0 && !l.firstTouchAt),
      };
    });

    return {
      data: {
        attributes: {
          slaApplicable,
          hotFirstTouchMinutes: payload.sla.hotFirstTouchMinutes,
          overdueCount: overdue.length,
          hotCount: hotRows.length,
          queue,
        },
      },
      meta: { tenantId, screen: 'SCR-AGENT-TODAY', uc: 'FR-LEAD-008' },
    };
  }

  async escalateHotLead(
    tenantId: string,
    leadId: string,
    actorId: string,
    reason?: string,
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, `Lead ${leadId} not found`);
    }
    if (lead.tier !== 'HOT') {
      throwBusinessError(BusinessErrorCode.VALIDATION_FAILED, 'Escalate applies to HOT leads only');
    }

    const escalatePayload = await this.policy.resolvePayload(tenantId);
    try {
      assertSlaApplicable(new Date(), escalatePayload);
    } catch {
      /* outside hours — manual escalate still allowed for ops */
    }

    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { createdAt: 'ASC' },
    });
    const pool = agents.filter((a) => a.id !== lead.assignedTo);
    const nextAgent = pool[0] ?? agents.find((a) => a.id !== lead.assignedTo);
    const escalatedTo = nextAgent?.id ?? lead.assignedTo;

    if (escalatedTo && escalatedTo !== lead.assignedTo) {
      const prev = lead.assignedTo;
      lead.assignedTo = escalatedTo;
      lead.hotSlaBreached = true;
      lead.hotSlaDueAt = hotFirstTouchDeadline(new Date(), escalatePayload);
      await this.leads.save(lead);

      const breachId = `slb_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
      await this.breachLogs.save({
        id: breachId,
        tenantId,
        leadId,
        breachType: 'HOT_ESCALATED',
        dueAt: lead.hotSlaDueAt ?? new Date(),
        breachedAt: new Date(),
        escalatedTo,
        actorId,
        payload: { reason: reason ?? 'manual_escalate', previousAssignee: prev },
      });

      await this.audit.append({
        tenantId,
        entityType: 'lead',
        entityId: leadId,
        action: 'SLA_ESCALATE',
        actorId,
        payload: { escalatedTo, previousAssignee: prev, reason },
      });
    }

    return {
      data: mapLeadEntity(lead),
      meta: { escalatedTo: lead.assignedTo, reassigned: true },
    };
  }
}
