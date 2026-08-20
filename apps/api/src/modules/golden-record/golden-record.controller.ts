import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { UnitEntity } from '../../database/entities/unit.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { GoldenRecordService } from './golden-record.service';
import type { PatchUnitInput, UnitImportCommitInput, UnitImportPreviewInput } from './golden-record.types';

@Controller('units')
export class GoldenRecordController {
  constructor(
    private readonly gr: GoldenRecordService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: UnitEntity['status'],
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.gr.listUnits({
      tenantId: resolveTenantId(this.config, user, tenantHeader),
      projectId: projectId?.trim() || undefined,
      status,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** UC-GR-06 — bulk import preview (SCR-DEV-008) */
  @Post('import/preview')
  @HttpCode(200)
  previewImport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: UnitImportPreviewInput,
  ) {
    return this.gr.previewUnitImport(resolveTenantId(this.config, user, tenantHeader), body);
  }

  /** UC-GR-06 — commit bulk import */
  @Post('import/commit')
  @HttpCode(201)
  commitImport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: UnitImportCommitInput,
  ) {
    return this.gr.commitUnitImport(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Get(':unitId/versions/export.csv')
  async exportVersions(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { csv, filename } = await this.gr.exportUnitVersionsCsv(
      resolveTenantId(this.config, user, tenantHeader),
      unitId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  /** UC-GR-05 / SCR-DEV-011 — point-in-time snapshot */
  @Get(':unitId/snapshot')
  snapshotAt(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
    @Query('at') at?: string,
  ) {
    return this.gr.getUnitSnapshotAt(resolveTenantId(this.config, user, tenantHeader), unitId, at ?? '');
  }

  /** UC-GR-05 / API-029 — immutable version history */
  @Get(':unitId/versions')
  versions(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.gr.getUnitVersions(resolveTenantId(this.config, user, tenantHeader), unitId);
  }

  @Get(':unitId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
  ) {
    return this.gr.getUnit(resolveTenantId(this.config, user, tenantHeader), unitId);
  }

  @Patch(':unitId')
  patch(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('unitId') unitId: string,
    @Body() body: PatchUnitInput,
  ) {
    return this.gr.patchUnit(
      resolveTenantId(this.config, user, tenantHeader),
      unitId,
      body,
      user?.userId,
      user?.role,
    );
  }
}
