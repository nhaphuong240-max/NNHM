import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditService } from '../audit/audit.service';
import type { CreatePolicyInput, PolicyRecord, UpdatePolicyInput } from './commission.types';
import { validateSplitRules } from './commission.util';

function mapPolicy(row: CommissionPolicyEntity): PolicyRecord {
  return {
    id: row.id,
    attributes: {
      projectId: row.projectId,
      version: row.version,
      status: row.status,
      name: row.name,
      ratePercent: Number(row.ratePercent),
      baseType: row.baseType,
      splitRules: row.splitRules,
      effectiveFrom: row.effectiveFrom ?? undefined,
      effectiveTo: row.effectiveTo ?? undefined,
      publishedAt: row.publishedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

@Injectable()
export class CommissionPolicyService {
  constructor(
    @InjectRepository(CommissionPolicyEntity)
    private readonly policies: Repository<CommissionPolicyEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      module: 'commission',
      sprint: 'S5',
      ucs: ['UC-COM-01', 'UC-COM-02', 'UC-COM-03', 'UC-COM-04', 'UC-COM-05'],
      rule: 'BR-13 policy snapshot immutable',
    };
  }

  async list(tenantId: string, projectId?: string) {
    const where: Record<string, string> = { tenantId };
    if (projectId) where.projectId = projectId;

    const rows = await this.policies.find({
      where,
      order: { projectId: 'ASC', version: 'DESC' },
    });

    return { data: rows.map(mapPolicy), meta: { tenantId, count: rows.length } };
  }

  async get(tenantId: string, policyId: string) {
    const row = await this.policies.findOne({ where: { id: policyId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Policy ${policyId} not found` });
    return { data: mapPolicy(row) };
  }

  async getActivePublished(tenantId: string, projectId: string): Promise<CommissionPolicyEntity> {
    const rows = await this.policies.find({
      where: { tenantId, projectId, status: 'PUBLISHED' },
      order: { version: 'DESC' },
      take: 1,
    });
    const row = rows[0];
    if (!row) {
      throw new UnprocessableEntityException({
        detail: `No published commission policy for project ${projectId}`,
      });
    }
    return row;
  }

  async createDraft(tenantId: string, input: CreatePolicyInput, actorId?: string) {
    const project = await this.projects.findOne({ where: { id: input.projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${input.projectId} not found` });
    }

    if (!Number.isFinite(input.ratePercent) || input.ratePercent <= 0 || input.ratePercent > 100) {
      throw new UnprocessableEntityException({ detail: 'ratePercent must be between 0 and 100' });
    }

    try {
      validateSplitRules(input.splitRules);
    } catch (error) {
      throw new UnprocessableEntityException({
        detail: error instanceof Error ? error.message : 'Invalid split rules',
      });
    }

    const latestRows = await this.policies.find({
      where: { tenantId, projectId: input.projectId },
      order: { version: 'DESC' },
      take: 1,
    });
    const latest = latestRows[0];

    const draftExists = await this.policies.findOne({
      where: { tenantId, projectId: input.projectId, status: 'DRAFT' },
    });
    if (draftExists) {
      throw new ConflictException({
        detail: `Draft policy ${draftExists.id} already exists for project ${input.projectId}`,
      });
    }

    const version = (latest?.version ?? 0) + 1;
    const id = `cp_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const saved = await this.policies.save({
      id,
      tenantId,
      projectId: input.projectId,
      version,
      status: 'DRAFT',
      name: input.name,
      ratePercent: String(input.ratePercent),
      baseType: input.baseType ?? 'DEPOSIT',
      splitRules: input.splitRules,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      publishedAt: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'commission_policy',
      entityId: id,
      action: 'POLICY_DRAFT_CREATED',
      payload: { projectId: input.projectId, version },
      actorId: actorId ?? null,
    });

    return { data: mapPolicy(saved) };
  }

  async updateDraft(tenantId: string, policyId: string, input: UpdatePolicyInput, actorId?: string) {
    const row = await this.policies.findOne({ where: { id: policyId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Policy ${policyId} not found` });

    if (row.status !== 'DRAFT') {
      throw new ConflictException({ detail: 'Only DRAFT policies can be updated (immutable publish)' });
    }

    if (input.ratePercent !== undefined) {
      if (!Number.isFinite(input.ratePercent) || input.ratePercent <= 0 || input.ratePercent > 100) {
        throw new UnprocessableEntityException({ detail: 'ratePercent must be between 0 and 100' });
      }
      row.ratePercent = String(input.ratePercent);
    }

    if (input.splitRules) {
      try {
        validateSplitRules(input.splitRules);
      } catch (error) {
        throw new UnprocessableEntityException({
          detail: error instanceof Error ? error.message : 'Invalid split rules',
        });
      }
      row.splitRules = input.splitRules;
    }

    if (input.name !== undefined) row.name = input.name;
    if (input.baseType !== undefined) row.baseType = input.baseType;
    if (input.effectiveFrom !== undefined) row.effectiveFrom = input.effectiveFrom;
    if (input.effectiveTo !== undefined) row.effectiveTo = input.effectiveTo;

    const saved = await this.policies.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'commission_policy',
      entityId: policyId,
      action: 'POLICY_DRAFT_UPDATED',
      payload: { version: row.version },
      actorId: actorId ?? null,
    });

    return { data: mapPolicy(saved) };
  }

  /** S5-01 publish — frozen immutable version */
  async publish(tenantId: string, policyId: string, actorId?: string) {
    const row = await this.policies.findOne({ where: { id: policyId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Policy ${policyId} not found` });

    if (row.status !== 'DRAFT') {
      throw new ConflictException({ detail: 'Policy is already published' });
    }

    try {
      validateSplitRules(row.splitRules);
    } catch (error) {
      throw new UnprocessableEntityException({
        detail: error instanceof Error ? error.message : 'Invalid split rules',
      });
    }

    row.status = 'PUBLISHED';
    row.publishedAt = new Date();
    const saved = await this.policies.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'commission_policy',
      entityId: policyId,
      action: 'POLICY_PUBLISHED',
      payload: { projectId: row.projectId, version: row.version },
      actorId: actorId ?? null,
    });

    return { data: mapPolicy(saved) };
  }
}
