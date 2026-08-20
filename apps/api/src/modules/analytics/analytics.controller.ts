import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AnalyticsService } from './analytics.service';
import { AgentWauService } from './agent-wau.service';
import { DataIntelligenceService } from './data-intelligence.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly wau: AgentWauService,
    private readonly intelligence: DataIntelligenceService,
    private readonly config: ConfigService,
  ) {}

  /** UC-AN-01 · SCR-ADMIN-001 */
  @Get('admin/dashboard')
  adminDashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.analytics.getAdminDashboard(resolveTenantId(this.config, user, tenantHeader));
  }

  /** UC-AN-02 · SCR-ADMIN-003 */
  @Get('gmv')
  gmvReport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getGmvReport(
      resolveTenantId(this.config, user, tenantHeader),
      from,
      to,
    );
  }

  /** UC-AN-03 — developer absorption */
  @Get('absorption')
  absorptionReport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.analytics.getAbsorptionReport(
      resolveTenantId(this.config, user, tenantHeader),
      projectId,
    );
  }

  /** UC-AN-05 stub — developer absorption forecast */
  @Get('forecast')
  forecastReport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
    @Query('months') months?: string,
  ) {
    return this.analytics.getAbsorptionForecast(
      resolveTenantId(this.config, user, tenantHeader),
      projectId,
      months,
    );
  }

  /** UC-AN-04 — campaign attribution */
  @Get('attribution')
  attributionReport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getAttributionReport(
      resolveTenantId(this.config, user, tenantHeader),
      from,
      to,
    );
  }

  /** T5-S2 — agent WAU metrics */
  @Get('agent/wau')
  agentWau(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('days') daysRaw?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const days = daysRaw ? Number.parseInt(daysRaw, 10) : 7;
    return this.wau.getWauMetrics(tenantId, Number.isFinite(days) ? days : 7).then((data) => ({
      data,
      meta: { tenantId, uc: ['T5-S2', 'OP-WIN-09'], screen: 'SCR-ADMIN-001' },
    }));
  }

  /** Staging GTM — bulk WAU pilot activity (requires WAU_PILOT_SIM_ENABLED=true) */
  @Post('agent/wau/simulate')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  async simulateAgentWau(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { agents?: number },
  ) {
    if (this.config.get('WAU_PILOT_SIM_ENABLED', 'false') !== 'true') {
      throw new ForbiddenException({ detail: 'WAU pilot simulation disabled on this environment' });
    }
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const agents = body.agents ?? 100;
    const result = await this.wau.simulatePilotAgents(tenantId, agents);
    return { data: result, meta: { tenantId, uc: ['T5-S2'], screen: 'SCR-ADMIN-001' } };
  }

  /** T5-S5 — data intelligence heatmap */
  @Get('intelligence/heatmap')
  heatmap(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.intelligence.getHeatmap(
      resolveTenantId(this.config, user, tenantHeader),
      projectId?.trim() || undefined,
    );
  }

  @Get('intelligence/pricing-report/:projectId')
  pricingReport(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.intelligence.getPricingReport(
      resolveTenantId(this.config, user, tenantHeader),
      projectId.trim(),
    );
  }

  @Get('intelligence/market-brief')
  marketBrief(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.intelligence.getMarketBrief(resolveTenantId(this.config, user, tenantHeader));
  }

  /** T6 — data product billing entitlements */
  @Get('intelligence/billing')
  dataBilling(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.intelligence.getBillingSummary(resolveTenantId(this.config, user, tenantHeader));
  }

  /** T6 — ML-ready forecast (velocity-weighted) */
  @Get('forecast/ml')
  mlForecast(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
    @Query('months') months?: string,
  ) {
    return this.analytics.getMlAbsorptionForecast(
      resolveTenantId(this.config, user, tenantHeader),
      projectId,
      months,
    );
  }
}
