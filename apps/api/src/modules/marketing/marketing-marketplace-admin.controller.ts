import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { MarketingMarketplaceAdminService } from './marketing-marketplace-admin.service';

@Controller('marketing/marketplace/admin')
export class MarketingMarketplaceAdminController {
  constructor(
    private readonly admin: MarketingMarketplaceAdminService,
    private readonly config: ConfigService,
  ) {}

  /** UC-MKT-04 · SCR-ADMIN-015 */
  @Get('rankings')
  rankings(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.admin.getRankings(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('penalties')
  @HttpCode(200)
  penalty(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { agencyTenantId: string; points: number; reason: string },
  ) {
    return this.admin.applyPenalty(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('appeals/:agencyTenantId')
  @HttpCode(201)
  appeal(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('agencyTenantId') agencyTenantId: string,
    @Body() body: { note?: string },
  ) {
    return this.admin.submitAppeal(
      resolveTenantId(this.config, user, tenantHeader),
      agencyTenantId,
      body,
      user?.userId,
    );
  }

  @Get('cross-anchor')
  crossAnchor(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.admin.getCrossAnchorDistribution(resolveTenantId(this.config, user, tenantHeader));
  }
}
