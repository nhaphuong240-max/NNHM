import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DemandPolicyService } from './demand-policy.service';
import type { TenantDemandPolicyPatch } from './demand-policy.types';

@Controller('crm/demand-policy')
export class CrmDemandPolicyController {
  constructor(
    private readonly policy: DemandPolicyService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.policy.getPolicy(resolveTenantId(this.config, user, tenantHeader));
  }

  @Patch()
  patch(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: TenantDemandPolicyPatch,
  ) {
    return this.policy.patchPolicy(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }
}
