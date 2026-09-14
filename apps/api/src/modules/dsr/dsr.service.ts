import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import { DsrPolygonEntity } from '../../database/entities/dsr-polygon.entity';
import { DsrShareLinkEntity } from '../../database/entities/dsr-share-link.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';

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

  async openShareLink(tenantId: string, token: string) {
    const row = await this.shares.findOne({ where: { tenantId, token } });
    if (!row) throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Share link not found');
    if (row.expiresAt < new Date()) {
      throwBusinessError(BusinessErrorCode.SHARE_LINK_EXPIRED, 'Share link expired');
    }
    row.openCount += 1;
    await this.shares.save(row);
    return {
      data: {
        unitId: row.unitId,
        projectId: row.projectId,
        leadId: row.leadId,
        openCount: row.openCount,
        redirect: row.unitId ? `/public/units/${row.unitId}` : `/public/projects/${row.projectId}`,
      },
      meta: { event: 'share_link_opened' },
    };
  }
}
