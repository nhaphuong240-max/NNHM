import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { CrmRoutingSuggestionEntity } from '../../database/entities/crm-routing-suggestion.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_TENANT_DEMAND_POLICY } from './demand-policy.types';
import { hotFirstTouchDeadline, isBusinessTime } from './sla-calendar.util';

/** P2 FR-REV-002 — routing suggestions by partner score + inventory aging. */
@Injectable()
export class RoutingSuggestionService {
  constructor(
    @InjectRepository(CrmRoutingSuggestionEntity)
    private readonly suggestions: Repository<CrmRoutingSuggestionEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly audit: AuditService,
  ) {}

  async listPending(tenantId: string) {
    const rows = await this.suggestions.find({
      where: { tenantId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const agentIds = [...new Set(rows.map((r) => r.suggestedAgentId))];
    const agents = agentIds.length
      ? await this.users.find({ where: { id: In(agentIds) } })
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return {
      data: rows.map((r) => ({
        id: r.id,
        leadId: r.leadId,
        suggestedAgentId: r.suggestedAgentId,
        suggestedAgentEmail: agentMap.get(r.suggestedAgentId)?.email ?? null,
        status: r.status,
        partnerScore: r.partnerScore,
        inventoryAgingDays: r.inventoryAgingDays,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { tenantId, fr: 'FR-REV-002', count: rows.length },
    };
  }

  async suggestForLead(tenantId: string, lead: LeadEntity) {
    if (lead.tier !== 'HOT') return null;

    const existing = await this.suggestions.findOne({
      where: { tenantId, leadId: lead.id, status: 'PENDING' },
    });
    if (existing) return existing;

    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { partnerScore: 'DESC', createdAt: 'ASC' },
    });
    if (agents.length === 0) return null;

    const agingDays = await this.inventoryAgingDays(tenantId, lead.unitId, lead.listingId);
    const agent = this.pickAgent(agents, agingDays);

    const row = await this.suggestions.save({
      id: `rs_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      leadId: lead.id,
      suggestedAgentId: agent.id,
      status: 'PENDING',
      partnerScore: agent.partnerScore,
      inventoryAgingDays: agingDays,
      reason: {
        strategy: 'PARTNER_SCORE_AGING',
        agentEmail: agent.email,
        partnerScore: agent.partnerScore,
        inventoryAgingDays: agingDays,
        note:
          agingDays >= 30
            ? 'Tồn kho aging > 30 ngày — ưu tiên partner score cao'
            : 'Partner score + round-robin trong pool agent',
      },
    });

    lead.routingStatus = 'PENDING';
    lead.assignedTo = null;
    await this.leads.save(lead);

    return row;
  }

  async approve(tenantId: string, suggestionId: string, reviewerId: string) {
    const row = await this.suggestions.findOne({
      where: { id: suggestionId, tenantId },
    });
    if (!row) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, `Suggestion ${suggestionId} not found`);
    }
    if (row!.status !== 'PENDING') {
      throwBusinessError(BusinessErrorCode.VALIDATION_FAILED, 'Suggestion already reviewed');
    }

    const lead = await this.leads.findOne({ where: { id: row!.leadId, tenantId } });
    if (!lead) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, `Lead ${row!.leadId} not found`);
    }

    row!.status = 'APPROVED';
    row!.reviewedBy = reviewerId;
    row!.reviewedAt = new Date();
    await this.suggestions.save(row!);

    lead.assignedTo = row!.suggestedAgentId;
    lead.routingStatus = 'ASSIGNED';
    const now = new Date();
    const policy = DEFAULT_TENANT_DEMAND_POLICY;
    if (isBusinessTime(now, policy.sla)) {
      lead.hotSlaDueAt = hotFirstTouchDeadline(now, policy);
      lead.hotSlaBreached = false;
    }
    await this.leads.save(lead);

    await this.audit.append({
      tenantId,
      entityType: 'crm_routing_suggestion',
      entityId: row!.id,
      action: 'APPROVE',
      actorId: reviewerId,
      payload: { leadId: lead.id, assignedTo: row!.suggestedAgentId },
    });

    return { data: { id: row!.id, status: 'APPROVED', leadId: lead.id, assignedTo: lead.assignedTo } };
  }

  async reject(tenantId: string, suggestionId: string, reviewerId: string) {
    const row = await this.suggestions.findOne({
      where: { id: suggestionId, tenantId },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Suggestion ${suggestionId} not found` });
    }
    row.status = 'REJECTED';
    row.reviewedBy = reviewerId;
    row.reviewedAt = new Date();
    await this.suggestions.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'crm_routing_suggestion',
      entityId: row.id,
      action: 'REJECT',
      actorId: reviewerId,
      payload: { leadId: row.leadId },
    });

    return { data: { id: row.id, status: 'REJECTED' } };
  }

  private pickAgent(agents: UserEntity[], agingDays: number) {
    if (agingDays >= 30) {
      return agents.reduce((best, a) => (a.partnerScore > best.partnerScore ? a : best), agents[0]!);
    }
    const topScore = agents[0]!.partnerScore;
    const tier = agents.filter((a) => a.partnerScore >= topScore - 10);
    return tier[0]!;
  }

  private async inventoryAgingDays(
    tenantId: string,
    unitId?: string | null,
    listingId?: string | null,
  ) {
    if (!listingId && !unitId) return 0;
    const listing = listingId
      ? await this.listings.findOne({ where: { id: listingId, tenantId } })
      : null;
    if (!listing?.updatedAt) return 0;
    return Math.floor((Date.now() - listing.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}
