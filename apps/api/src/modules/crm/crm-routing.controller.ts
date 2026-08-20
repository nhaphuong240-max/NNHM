import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { CrmRoutingService, type RoutingRules } from './crm-routing.service';

@Controller('crm/routing-rules')
export class CrmRoutingController {
  constructor(
    private readonly routing: CrmRoutingService,
    private readonly config: ConfigService,
  ) {}

  /** UC-CRM-02 · SCR-AGENT-015 */
  @Get()
  getRules(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.routing.getRules(resolveTenantId(this.config, user, tenantHeader));
  }

  @Patch()
  patchRules(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: Partial<RoutingRules>,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.routing.patchRules(tenantId, body, user?.userId);
  }
}
