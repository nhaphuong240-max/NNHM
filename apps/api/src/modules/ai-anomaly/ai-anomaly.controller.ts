import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { AiAnomalyService } from './ai-anomaly.service';
import type { AnomalyResolveInput } from './ai-anomaly.types';

@Controller('ai/anomalies')
export class AiAnomalyController {
  constructor(
    private readonly anomalies: AiAnomalyService,
    private readonly config: ConfigService,
  ) {}

  /** UC-AI-05 · SCR-ADMIN-002 — ops anomaly queue */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.anomalies.listAnomalies(resolveTenantId(this.config, user, tenantHeader));
  }

  /** T7-S7 — anomaly ops SLA dashboard */
  @Get('sla')
  slaDashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.anomalies.getSlaDashboard(resolveTenantId(this.config, user, tenantHeader));
  }

  /** UC-AI-05 — investigate & resolve / dismiss */
  @Post(':anomalyId/resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('anomalyId') anomalyId: string,
    @Body() body: AnomalyResolveInput,
  ) {
    return this.anomalies.resolveAnomaly(
      resolveTenantId(this.config, user, tenantHeader),
      anomalyId,
      body,
      user?.userId,
    );
  }
}
