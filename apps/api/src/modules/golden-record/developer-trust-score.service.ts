import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { DeveloperTrustScoreEntity } from '../../database/entities/developer-trust-score.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AntiDriftService } from '../listing/anti-drift.service';

export type TrustScoreRecord = {
  id: string;
  projectId: string;
  score: number;
  factors: DeveloperTrustScoreEntity['factors'];
  updatedAt: string;
};

@Injectable()
export class DeveloperTrustScoreService {
  constructor(
    @InjectRepository(DeveloperTrustScoreEntity)
    private readonly scores: Repository<DeveloperTrustScoreEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly audit: Repository<AuditEventEntity>,
    private readonly antiDrift: AntiDriftService,
  ) {}

  async computeForProject(tenantId: string, projectId: string): Promise<TrustScoreRecord> {
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const units = await this.units.find({ where: { tenantId, projectId } });
    const unitIds = units.map((u) => u.id);
    const listings =
      unitIds.length > 0
        ? await this.listings
            .createQueryBuilder('l')
            .where('l.tenant_id = :tenantId', { tenantId })
            .andWhere('l.unit_id IN (:...unitIds)', { unitIds })
            .getMany()
        : [];

    let driftChecks = 0;
    let driftBlocks = 0;
    for (const listing of listings) {
      const unit = units.find((u) => u.id === listing.unitId);
      if (!unit || listing.priceDisplay == null) continue;
      driftChecks += 1;
      const report = this.antiDrift.evaluate(unit, {
        priceDisplay: Number(listing.priceDisplay),
        areaDisplay: Number(unit.area),
      });
      if (report.status === 'BLOCK') driftBlocks += 1;
    }

    const published = listings.filter((l) => l.status === 'PUBLISHED');
    const verifiedCount = published.filter((l) => l.verified).length;
    const verifiedListingPct =
      published.length > 0 ? verifiedCount / published.length : 1;

    const auditCount = await this.audit
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.entity_type IN (:...types)', { types: ['unit', 'listing'] })
      .getCount();
    const auditCompleteness = Math.min(1, auditCount / Math.max(units.length * 2, 1));

    const versionAudits = await this.audit.count({
      where: { tenantId, entityType: 'unit', action: 'PATCH' },
    });
    const timeTravelCoverage =
      units.length > 0 ? Math.min(1, versionAudits / units.length) : 0;

    const driftBlockRate = driftChecks > 0 ? driftBlocks / driftChecks : 0;

    const factors = {
      driftBlockRate: Math.round(driftBlockRate * 1000) / 1000,
      verifiedListingPct: Math.round(verifiedListingPct * 1000) / 1000,
      auditCompleteness: Math.round(auditCompleteness * 1000) / 1000,
      timeTravelCoverage: Math.round(timeTravelCoverage * 1000) / 1000,
    };

    const score = Math.round(
      (1 - factors.driftBlockRate) * 30 +
        factors.verifiedListingPct * 30 +
        factors.auditCompleteness * 20 +
        factors.timeTravelCoverage * 20,
    );

    const existing = await this.scores.findOne({ where: { tenantId, projectId } });
    const saved = await this.scores.save({
      id: existing?.id ?? `dts_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      projectId,
      score,
      factors,
    });

    return {
      id: saved.id,
      projectId: saved.projectId,
      score: saved.score,
      factors: saved.factors,
      updatedAt: saved.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async getTrustScore(tenantId: string, projectId: string) {
    return this.computeForProject(tenantId, projectId);
  }

  async getLeaderboard(tenantId: string, limit = 10) {
    const projects = await this.projects.find({ where: { tenantId }, take: limit });
    const rows: TrustScoreRecord[] = [];
    for (const project of projects) {
      rows.push(await this.computeForProject(tenantId, project.id));
    }
    return rows.sort((a, b) => b.score - a.score);
  }
}
