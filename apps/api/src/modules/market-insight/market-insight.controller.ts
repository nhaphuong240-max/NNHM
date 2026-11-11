import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { requireHostTenant } from '../../common/resolve-tenant-from-host';
import { assertHeaderMatches } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { LocalityInsightService } from './locality-insight.service';

@Controller('market')
export class MarketInsightController {
  constructor(
    private readonly insights: LocalityInsightService,
    private readonly dataSource: DataSource,
  ) {}

  private hostTenant(header: string | undefined, host: string | undefined): string {
    const tenantId = requireHostTenant(host);
    assertHeaderMatches(header, tenantId);
    return tenantId;
  }

  /** P2 FR-MI-002 — all indexed districts */
  @Public()
  @Get('locality')
  listLocalities(
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('host') host?: string,
  ) {
    return this.insights.listDistrictInsights(this.hostTenant(tenantHeader, host));
  }

  /** P2 FR-MI-002 — insight by district name (before :slug) */
  @Public()
  @Get('locality/district/:district')
  byDistrict(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Param('district') district: string,
    @Query('city') city?: string,
  ) {
    return this.insights.insightByDistrict(
      this.hostTenant(tenantHeader, host),
      decodeURIComponent(district),
      city,
    );
  }

  /** P2 FR-MI-002 — insight by geo slug */
  @Public()
  @Get('locality/:slug')
  async bySlug(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('slug') slug: string,
  ) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'area_slug', slug, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    return this.insights.insightBySlug(tenantId, slug);
  }
}
