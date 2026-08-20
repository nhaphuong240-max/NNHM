import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { TenantService } from './tenant.service';
import type { CreateTenantInput } from './identity.types';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  /** Public list for login tenant picker — SCR-AUTH-001 */
  @Public()
  @Get()
  listPublic() {
    return this.tenants.listPublicTenants();
  }

  /** GET /tenants/{id} — tenant profile (JWT routes use same service via auth/me) */
  @Public()
  @Get(':tenantId')
  getOne(@Param('tenantId') tenantId: string) {
    return this.tenants.getTenant(tenantId);
  }

  /** S1-03 POST /tenants — UC-ID-01 onboarding stub */
  @Public()
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateTenantInput) {
    return this.tenants.createTenant(body);
  }
}
