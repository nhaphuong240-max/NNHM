import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { DsrPolygonEntity } from '../../database/entities/dsr-polygon.entity';
import { DsrShareLinkEntity } from '../../database/entities/dsr-share-link.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { ProductAnalyticsService } from '../analytics/product-analytics.service';

/** P1 FR-DSR-001 / FR-DSR-004 — public-safe masterplan + branded share links. */
@Injectable()
export class DsrService {
  constructor(
    @InjectRepository(DsrPolygonEntity)
    private readonly polygons: Repository<DsrPolygonEntity>,
    @InjectRepository(DsrShareLinkEntity)
    private readonly shares: Repository<DsrShareLinkEntity>,
    @InjectRepository(SearchIndexDocEntity)
    private readonly indexDocs: Repository<SearchIndexDocEntity>,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  async getMasterplan(tenantId: string, projectId: string) {
    const polys = await this.polygons.find({
      where: { tenantId, projectId },
      order: { sortOrder: 'ASC' },
    });
    const units = await this.indexDocs
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere("d.detail->>'projectId' = :projectId", { projectId })
      .take(120)
      .getMany();

    return {
      data: {
        projectId,
        polygons: polys.map((p) => ({
          id: p.id,
          level: p.level,
          refId: p.refId,
          label: p.label,
          geojson: p.geojson,
        })),
        units: units.map((u) => ({
          unitId: u.id,
          code: u.code,
          bedrooms: u.bedrooms,
          basePrice: Number(u.basePrice),
          status: u.detail.unitStatus,
          verificationLevel: u.verificationLevel,
          lat: u.latitude ? Number(u.latitude) : null,
          lng: u.longitude ? Number(u.longitude) : null,
        })),
      },
      meta: { publicSafe: true, holdOwnerMasked: true },
    };
  }

  /** Phase B — tower → floor → unit drill-down. */
  async getDrillDown(
    tenantId: string,
    projectId: string,
    towerRef?: string,
    floorRef?: string,
  ) {
    const polys = await this.polygons.find({
      where: { tenantId, projectId },
      order: { sortOrder: 'ASC' },
    });

    const breadcrumbs: { level: string; refId: string; label: string }[] = [
      { level: 'masterplan', refId: projectId, label: 'Masterplan' },
    ];

    let children = polys.filter((p) => p.level === 'tower');
    let units: SearchIndexDocEntity[] = [];

    if (towerRef?.trim()) {
      const tower = polys.find((p) => p.level === 'tower' && p.refId === towerRef.trim());
      if (tower) breadcrumbs.push({ level: 'tower', refId: tower.refId, label: tower.label });
      children = polys.filter(
        (p) => p.level === 'floor' && p.refId.startsWith(`${towerRef.trim()}:`),
      );
    }

    if (floorRef?.trim()) {
      const floor = polys.find((p) => p.level === 'floor' && p.refId === floorRef.trim());
      if (floor) breadcrumbs.push({ level: 'floor', refId: floor.refId, label: floor.label });

      const floorNumMatch = floorRef.match(/:f(\d+)$/);
      const floorNum = floorNumMatch ? Number.parseInt(floorNumMatch[1]!, 10) : null;

      const qb = this.indexDocs
        .createQueryBuilder('d')
        .where('d.tenant_id = :tenantId', { tenantId })
        .andWhere("d.detail->>'projectId' = :projectId", { projectId });

      if (floorNum !== null) {
        qb.andWhere('d.code LIKE :pat', { pat: `%${floorNum.toString().padStart(2, '0')}%` });
      }

      units = await qb.take(60).getMany();
      children = [];
    }

    const shareStats = await this.shareStats(tenantId, projectId);

    return {
      data: {
        projectId,
        breadcrumbs,
        children: children.map((p) => ({
          id: p.id,
          level: p.level,
          refId: p.refId,
          label: p.label,
          geojson: p.geojson,
        })),
        units: units.map((u) => ({
          unitId: u.id,
          code: u.code,
          bedrooms: u.bedrooms,
          basePrice: Number(u.basePrice),
          status: u.detail.unitStatus,
          verificationLevel: u.verificationLevel,
        })),
        shareStats,
      },
      meta: { publicSafe: true, phase: 'B' },
    };
  }

  async shareStats(tenantId: string, projectId?: string) {
    const qb = this.shares
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId });
    if (projectId?.trim()) {
      qb.andWhere('s.project_id = :projectId', { projectId: projectId.trim() });
    }
    const rows = await qb.getMany();
    return {
      linkCount: rows.length,
      totalOpens: rows.reduce((sum, r) => sum + r.openCount, 0),
    };
  }

  async createShareLink(
    tenantId: string,
    input: {
      unitId?: string;
      projectId?: string;
      leadId?: string;
      visitorId?: string;
      ttlHours?: number;
    },
  ) {
    const token = createHash('sha256')
      .update(`${tenantId}:${input.unitId ?? input.projectId}:${Date.now()}:${randomUUID()}`)
      .digest('hex')
      .slice(0, 32);
    const expiresAt = new Date(Date.now() + (input.ttlHours ?? 72) * 3600_000);
    const row = await this.shares.save({
      id: `sh_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      token,
      unitId: input.unitId ?? null,
      projectId: input.projectId ?? null,
      leadId: input.leadId ?? null,
      visitorId: input.visitorId ?? null,
      expiresAt,
      openCount: 0,
    });
    return {
      data: {
        token: row.token,
        url: `/public/share/${row.token}`,
        expiresAt: row.expiresAt.toISOString(),
      },
    };
  }

  async openShareLink(tenantId: string, token: string, visitorId?: string) {
    const row = await this.shares.findOne({ where: { tenantId, token } });
    if (!row) throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Share link not found');
    if (row.expiresAt < new Date()) {
      throwBusinessError(BusinessErrorCode.SHARE_LINK_EXPIRED, 'Share link expired');
    }
    row.openCount += 1;
    await this.shares.save(row);

    await this.analytics.track({
      tenantId,
      name: 'share_link_opened',
      source: 'dsr',
      visitorId,
      entityType: row.unitId ? 'unit' : 'project',
      entityId: row.unitId ?? row.projectId ?? undefined,
      payload: {
        token: token.slice(0, 8),
        openCount: row.openCount,
        leadId: row.leadId,
        projectId: row.projectId,
      },
    });

    return {
      data: {
        unitId: row.unitId,
        projectId: row.projectId,
        leadId: row.leadId,
        openCount: row.openCount,
        redirect: row.unitId ? `/public/units/${row.unitId}` : `/public/dsr/${row.projectId}`,
      },
      meta: { event: 'share_link_opened' },
    };
  }
}
