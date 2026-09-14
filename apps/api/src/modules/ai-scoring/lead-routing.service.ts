import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { LeadEntity } from '../../database/entities/lead.entity';
import {
  CrmRoutingRuleEntity,
  type CrmRoutingRulesPayload,
} from '../../database/entities/crm-routing-rule.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_TENANT_DEMAND_POLICY } from '../crm/demand-policy.types';
import { hotFirstTouchDeadline, isBusinessTime } from '../crm/sla-calendar.util';
import { LeadConversionService } from './lead-conversion.service';

const DEFAULT_HOT_AGENT_ID = 'usr_agent_01';

const DEFAULT_ROUTING: CrmRoutingRulesPayload = {
  enabled: true,
  hotTierMinScore: 85,
  strategy: 'HOT_ROUND_ROBIN',
  assignOnTier: 'HOT',
  roundRobinCursor: 0,
};

@Injectable()
export class LeadRoutingService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CrmRoutingRuleEntity)
    private readonly routingRules: Repository<CrmRoutingRuleEntity>,
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

    const agentId = await this.pickAgentId(tenantId, rules, rulesRow ?? fallbackRow);
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

  private async pickAgentId(
    tenantId: string,
    rules: CrmRoutingRulesPayload,
    row: CrmRoutingRuleEntity | null,
  ) {
    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (agents.length === 0) {
      return DEFAULT_HOT_AGENT_ID;
    }

    const cursor = rules.roundRobinCursor ?? 0;
    const agent = agents[cursor % agents.length];

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

    return agent.id;
  }
}
