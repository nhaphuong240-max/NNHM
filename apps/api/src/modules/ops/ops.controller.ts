import { Controller, Get, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { OpsService } from './ops.service';
import { OpsReadinessService } from './ops-readiness.service';

@Controller('ops')
export class OpsController {
  constructor(
    private readonly ops: OpsService,
    private readonly readiness: OpsReadinessService,
    private readonly config: ConfigService,
  ) {}

  /** OPS-S3-01 GET /ops/console — 4 widget snapshot */
  @Get('console')
  console(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.ops.snapshot(resolveTenantId(this.config, user, tenantHeader));
  }

  /** OPS-S6-01 — Grafana / on-call / incident drill readiness (G-OPS-4) */
  @Get('readiness')
  opsReadiness() {
    return this.readiness.snapshot();
  }
}
