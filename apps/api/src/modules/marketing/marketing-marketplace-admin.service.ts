import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { AgencyApplicationEntity } from '../../database/entities/agency-application.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { AuditService } from '../audit/audit.service';
import { computeSlaBucket } from '../crm/crm-sla.util';
import {
  computeMarketplaceRankings,
  type MarketplacePenaltyInput,
} from './marketing-marketplace-admin.util';

@Injectable()
export class MarketingMarketplaceAdminService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(AgencyApplicationEntity)
    private readonly applications: Repository<AgencyApplicationEntity>,
    @InjectRepository(DistributionPolicyEntity)
    private readonly policies: Repository<DistributionPolicyEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-MKT-04 · SCR-ADMIN-015 */
  async getRankings(platformTenantId: string) {
    const agencies = await this.tenants.find({
      where: { type: 'AGENCY' },
      take: 20,
    });

    const penalties = await this.loadPenalties(platformTenantId);
    const appeals = await this.loadAppeals(platformTenantId);

    const rows = await Promise.all(
      agencies.map(async (agency) => {
        const agencyLeads = await this.leads.find({
          where: { tenantId: platformTenantId },
          take: 50,
        });
        const tracked = agencyLeads.filter((l) => computeSlaBucket(l) !== null);
        const overdue = tracked.filter((l) => computeSlaBucket(l) === 'overdue').length;
        const slaScore = tracked.length
          ? Math.round(((tracked.length - overdue) / tracked.length) * 100)
          : 85;

        const openApplications = await this.applications.count({
          where: { agencyTenantId: agency.id, status: 'PENDING' as never },
        });

        return {
          tenantId: agency.id,
          name: agency.name,
          slaScore,
          penaltyPoints: penalties.get(agency.id) ?? 0,
          openApplications,
          appealStatus: (appeals.get(agency.id) ?? 'NONE') as 'NONE' | 'OPEN' | 'APPROVED',
        };
      }),
    );

    const rankings = computeMarketplaceRankings(rows);

    return {
      data: rankings,
      meta: {
        tenantId: platformTenantId,
        count: rankings.length,
        uc: ['UC-MKT-04'],
        screen: 'SCR-ADMIN-015',
      },
    };
  }

  async applyPenalty(
    platformTenantId: string,
    input: MarketplacePenaltyInput,
    actorId?: string,
  ) {
    const current = (await this.loadPenalties(platformTenantId)).get(input.agencyTenantId) ?? 0;
    const next = current + input.points;

    await this.audit.append({
      tenantId: platformTenantId,
      entityType: 'marketplace_penalty',
      entityId: input.agencyTenantId,
      action: 'APPLY',
      payload: { points: input.points, total: next, reason: input.reason.trim() },
      actorId: actorId ?? null,
    });

    return this.getRankings(platformTenantId);
  }

  async submitAppeal(
    platformTenantId: string,
    agencyTenantId: string,
    input: { note?: string },
    actorId?: string,
  ) {
    await this.audit.append({
      tenantId: platformTenantId,
      entityType: 'marketplace_appeal',
      entityId: agencyTenantId,
      action: 'OPEN',
      payload: { note: input.note?.trim() || 'Agency appeal submitted' },
      actorId: actorId ?? null,
    });

    return this.getRankings(platformTenantId);
  }

  /** T5-S7 — cross-anchor agency distribution */
  async getCrossAnchorDistribution(platformTenantId: string) {
    const policies = await this.policies.find({
      where: { tenantId: platformTenantId, status: 'PUBLISHED' },
      take: 20,
    });

    const approvedApps = await this.applications.find({
      where: { status: 'APPROVED' as never },
      take: 50,
    });

    const agencyProjects = new Map<string, Set<string>>();
    for (const app of approvedApps) {
      const set = agencyProjects.get(app.agencyTenantId) ?? new Set<string>();
      set.add(app.projectId);
      agencyProjects.set(app.agencyTenantId, set);
    }

    const crossAnchor = [...agencyProjects.entries()]
      .filter(([, projects]) => projects.size >= 2)
      .map(([agencyTenantId, projects]) => ({
        agencyTenantId,
        projectIds: [...projects],
        anchorCount: projects.size,
      }));

    const policyCrossLinks = policies
      .filter((p) => (p.terms?.crossAnchorProjectIds?.length ?? 0) > 0)
      .map((p) => ({
        policyId: p.id,
        projectId: p.projectId,
        crossAnchorProjectIds: p.terms.crossAnchorProjectIds ?? [],
      }));

    return {
      data: {
        crossAnchorAgencies: crossAnchor,
        policyCrossLinks,
        marketplaceRankingLive: true,
      },
      meta: {
        tenantId: platformTenantId,
        uc: ['T5-S7', 'UC-MKT-04'],
        screen: 'SCR-ADMIN-015',
      },
    };
  }

  private async loadPenalties(tenantId: string) {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'marketplace_penalty' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (map.has(row.entityId)) continue;
      const payload = (row.payload ?? {}) as { total?: number };
      map.set(row.entityId, Number(payload.total ?? 0));
    }
    return map;
  }

  private async loadAppeals(tenantId: string) {
    const rows = await this.auditEvents.find({
      where: { tenantId, entityType: 'marketplace_appeal' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const map = new Map<string, 'OPEN' | 'APPROVED'>();
    for (const row of rows) {
      if (map.has(row.entityId)) continue;
      map.set(row.entityId, row.action === 'APPROVED' ? 'APPROVED' : 'OPEN');
    }
    return map;
  }
}
