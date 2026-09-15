import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { OptimisticLockVersionMismatchError, Repository } from 'typeorm';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { ListingService } from '../listing/listing.service';
import { SearchIndexService } from '../search/search-index.service';
import { StreamEventsService } from '../stream/stream-events.service';
import type {
  CreateProjectInput,
  ListUnitsQuery,
  ListUnitsResult,
  PatchUnitInput,
  ProductGraphFilters,
  ProductGraphResult,
  UnitImportCommitInput,
  UnitImportPreviewInput,
  UpdateProjectInput,
} from './golden-record.types';
import { mapProjectToApiRow } from './golden-record.types';
import { buildProductGraph, mapUnitToApiRow, parseBuildingCode } from './golden-record.types';
import { parseUnitImportCsv } from './gr-unit-import.util';
import {
  buildVersionHistoryFromAudit,
  snapshotAtTime,
  versionsToCsv,
} from './gr-time-travel.util';

@Injectable()
export class GoldenRecordService {
  constructor(
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
    private readonly searchIndex: SearchIndexService,
    private readonly listingService: ListingService,
  ) {}

  async listUnits(query: ListUnitsQuery): Promise<ListUnitsResult> {
    const limit = Math.min(query.limit ?? 100, 500);

    const qb = this.units
      .createQueryBuilder('unit')
      .where('unit.tenant_id = :tenantId', { tenantId: query.tenantId })
      .orderBy('unit.code', 'ASC')
      .take(limit);

    if (query.projectId) {
      qb.andWhere('unit.project_id = :projectId', { projectId: query.projectId });
    }

    if (query.status) {
      qb.andWhere('unit.status = :status', { status: query.status });
    }

    const rows = await qb.getMany();

    return {
      data: rows.map(mapUnitToApiRow),
      meta: {
        count: rows.length,
        tenantId: query.tenantId,
        projectId: query.projectId,
        source: 'postgres',
      },
    };
  }

  async getUnit(tenantId: string, unitId: string) {
    const unit = await this.units.findOne({ where: { id: unitId, tenantId } });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${unitId} not found` });
    }
    return { data: mapUnitToApiRow(unit) };
  }

  private assertDeveloperAdmin(actorRole?: string) {
    if (actorRole !== 'DEVELOPER_ADMIN') {
      throw new ForbiddenException({
        type: 'https://wereal.dev/problems/gr-project-forbidden',
        title: 'Project mutation forbidden',
        detail: 'Chỉ DEVELOPER_ADMIN (admin CĐT) được quản lý dự án Golden Record',
      });
    }
  }

  private slugifyProjectCode(code: string): string {
    const slug = code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24);
    return slug || 'new';
  }

  private async generateProjectId(tenantId: string, code: string): Promise<string> {
    const base = `prj_${this.slugifyProjectCode(code)}`;
    let id = base;
    let suffix = 0;
    while (await this.projects.findOne({ where: { id, tenantId } })) {
      suffix += 1;
      id = `${base}_${suffix}`;
    }
    return id;
  }

  private async assertUniqueProjectCode(
    tenantId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const existing = await this.projects
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('UPPER(p.code) = :code', { code: normalized })
      .getOne();
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        detail: `Mã dự án "${normalized}" đã tồn tại trong tenant`,
        code: normalized,
      });
    }
  }

  private async projectUnitCount(tenantId: string, projectId: string): Promise<number> {
    return this.units.count({ where: { tenantId, projectId } });
  }

  /** API-014 — list projects for developer portal */
  async listProjects(tenantId: string) {
    const rows = await this.projects.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
    const unitCounts = await Promise.all(
      rows.map((row) => this.projectUnitCount(tenantId, row.id)),
    );

    return {
      data: rows.map((row, index) => mapProjectToApiRow(row, unitCounts[index])),
      meta: {
        count: rows.length,
        tenantId,
        source: 'postgres',
        fr: 'FR-GR-01',
        screen: 'SCR-DEV-013',
      },
    };
  }

  /** API-016 — project detail */
  async getProject(tenantId: string, projectId: string) {
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }
    const unitCount = await this.projectUnitCount(tenantId, projectId);
    return {
      data: mapProjectToApiRow(project, unitCount),
      meta: { tenantId, projectId, fr: 'FR-GR-01' },
    };
  }

  /** API-015 — create project */
  async createProject(
    tenantId: string,
    input: CreateProjectInput,
    actorRole?: string,
    actorId?: string,
  ) {
    this.assertDeveloperAdmin(actorRole);

    const name = input.name?.trim();
    const code = input.code?.trim().toUpperCase();
    if (!name || !code) {
      throw new UnprocessableEntityException({ detail: 'name và code là bắt buộc' });
    }
    if (code.length > 32 || name.length > 255) {
      throw new UnprocessableEntityException({ detail: 'name hoặc code vượt giới hạn độ dài' });
    }

    await this.assertUniqueProjectCode(tenantId, code);

    const id = await this.generateProjectId(tenantId, code);
    const project = await this.projects.save({
      id,
      tenantId,
      code,
      name,
      city: input.city?.trim() || null,
      district: input.district?.trim() || null,
      latitude: input.latitude != null ? String(input.latitude) : null,
      longitude: input.longitude != null ? String(input.longitude) : null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'project',
      entityId: project.id,
      action: 'CREATE',
      payload: { code, name, city: project.city, district: project.district },
      actorId: actorId ?? null,
    });

    return {
      data: mapProjectToApiRow(project, 0),
      meta: { tenantId, fr: 'FR-GR-01', screen: 'SCR-DEV-013' },
    };
  }

  /** API-017 — update project */
  async updateProject(
    tenantId: string,
    projectId: string,
    input: UpdateProjectInput,
    actorRole?: string,
    actorId?: string,
  ) {
    this.assertDeveloperAdmin(actorRole);

    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const before = {
      code: project.code,
      name: project.name,
      city: project.city,
      district: project.district,
      latitude: project.latitude,
      longitude: project.longitude,
    };

    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();
      if (!code) throw new UnprocessableEntityException({ detail: 'code không được rỗng' });
      await this.assertUniqueProjectCode(tenantId, code, projectId);
      project.code = code;
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new UnprocessableEntityException({ detail: 'name không được rỗng' });
      project.name = name;
    }
    if (input.city !== undefined) project.city = input.city?.trim() || null;
    if (input.district !== undefined) project.district = input.district?.trim() || null;
    if (input.latitude !== undefined) {
      project.latitude = input.latitude != null ? String(input.latitude) : null;
    }
    if (input.longitude !== undefined) {
      project.longitude = input.longitude != null ? String(input.longitude) : null;
    }

    await this.projects.save(project);

    await this.audit.append({
      tenantId,
      entityType: 'project',
      entityId: project.id,
      action: 'PATCH',
      payload: { before, after: { ...before, ...input } },
      actorId: actorId ?? null,
    });

    const unitCount = await this.projectUnitCount(tenantId, projectId);
    return {
      data: mapProjectToApiRow(project, unitCount),
      meta: { tenantId, projectId, fr: 'FR-GR-01', screen: 'SCR-DEV-013' },
    };
  }

  /** API-018 — delete project (only when no units) */
  async deleteProject(
    tenantId: string,
    projectId: string,
    actorRole?: string,
    actorId?: string,
  ): Promise<void> {
    this.assertDeveloperAdmin(actorRole);

    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const unitCount = await this.projectUnitCount(tenantId, projectId);
    if (unitCount > 0) {
      throw new ConflictException({
        detail: `Không thể xóa dự án còn ${unitCount} căn trên bảng hàng`,
        projectId,
        unitCount,
      });
    }

    await this.projects.delete({ id: projectId, tenantId });

    await this.audit.append({
      tenantId,
      entityType: 'project',
      entityId: projectId,
      action: 'DELETE',
      payload: { code: project.code, name: project.name },
      actorId: actorId ?? null,
    });
  }

  /** UC-GR-04 / SCR-DEV-010 — Product Graph from GR units */
  async getProductGraph(
    tenantId: string,
    projectId: string,
    filters: ProductGraphFilters = {},
  ): Promise<{ data: ProductGraphResult; meta: Record<string, unknown> }> {
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const qb = this.units
      .createQueryBuilder('unit')
      .where('unit.tenant_id = :tenantId', { tenantId })
      .andWhere('unit.project_id = :projectId', { projectId })
      .orderBy('unit.code', 'ASC');

    if (filters.status) {
      qb.andWhere('unit.status = :status', { status: filters.status });
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere('unit.base_price >= :minPrice', { minPrice: String(filters.minPrice) });
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere('unit.base_price <= :maxPrice', { maxPrice: String(filters.maxPrice) });
    }

    let rows = await qb.getMany();

    if (filters.building?.trim()) {
      const building = filters.building.trim().toUpperCase();
      rows = rows.filter((u) => parseBuildingCode(u.code).toUpperCase() === building);
    }

    const graph = buildProductGraph(
      { id: project.id, code: project.code, name: project.name },
      rows,
    );

    return {
      data: graph,
      meta: {
        tenantId,
        projectId,
        unitCount: rows.length,
        filters: {
          building: filters.building ?? null,
          status: filters.status ?? null,
          minPrice: filters.minPrice ?? null,
          maxPrice: filters.maxPrice ?? null,
        },
        source: 'postgres',
        uc: 'UC-GR-04',
        screen: 'SCR-DEV-010',
      },
    };
  }

  /** S2-01 PATCH /units/{id} — optimistic lock via @VersionColumn */
  async patchUnit(
    tenantId: string,
    unitId: string,
    input: PatchUnitInput,
    actorId?: string,
    actorRole?: string,
  ) {
    if (input.basePrice !== undefined && actorRole && actorRole !== 'DEVELOPER_ADMIN') {
      throw new ForbiddenException({
        type: 'https://wereal.dev/problems/gr-price-forbidden',
        title: 'Price patch forbidden',
        detail: 'Chỉ DEVELOPER_ADMIN (admin CĐT) được PATCH giá Golden Record',
      });
    }

    const unit = await this.units.findOne({ where: { id: unitId, tenantId } });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${unitId} not found` });
    }

    if (unit.version !== input.expectedVersion) {
      throw new ConflictException({
        type: 'https://wereal.dev/problems/version-conflict',
        title: 'Version conflict',
        detail: 'expectedVersion does not match current unit version',
        expectedVersion: input.expectedVersion,
        currentVersion: unit.version,
      });
    }

    const before = {
      basePrice: unit.basePrice,
      status: unit.status,
      version: unit.version,
    };
    const previousStatus = unit.status;

    if (input.basePrice !== undefined) {
      unit.basePrice = String(input.basePrice);
    }
    if (input.status !== undefined) {
      unit.status = input.status;
    }

    try {
      const saved = await this.units.save(unit);

      await this.audit.append({
        tenantId,
        entityType: 'unit',
        entityId: unitId,
        action: 'PATCH',
        payload: {
          reason: input.reason,
          before,
          after: {
            basePrice: saved.basePrice,
            status: saved.status,
            version: saved.version,
          },
        },
        actorId: actorId ?? null,
      });

      if (input.status !== undefined && saved.status !== previousStatus) {
        await this.streamEvents.publishUnitStatus(tenantId, {
          unitId,
          status: saved.status,
          timestamp: new Date().toISOString(),
        });
      }

      if (input.basePrice !== undefined || input.status !== undefined) {
        await this.searchIndex.enqueue({
          tenantId,
          entityType: 'unit',
          entityId: unitId,
          operation: saved.status === 'SOLD' ? 'DELETE' : 'UPSERT',
          payload: { unitId },
        });
        await this.listingService.recheckPublishedDriftForUnit(tenantId, unitId, actorId);
      }

      return { data: mapUnitToApiRow(saved) };
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException({
          type: 'https://wereal.dev/problems/version-conflict',
          title: 'Version conflict',
          detail: 'Unit was modified by another transaction',
        });
      }
      throw error;
    }
  }

  /** UC-GR-06 / SCR-DEV-008 — bulk CSV preview with diff */
  async previewUnitImport(tenantId: string, input: UnitImportPreviewInput) {
    if (!input.projectId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'projectId is required' });
    }
    if (!input.csvText?.trim()) {
      throw new UnprocessableEntityException({ detail: 'csvText is required' });
    }

    const project = await this.projects.findOne({
      where: { id: input.projectId.trim(), tenantId },
    });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${input.projectId} not found` });
    }

    const existingRows = await this.units.find({
      where: { tenantId, projectId: input.projectId.trim() },
    });
    const existingByCode = new Map(existingRows.map((u) => [u.code.toUpperCase(), u]));

    const { rows, headers } = parseUnitImportCsv(input.csvText, {
      columnMap: input.columnMap,
      existingByCode,
    });

    return {
      data: { rows, headers },
      meta: {
        tenantId,
        projectId: input.projectId.trim(),
        total: rows.length,
        validCount: rows.filter((r) => r.valid).length,
        invalidCount: rows.filter((r) => !r.valid).length,
        createCount: rows.filter((r) => r.valid && r.diffAction === 'CREATE').length,
        updateCount: rows.filter((r) => r.valid && r.diffAction === 'UPDATE').length,
        unchangedCount: rows.filter((r) => r.valid && r.diffAction === 'UNCHANGED').length,
        uc: ['UC-GR-06'],
        screen: 'SCR-DEV-008',
      },
    };
  }

  /** UC-GR-06 — commit CREATE/UPDATE rows after preview */
  async commitUnitImport(tenantId: string, input: UnitImportCommitInput, actorId?: string) {
    if (!input.projectId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'projectId is required' });
    }
    if (!input.rows?.length) {
      throw new UnprocessableEntityException({ detail: 'rows must not be empty' });
    }

    const projectId = input.projectId.trim();
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const reason = input.reason?.trim() || 'Bulk import UC-GR-06';
    const created: ReturnType<typeof mapUnitToApiRow>[] = [];
    const updated: ReturnType<typeof mapUnitToApiRow>[] = [];
    const skipped: { code: string; reason: string }[] = [];

    await this.units.manager.transaction(async (em) => {
      const unitRepo = em.getRepository(UnitEntity);

      for (const row of input.rows) {
        const code = row.code.trim().toUpperCase();
        if (!code) {
          skipped.push({ code: row.code, reason: 'invalid_code' });
          continue;
        }

        const existing = await unitRepo.findOne({
          where: { tenantId, projectId, code },
        });

        if (row.diffAction === 'CREATE') {
          if (existing) {
            skipped.push({ code, reason: 'already_exists' });
            continue;
          }

          const saved = await unitRepo.save({
            id: `un_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
            tenantId,
            projectId,
            code,
            floor: row.floor,
            area: String(row.area),
            bedrooms: row.bedrooms,
            basePrice: String(Math.round(row.basePrice)),
            status: row.status,
          });

          await this.audit.append({
            tenantId,
            entityType: 'unit',
            entityId: saved.id,
            action: 'CREATE',
            payload: { reason, source: 'bulk_import', code },
            actorId: actorId ?? null,
          });

          await this.searchIndex.enqueue({
            tenantId,
            entityType: 'unit',
            entityId: saved.id,
            operation: 'UPSERT',
            payload: { unitId: saved.id },
          });

          created.push(mapUnitToApiRow(saved));
          continue;
        }

        if (row.diffAction === 'UPDATE') {
          if (!existing) {
            skipped.push({ code, reason: 'not_found' });
            continue;
          }

          const previousStatus = existing.status;
          existing.floor = row.floor;
          existing.area = String(row.area);
          existing.bedrooms = row.bedrooms;
          existing.basePrice = String(Math.round(row.basePrice));
          existing.status = row.status;

          const saved = await unitRepo.save(existing);

          await this.audit.append({
            tenantId,
            entityType: 'unit',
            entityId: saved.id,
            action: 'PATCH',
            payload: { reason, source: 'bulk_import', code },
            actorId: actorId ?? null,
          });

          if (saved.status !== previousStatus) {
            await this.streamEvents.publishUnitStatus(tenantId, {
              unitId: saved.id,
              status: saved.status,
              timestamp: new Date().toISOString(),
            });
          }

          await this.searchIndex.enqueue({
            tenantId,
            entityType: 'unit',
            entityId: saved.id,
            operation: saved.status === 'SOLD' ? 'DELETE' : 'UPSERT',
            payload: { unitId: saved.id },
          });

          updated.push(mapUnitToApiRow(saved));
        }
      }
    });

    await this.audit.append({
      tenantId,
      entityType: 'unit_import',
      entityId: projectId,
      action: 'IMPORT',
      payload: {
        reason,
        createdCount: created.length,
        updatedCount: updated.length,
        skippedCount: skipped.length,
      },
      actorId: actorId ?? null,
    });

    return {
      data: { created, updated },
      meta: {
        tenantId,
        projectId,
        createdCount: created.length,
        updatedCount: updated.length,
        skippedCount: skipped.length,
        skipped,
        uc: ['UC-GR-06'],
        screen: 'SCR-DEV-008',
      },
    };
  }

  /** UC-GR-05 / SCR-DEV-011 — version history from immutable audit trail */
  private async loadUnitVersionEntries(tenantId: string, unitId: string) {
    const unit = await this.units.findOne({ where: { id: unitId, tenantId } });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${unitId} not found` });
    }

    const events = await this.auditEvents.find({
      where: { tenantId, entityType: 'unit', entityId: unitId },
      order: { createdAt: 'ASC' },
    });

    const versions = buildVersionHistoryFromAudit(
      events.map((row) => ({
        id: String(row.id),
        action: row.action,
        payload: row.payload,
        actorId: row.actorId,
        createdAt: row.createdAt,
      })),
      unit,
    );

    return { unit, versions };
  }

  async getUnitVersions(tenantId: string, unitId: string) {
    const { unit, versions } = await this.loadUnitVersionEntries(tenantId, unitId);

    return {
      data: versions.map((row) => ({
        version: row.version,
        attributes: {
          basePrice: row.basePrice,
          status: row.status,
          changedAt: row.changedAt,
          changedBy: row.changedBy,
          reason: row.reason,
          action: row.action,
        },
      })),
      meta: {
        tenantId,
        unitId,
        unitCode: unit.code,
        count: versions.length,
        currentVersion: unit.version,
        uc: ['UC-GR-05'],
        screen: 'SCR-DEV-011',
        source: 'audit_events',
      },
    };
  }

  /** UC-GR-05 — point-in-time snapshot query */
  async getUnitSnapshotAt(tenantId: string, unitId: string, at: string) {
    if (!at?.trim()) {
      throw new UnprocessableEntityException({ detail: 'Query param `at` is required (ISO-8601)' });
    }

    const { unit, versions } = await this.loadUnitVersionEntries(tenantId, unitId);
    const snapshot = snapshotAtTime(versions, at.trim(), unit);
    if (!snapshot) {
      throw new NotFoundException({
        detail: `No snapshot for unit ${unitId} at ${at}`,
        unitId,
        at,
      });
    }

    return {
      data: {
        id: unitId,
        attributes: snapshot,
      },
      meta: {
        tenantId,
        unitId,
        unitCode: unit.code,
        at: at.trim(),
        uc: ['UC-GR-05'],
        screen: 'SCR-DEV-011',
        source: 'audit_replay',
      },
    };
  }

  /** UC-GR-05 — export version history CSV for dispute evidence */
  async exportUnitVersionsCsv(tenantId: string, unitId: string) {
    const { unit, versions } = await this.loadUnitVersionEntries(tenantId, unitId);
    const csv = versionsToCsv(unit.code, versions);
    return { csv, filename: `unit-${unit.code}-versions.csv` };
  }
}
