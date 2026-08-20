import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';

export type RoutingStrategy = 'HOT_ROUND_ROBIN';

export type RoutingRules = {
  enabled: boolean;
  hotTierMinScore: number;
  strategy: RoutingStrategy;
  assignOnTier: 'HOT';
};

const DEFAULT_RULES: RoutingRules = {
  enabled: true,
  hotTierMinScore: 85,
  strategy: 'HOT_ROUND_ROBIN',
  assignOnTier: 'HOT',
};

@Injectable()
export class CrmRoutingService {
  private rulesByTenant = new Map<string, RoutingRules>();

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
  ) {}

  private rulesFor(tenantId: string): RoutingRules {
    return this.rulesByTenant.get(tenantId) ?? { ...DEFAULT_RULES };
  }

  async getRules(tenantId: string) {
    const rules = this.rulesFor(tenantId);
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
          })),
        },
      },
      meta: { tenantId, uc: 'UC-CRM-02', screen: 'SCR-AGENT-015' },
    };
  }

  async patchRules(
    tenantId: string,
    patch: Partial<RoutingRules>,
    actorId?: string,
  ) {
    const current = this.rulesFor(tenantId);
    const next: RoutingRules = {
      ...current,
      ...patch,
      strategy: 'HOT_ROUND_ROBIN',
      assignOnTier: 'HOT',
    };

    if (next.hotTierMinScore < 50 || next.hotTierMinScore > 100) {
      next.hotTierMinScore = DEFAULT_RULES.hotTierMinScore;
    }

    this.rulesByTenant.set(tenantId, next);

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
}
