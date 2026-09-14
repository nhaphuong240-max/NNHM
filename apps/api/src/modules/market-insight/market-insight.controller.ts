import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { LocalityInsightService } from './locality-insight.service';

@Controller('market')
export class MarketInsightController {
  constructor(
    private readonly insights: LocalityInsightService,
    private readonly config: ConfigService,
  ) {}

  /** P2 FR-MI-002 — all indexed districts */
  @Public()
  @Get('locality')
  listLocalities(@Headers('x-tenant-id') tenantHeader?: string) {
    return this.insights.listDistrictInsights(
      resolveTenantId(this.config, undefined, tenantHeader),
    );
  }

  /** P2 FR-MI-002 — insight by district name (before :slug) */
  @Public()
  @Get('locality/district/:district')
  byDistrict(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('district') district: string,
    @Query('city') city?: string,
  ) {
    return this.insights.insightByDistrict(
      resolveTenantId(this.config, undefined, tenantHeader),
      decodeURIComponent(district),
      city,
    );
  }

  /** P2 FR-MI-002 — insight by geo slug */
  @Public()
  @Get('locality/:slug')
  bySlug(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('slug') slug: string,
  ) {
    return this.insights.insightBySlug(
      resolveTenantId(this.config, undefined, tenantHeader),
      slug,
    );
  }
}
