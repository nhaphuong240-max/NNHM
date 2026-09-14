import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrmRoutingRuleEntity,
  type CrmRoutingRulesPayload,
} from '../../database/entities/crm-routing-rule.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';

export type RoutingStrategy = 'HOT_ROUND_ROBIN';

export type RoutingRules = {
  enabled: boolean;
  hotTierMinScore: number;
  strategy: RoutingStrategy;
  assignOnTier: 'HOT';
  maxOpenLeads?: number;
  skillTags?: string[];
};

const DEFAULT_RULES: RoutingRules = {
  enabled: true,
  hotTierMinScore: 85,
  strategy: 'HOT_ROUND_ROBIN',
  assignOnTier: 'HOT',
};

@Injectable()
export class CrmRoutingService {
  constructor(
    @InjectRepository(CrmRoutingRuleEntity)
    private readonly ruleRows: Repository<CrmRoutingRuleEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
  ) {}

  private toPayload(rules: RoutingRules): CrmRoutingRulesPayload {
    return {
      enabled: rules.enabled,
      hotTierMinScore: rules.hotTierMinScore,
      strategy: 'HOT_ROUND_ROBIN',
      assignOnTier: 'HOT',
      maxOpenLeads: rules.maxOpenLeads,
      skillTags: rules.skillTags,
    };
  }

  private fromPayload(payload: CrmRoutingRulesPayload): RoutingRules {
    return {
      enabled: payload.enabled,
      hotTierMinScore: payload.hotTierMinScore,
      strategy: 'HOT_ROUND_ROBIN',
      assignOnTier: 'HOT',
      maxOpenLeads: payload.maxOpenLeads,
      skillTags: payload.skillTags,
    };
  }

  async rulesFor(tenantId: string, projectId = ''): Promise<RoutingRules & { roundRobinCursor: number }> {
    const row = await this.ruleRows.findOne({ where: { tenantId, projectId } });
    if (!row) {
      return { ...DEFAULT_RULES, roundRobinCursor: 0 };
    }
    const rules = this.fromPayload(row.rules);
    return { ...rules, roundRobinCursor: row.rules.roundRobinCursor ?? 0 };
  }

  async getRules(tenantId: string) {
    const rules = await this.rulesFor(tenantId);
    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { email: 'ASC' },
    });

    return {
      data: {
        attributes: {
          ...rules,
          agentPool: agents.map((a) => ({
            id: a.id,
            email: a.email,
            role: a.role,
            organizationId: a.organizationId,
          })),
        },
      },
      meta: { tenantId, uc: 'UC-CRM-02', screen: 'SCR-AGENT-015', persisted: true },
    };
  }

  async patchRules(
    tenantId: string,
    patch: Partial<RoutingRules>,
    actorId?: string,
    projectId = '',
  ) {
    const current = await this.rulesFor(tenantId, projectId);
    const next: RoutingRules = {
      ...current,
      ...patch,
      strategy: 'HOT_ROUND_ROBIN',
      assignOnTier: 'HOT',
    };

    if (next.hotTierMinScore < 50 || next.hotTierMinScore > 100) {
      next.hotTierMinScore = DEFAULT_RULES.hotTierMinScore;
    }

    const existing = await this.ruleRows.findOne({ where: { tenantId, projectId } });
    const payload = this.toPayload(next);
    payload.roundRobinCursor = existing?.rules.roundRobinCursor ?? 0;

    await this.ruleRows.save({
      tenantId,
      projectId,
      rules: payload,
      enabled: next.enabled,
      updatedBy: actorId ?? null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'crm_routing',
      entityId: tenantId,
      action: 'PATCH_RULES',
      actorId: actorId ?? null,
      payload: { before: current, after: next },
    });

    return this.getRules(tenantId);
  }

  async advanceRoundRobin(tenantId: string, projectId = ''): Promise<number> {
    const row = await this.ruleRows.findOne({ where: { tenantId, projectId } });
    if (!row) return 0;
    const cursor = (row.rules.roundRobinCursor ?? 0) + 1;
    row.rules = { ...row.rules, roundRobinCursor: cursor };
    await this.ruleRows.save(row);
    return cursor;
  }
}
