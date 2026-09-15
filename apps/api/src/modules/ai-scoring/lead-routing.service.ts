import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import type { LeadEntity } from '../../database/entities/lead.entity';
import {
  CrmRoutingRuleEntity,
  type CrmRoutingRulesPayload,
} from '../../database/entities/crm-routing-rule.entity';
import { CrmRoutingSuggestionEntity } from '../../database/entities/crm-routing-suggestion.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_TENANT_DEMAND_POLICY } from '../crm/demand-policy.types';
import {
  filterRoutingCandidates,
  requiredSkillsForLead,
} from '../crm/routing-candidate.util';
import { hotFirstTouchDeadline, isBusinessTime } from '../crm/sla-calendar.util';
import { LeadConversionService } from './lead-conversion.service';

const DEFAULT_HOT_AGENT_ID = 'usr_agent_01';

const DEFAULT_ROUTING: CrmRoutingRulesPayload = {
  enabled: true,
  hotTierMinScore: 85,
  strategy: 'PARTNER_SCORE_AGING',
  assignOnTier: 'HOT',
  roundRobinCursor: 0,
  requireHumanApproval: true,
};

@Injectable()
export class LeadRoutingService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CrmRoutingRuleEntity)
    private readonly routingRules: Repository<CrmRoutingRuleEntity>,
    @InjectRepository(CrmRoutingSuggestionEntity)
    private readonly suggestions: Repository<CrmRoutingSuggestionEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    private readonly audit: AuditService,
    private readonly conversion: LeadConversionService,
  ) {}

  /** UC-CRM-02 — HOT leads auto-assign from persisted routing rules (P0) */
  async applyRouting(tenantId: string, lead: LeadEntity) {
    if (lead.tier !== 'HOT') {
      lead.routingStatus = 'PENDING';
      lead.assignedTo = null;
      lead.hotSlaDueAt = null;
      return lead;
    }

    const rulesRow = await this.routingRules.findOne({
      where: { tenantId, projectId: lead.projectId ?? '' },
    });
    const fallbackRow = rulesRow
      ? null
      : await this.routingRules.findOne({ where: { tenantId, projectId: '' } });
    const rules = rulesRow?.rules ?? fallbackRow?.rules ?? { ...DEFAULT_ROUTING };

    if (!rules.enabled) {
      lead.routingStatus = 'PENDING';
      return lead;
    }

    const requireApproval = rules.requireHumanApproval !== false;
    const agingDays = await this.inventoryAgingDays(tenantId, lead.listingId);
    const { agentId, filterMeta } = await this.pickAgentId(
      tenantId,
      lead,
      rules,
      rulesRow ?? fallbackRow,
      agingDays,
    );

    if (requireApproval) {
      await this.createSuggestion(tenantId, lead, agentId, agingDays, filterMeta);
      lead.routingStatus = 'PENDING';
      lead.assignedTo = null;
      lead.hotSlaDueAt = null;
      return lead;
    }

    lead.assignedTo = agentId;
    lead.routingStatus = 'ASSIGNED';

    const now = new Date();
    const policy = DEFAULT_TENANT_DEMAND_POLICY;
    if (isBusinessTime(now, policy.sla)) {
      lead.hotSlaDueAt = hotFirstTouchDeadline(now, policy);
      lead.hotSlaBreached = false;
    } else {
      lead.hotSlaDueAt = null;
    }

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: lead.id,
      action: 'ROUTE',
      payload: {
        tier: lead.tier,
        score: lead.score,
        assignedTo: agentId,
        strategy: rules.strategy,
        hotSlaDueAt: lead.hotSlaDueAt?.toISOString() ?? null,
      },
      actorId: null,
    });

    await this.conversion.record(tenantId, lead.id, 'HOT_ROUTED', {
      assignedTo: agentId,
      score: lead.score,
    });

    return lead;
  }

  private async createSuggestion(
    tenantId: string,
    lead: LeadEntity,
    agentId: string,
    agingDays: number,
    filterMeta?: Record<string, unknown>,
  ) {
    const existing = await this.suggestions.findOne({
      where: { tenantId, leadId: lead.id, status: 'PENDING' },
    });
    if (existing) return;

    const agent = await this.users.findOne({ where: { id: agentId, tenantId } });
    await this.suggestions.save({
      id: `rs_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      leadId: lead.id,
      suggestedAgentId: agentId,
      status: 'PENDING',
      partnerScore: agent?.partnerScore ?? 50,
      inventoryAgingDays: agingDays,
      reason: {
        strategy: rulesStrategyLabel(agingDays),
        partnerScore: agent?.partnerScore,
        inventoryAgingDays: agingDays,
        requiresHumanApproval: true,
        ...filterMeta,
      },
    });
  }

  private async inventoryAgingDays(tenantId: string, listingId?: string | null) {
    if (!listingId) return 0;
    const listing = await this.listings.findOne({ where: { id: listingId, tenantId } });
    if (!listing?.updatedAt) return 0;
    return Math.floor((Date.now() - listing.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async pickAgentId(
    tenantId: string,
    lead: LeadEntity,
    rules: CrmRoutingRulesPayload,
    row: CrmRoutingRuleEntity | null,
    agingDays: number,
  ): Promise<{ agentId: string; filterMeta: Record<string, unknown> }> {
    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { partnerScore: 'DESC', createdAt: 'ASC' },
    });

    if (agents.length === 0) {
      return { agentId: DEFAULT_HOT_AGENT_ID, filterMeta: { fallback: 'empty_pool' } };
    }

    const ruleSkills = rules.skillTags?.length ? rules.skillTags : [];
    const projectSkills = requiredSkillsForLead(lead.projectId);
    const requiredSkills = [...new Set([...ruleSkills, ...projectSkills])];

    const openRows = await this.users.manager.query(
      `SELECT assigned_to AS id, COUNT(*)::int AS cnt
       FROM leads
       WHERE tenant_id = $1 AND assigned_to IS NOT NULL
         AND status NOT IN ('WON','LOST')
       GROUP BY assigned_to`,
      [tenantId],
    );
    const openLeadCounts = new Map<string, number>(
      openRows.map((r: { id: string; cnt: number }) => [r.id, r.cnt]),
    );

    const activeViewings = await this.viewings.find({
      where: { tenantId },
    });

    let { eligible, excluded } = filterRoutingCandidates({
      agents,
      requiredSkills,
      maxOpenLeads: rules.maxOpenLeads,
      openLeadCounts,
      viewings: activeViewings,
    });

    let relaxed: string[] = [];
    if (eligible.length === 0) {
      ({ eligible, excluded } = filterRoutingCandidates({
        agents,
        requiredSkills,
        maxOpenLeads: rules.maxOpenLeads,
        openLeadCounts,
        viewings: [],
      }));
      if (eligible.length > 0) relaxed.push('calendar');
    }
    if (eligible.length === 0) {
      ({ eligible, excluded } = filterRoutingCandidates({
        agents,
        requiredSkills: [],
        maxOpenLeads: rules.maxOpenLeads,
        openLeadCounts,
        viewings: [],
      }));
      if (eligible.length > 0) relaxed.push('skill');
    }
    if (eligible.length === 0) {
      eligible = agents;
      relaxed.push('workload');
    }

    const filterMeta = {
      requiredSkills,
      excluded,
      relaxed,
      phase: 'B',
    };

    if (rules.strategy === 'PARTNER_SCORE_AGING' && agingDays >= 30) {
      const best = eligible.reduce(
        (b, a) => (a.partnerScore > b.partnerScore ? a : b),
        eligible[0]!,
      );
      return { agentId: best.id, filterMeta };
    }

    const cursor = rules.roundRobinCursor ?? 0;
    const agent = eligible[cursor % eligible.length]!;

    if (row) {
      row.rules = { ...row.rules, roundRobinCursor: cursor + 1 };
      await this.routingRules.save(row);
    } else {
      await this.routingRules.save({
        tenantId,
        projectId: '',
        rules: { ...rules, roundRobinCursor: cursor + 1 },
        enabled: rules.enabled,
        updatedBy: null,
      });
    }

    return { agentId: agent.id, filterMeta };
  }
}

function rulesStrategyLabel(agingDays: number) {
  return agingDays >= 30 ? 'PARTNER_SCORE_AGING' : 'HOT_ROUND_ROBIN';
}
