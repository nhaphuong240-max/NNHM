import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { UnitEntity } from '../../database/entities/unit.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { GoldenRecordService } from './golden-record.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly gr: GoldenRecordService,
    private readonly config: ConfigService,
  ) {}

  /** UC-GR-04 — Product Graph: Project → Building → Floor → Unit */
  @Get(':projectId/graph')
  graph(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
    @Query('building') building?: string,
    @Query('status') status?: UnitEntity['status'],
    @Query('minPrice') minPriceRaw?: string,
    @Query('maxPrice') maxPriceRaw?: string,
  ) {
    const minPrice = minPriceRaw ? Number.parseInt(minPriceRaw, 10) : undefined;
    const maxPrice = maxPriceRaw ? Number.parseInt(maxPriceRaw, 10) : undefined;

    return this.gr.getProductGraph(resolveTenantId(this.config, user, tenantHeader), projectId.trim(), {
      building: building?.trim() || undefined,
      status,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    });
  }
}
