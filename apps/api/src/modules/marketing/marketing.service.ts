import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { AgencyApplicationEntity } from '../../database/entities/agency-application.entity';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditService } from '../audit/audit.service';
import type {
  AgencyApplicationRecord,
  CreateDistributionPolicyInput,
  DistributionPolicyRecord,
  MarketplaceProjectRecord,
  ReviewApplicationInput,
  SubmitApplicationInput,
} from './marketing.types';

function mapPolicy(row: DistributionPolicyEntity): DistributionPolicyRecord {
  return {
    id: row.id,
    attributes: {
      tenantId: row.tenantId,
      projectId: row.projectId,
      version: row.version,
      status: row.status,
      name: row.name,
      terms: row.terms ?? {},
      publishedAt: row.publishedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

function mapApplication(
  row: AgencyApplicationEntity,
  extras?: { developerName?: string; agencyName?: string; projectName?: string },
): AgencyApplicationRecord {
  return {
    id: row.id,
    attributes: {
      developerTenantId: row.developerTenantId,
      agencyTenantId: row.agencyTenantId,
      projectId: row.projectId,
      distributionPolicyId: row.distributionPolicyId,
      status: row.status,
      message: row.message ?? undefined,
      reviewNotes: row.reviewNotes ?? undefined,
      reviewedBy: row.reviewedBy ?? undefined,
      reviewedAt: row.reviewedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      developerName: extras?.developerName,
      agencyName: extras?.agencyName,
      projectName: extras?.projectName,
    },
  };
}

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(DistributionPolicyEntity)
    private readonly policies: Repository<DistributionPolicyEntity>,
    @InjectRepository(AgencyApplicationEntity)
    private readonly applications: Repository<AgencyApplicationEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      module: 'marketing',
      ucs: ['UC-MKT-01', 'UC-MKT-02'],
      rules: ['BR-19'],
      screens: ['SCR-DEV-distribution', 'SCR-AGENT-marketplace-apply'],
    };
  }

  async listPolicies(tenantId: string, projectId?: string) {
    const where: Record<string, string> = { tenantId };
    if (projectId?.trim()) where.projectId = projectId.trim();

    const rows = await this.policies.find({
      where,
      order: { projectId: 'ASC', version: 'DESC' },
    });

    return { data: rows.map(mapPolicy), meta: { tenantId, count: rows.length } };
  }

  async createPolicy(tenantId: string, input: CreateDistributionPolicyInput, actorId?: string) {
    const project = await this.projects.findOne({
      where: { id: input.projectId.trim(), tenantId },
    });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${input.projectId} not found for tenant` });
    }

    const latest = await this.policies.findOne({
      where: { tenantId, projectId: project.id },
      order: { version: 'DESC' },
    });
    const version = (latest?.version ?? 0) + 1;

    const row = await this.policies.save({
      id: `dp_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      tenantId,
      projectId: project.id,
      version,
      status: 'DRAFT',
      name: input.name.trim(),
      terms: input.terms ?? {},
      publishedAt: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'distribution_policy',
      entityId: row.id,
      action: 'DISTRIBUTION_POLICY_DRAFT',
      payload: { projectId: row.projectId, version: row.version },
      actorId: actorId ?? null,
    });

    return { data: mapPolicy(row) };
  }

  async publishPolicy(tenantId: string, policyId: string, actorId?: string) {
    const row = await this.policies.findOne({ where: { id: policyId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Distribution policy ${policyId} not found` });
    }
    if (row.status === 'PUBLISHED') {
      return { data: mapPolicy(row), meta: { idempotentReplay: true } };
    }

    row.status = 'PUBLISHED';
    row.publishedAt = new Date();
    await this.policies.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'distribution_policy',
      entityId: row.id,
      action: 'DISTRIBUTION_POLICY_PUBLISHED',
      payload: { projectId: row.projectId, version: row.version },
      actorId: actorId ?? null,
    });

    return { data: mapPolicy(row) };
  }

  /** UC-MKT-02 — agency browses published projects across developer tenants */
  async listMarketplaceProjects(agencyTenantId: string) {
    await this.assertAgencyTenant(agencyTenantId);

    const published = await this.policies.find({
      where: { status: 'PUBLISHED' },
      order: { publishedAt: 'DESC' },
    });
    if (published.length === 0) {
      return { data: [] as MarketplaceProjectRecord[], meta: { agencyTenantId, count: 0 } };
    }

    const projectIds = [...new Set(published.map((p) => p.projectId))];
    const devTenantIds = [...new Set(published.map((p) => p.tenantId))];

    const [projects, tenants, existingApps] = await Promise.all([
      this.projects.find({ where: { id: In(projectIds) } }),
      this.tenants.find({ where: { id: In(devTenantIds) } }),
      this.applications.find({ where: { agencyTenantId } }),
    ]);

    const projectById = new Map(projects.map((p) => [p.id, p]));
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const appByProject = new Map(existingApps.map((a) => [a.projectId, a]));

    const data: MarketplaceProjectRecord[] = [];
    const seenProjects = new Set<string>();

    for (const policy of published) {
      const key = `${policy.tenantId}:${policy.projectId}`;
      if (seenProjects.has(key)) continue;
      seenProjects.add(key);

      const project = projectById.get(policy.projectId);
      const developer = tenantById.get(policy.tenantId);
      if (!project || !developer) continue;

      const app = appByProject.get(policy.projectId);
      data.push({
        developerTenantId: policy.tenantId,
        developerName: developer.name,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        distributionPolicyId: policy.id,
        policyName: policy.name,
        terms: policy.terms ?? {},
        publishedAt: policy.publishedAt?.toISOString(),
        applicationStatus: app?.developerTenantId === policy.tenantId ? app.status : null,
      });
    }

    return { data, meta: { agencyTenantId, count: data.length } };
  }

  async submitApplication(agencyTenantId: string, input: SubmitApplicationInput, actorId?: string) {
    await this.assertAgencyTenant(agencyTenantId);

    const policy = await this.policies.findOne({
      where: {
        id: input.distributionPolicyId.trim(),
        tenantId: input.developerTenantId.trim(),
        projectId: input.projectId.trim(),
        status: 'PUBLISHED',
      },
    });
    if (!policy) {
      throw new UnprocessableEntityException({
        detail: 'Distribution policy not published or project mismatch (BR-19)',
      });
    }

    const existing = await this.applications.findOne({
      where: {
        agencyTenantId,
        projectId: policy.projectId,
        distributionPolicyId: policy.id,
      },
    });
    if (existing) {
      return {
        data: mapApplication(existing),
        meta: { idempotentReplay: true },
      };
    }

    const row = await this.applications.save({
      id: `aa_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      developerTenantId: policy.tenantId,
      agencyTenantId,
      projectId: policy.projectId,
      distributionPolicyId: policy.id,
      status: 'PENDING',
      message: input.message?.trim() || null,
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
    });

    await this.audit.append({
      tenantId: agencyTenantId,
      entityType: 'agency_application',
      entityId: row.id,
      action: 'AGENCY_APPLY_SUBMITTED',
      payload: {
        developerTenantId: row.developerTenantId,
        projectId: row.projectId,
        distributionPolicyId: row.distributionPolicyId,
      },
      actorId: actorId ?? null,
    });

    return { data: mapApplication(row) };
  }

  async listApplications(
    tenantId: string,
    tenantType: string | undefined,
    status?: string,
  ) {
    const where: Record<string, string> = {};
    if (tenantType === 'AGENCY') {
      where.agencyTenantId = tenantId;
    } else {
      where.developerTenantId = tenantId;
    }
    if (status?.trim()) where.status = status.trim();

    const rows = await this.applications.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const devIds = [...new Set(rows.map((r) => r.developerTenantId))];
    const agencyIds = [...new Set(rows.map((r) => r.agencyTenantId))];
    const projectIds = [...new Set(rows.map((r) => r.projectId))];

    const [devTenants, agencyTenants, projects] = await Promise.all([
      this.tenants.find({ where: { id: In(devIds) } }),
      this.tenants.find({ where: { id: In(agencyIds) } }),
      this.projects.find({ where: { id: In(projectIds) } }),
    ]);

    const devById = new Map(devTenants.map((t) => [t.id, t.name]));
    const agencyById = new Map(agencyTenants.map((t) => [t.id, t.name]));
    const projectById = new Map(projects.map((p) => [p.id, p.name]));

    return {
      data: rows.map((row) =>
        mapApplication(row, {
          developerName: devById.get(row.developerTenantId),
          agencyName: agencyById.get(row.agencyTenantId),
          projectName: projectById.get(row.projectId),
        }),
      ),
      meta: { tenantId, count: rows.length },
    };
  }

  async reviewApplication(
    developerTenantId: string,
    applicationId: string,
    input: ReviewApplicationInput,
    actorId?: string,
  ) {
    const row = await this.applications.findOne({
      where: { id: applicationId, developerTenantId },
    });
    if (!row) {
      throw new NotFoundException({ detail: `Application ${applicationId} not found` });
    }
    if (row.status !== 'PENDING') {
      return {
        data: mapApplication(row),
        meta: { idempotentReplay: true },
      };
    }

    row.status = input.status;
    row.reviewNotes = input.reviewNotes?.trim() || null;
    row.reviewedBy = actorId ?? null;
    row.reviewedAt = new Date();
    await this.applications.save(row);

    await this.audit.append({
      tenantId: developerTenantId,
      entityType: 'agency_application',
      entityId: row.id,
      action: input.status === 'APPROVED' ? 'AGENCY_APPLY_APPROVED' : 'AGENCY_APPLY_REJECTED',
      payload: {
        agencyTenantId: row.agencyTenantId,
        projectId: row.projectId,
        reviewNotes: row.reviewNotes,
      },
      actorId: actorId ?? null,
    });

    return { data: mapApplication(row) };
  }

  async isAgencyApproved(
    agencyTenantId: string,
    developerTenantId: string,
    projectId: string,
  ): Promise<boolean> {
    const approved = await this.applications.findOne({
      where: {
        agencyTenantId,
        developerTenantId,
        projectId,
        status: 'APPROVED',
      },
    });
    return Boolean(approved);
  }

  private async assertAgencyTenant(tenantId: string) {
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.type !== 'AGENCY') {
      throw new UnprocessableEntityException({
        detail: 'Marketplace apply requires an AGENCY tenant context',
      });
    }
  }
}
