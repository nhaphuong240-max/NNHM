import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PortalService } from './portal.service';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly config: ConfigService,
  ) {}

  @Get('admin/dashboard')
  adminDashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.portal.getAdminDashboard(tenantId);
  }

  /** UC-CRM-05 · SCR-ADMIN-010 — unified Meta + Zalo omnichannel hub */
  @Get('admin/omnichannel')
  omnichannelDashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.portal.getOmnichannelDashboard(tenantId);
  }

  @Get('developer/dashboard')
  developerDashboard(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.portal.getDeveloperDashboard(tenantId, projectId?.trim() || undefined);
  }

  /** UC-BK-02 · SCR-BUYER-002 — public buyer deal tracker (tenant header) */
  @Public()
  @Get('buyer/deals')
  buyerDeals(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.portal.getBuyerDeals(resolveTenantId(this.config, undefined, tenantHeader));
  }

  @Public()
  @Get('buyer/deals/:bookingId')
  buyerDeal(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.portal.getBuyerDeal(
      resolveTenantId(this.config, undefined, tenantHeader),
      bookingId,
    );
  }

  /** UC-UX-02 — demo ZNS notify stub for buyer deal tracker */
  @Public()
  @Post('buyer/deals/:bookingId/notifications/stub')
  buyerDealNotifyStub(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.portal.sendBuyerDealNotificationStub(
      resolveTenantId(this.config, undefined, tenantHeader),
      bookingId,
    );
  }

  @Public()
  @Post('buyer/devices/register')
  registerBuyerDevice(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { pushToken?: string; platform?: string },
  ) {
    return this.portal.registerBuyerDevice(
      resolveTenantId(this.config, undefined, tenantHeader),
      body,
    );
  }

  @Public()
  @Post('buyer/deals/:bookingId/bnpl')
  applyBuyerBnpl(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: { planId?: string },
  ) {
    return this.portal.applyBuyerBnpl(
      resolveTenantId(this.config, undefined, tenantHeader),
      bookingId,
      body.planId ?? 'bnpl_3',
    );
  }

  @Public()
  @Get('buyer/deals/:bookingId/sign-session')
  buyerSignSession(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    return this.portal.getBuyerSignSession(
      resolveTenantId(this.config, undefined, tenantHeader),
      bookingId,
    );
  }

  /** UC-UX-06 · SCR-PUBLIC-003 */
  @Public()
  @Get('public/map')
  publicMap(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.portal.getPublicMap(
      resolveTenantId(this.config, undefined, tenantHeader),
      projectId?.trim(),
    );
  }
}
