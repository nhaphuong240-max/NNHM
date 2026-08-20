import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { LeadEntity } from '../../database/entities/lead.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { LeadConversionService } from './lead-conversion.service';

const DEFAULT_HOT_AGENT_ID = 'usr_agent_01';

@Injectable()
export class LeadRoutingService {
  private roundRobinIndex = 0;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
    private readonly conversion: LeadConversionService,
  ) {}

  /** UC-CRM-02 — HOT leads auto-assign to agent pool (demo round-robin) */
  async applyRouting(tenantId: string, lead: LeadEntity) {
    if (lead.tier !== 'HOT') {
      lead.routingStatus = 'PENDING';
      lead.assignedTo = null;
      return lead;
    }

    const agentId = await this.pickAgentId(tenantId);
    lead.assignedTo = agentId;
    lead.routingStatus = 'ASSIGNED';

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: lead.id,
      action: 'ROUTE',
      payload: {
        tier: lead.tier,
        score: lead.score,
        assignedTo: agentId,
        strategy: 'HOT_ROUND_ROBIN',
      },
      actorId: null,
    });

    await this.conversion.record(tenantId, lead.id, 'HOT_ROUTED', {
      assignedTo: agentId,
      score: lead.score,
    });

    return lead;
  }

  private async pickAgentId(tenantId: string) {
    const agents = await this.users.find({
      where: { tenantId, role: 'AGENT', isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (agents.length === 0) {
      return DEFAULT_HOT_AGENT_ID;
    }

    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex += 1;
    return agent.id;
  }
}
