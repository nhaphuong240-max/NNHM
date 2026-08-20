import { Controller, Get, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { OpsService } from './ops.service';

/** Authenticated twin of GET /ops/console — backlog "web + health". Not @Public. */
@Controller('health')
export class HealthOpsController {
  constructor(
    private readonly ops: OpsService,
    private readonly config: ConfigService,
  ) {}

  @Get('ops')
  opsSnapshot(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.ops.snapshot(resolveTenantId(this.config, user, tenantHeader));
  }
}
