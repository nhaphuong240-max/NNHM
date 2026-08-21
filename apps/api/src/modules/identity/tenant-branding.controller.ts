import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './identity.types';
import { TenantBrandingService } from './tenant-branding.service';

@Controller('tenants/branding')
export class TenantBrandingController {
  constructor(
    private readonly branding: TenantBrandingService,
    private readonly config: ConfigService,
  ) {}

  /** P4 — public marketplace white-label (no auth) */
  @Public()
  @Get('public')
  getPublic(@Headers('x-tenant-id') tenantHeader: string | undefined) {
    return this.branding.getBrand(resolveTenantId(this.config, undefined, tenantHeader));
  }

  @Get()
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.branding.getBrand(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post()
  @HttpCode(200)
  update(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      displayName?: string;
      subdomain?: string;
      primaryColor?: string;
      accentColor?: string;
      logoUrl?: string;
      live?: boolean;
      whiteLabelTier?: 'STANDARD' | 'ENTERPRISE';
    },
  ) {
    return this.branding.updateBrand(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }
}
