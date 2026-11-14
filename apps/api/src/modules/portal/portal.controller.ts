import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant } from '../../common/public-tenant-lookup';
import { contractSignSecret } from '../booking/contract-sign-token';
import { requireHostTenant } from '../../common/resolve-tenant-from-host';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PortalService } from './portal.service';
import { resolveSeekerPhone } from './seeker-phone.util';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
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
  async buyerDeals(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host?: string,
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : requireHostTenant(host);
    assertHeaderMatches(tenantHeader, tenantId);
    return this.portal.getBuyerDeals(tenantId, resolveSeekerPhone(user));
  }

  @Public()
  @Get('buyer/deals/:bookingId')
  async buyerDeal(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    const tenantId = user?.tenantId?.trim()
      ? resolveTenantId(this.config, user, tenantHeader)
      : await oneLookedUpTenant(this.dataSource, 'booking', bookingId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    return this.portal.getBuyerDeal(tenantId, bookingId, resolveSeekerPhone(user));
  }

  /** UC-UX-02 — demo ZNS notify stub for buyer deal tracker */
  @Public()
  @Post('buyer/deals/:bookingId/notifications/stub')
  async buyerDealNotifyStub(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'booking', bookingId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    await this.portal.requireOwnedBuyerBooking(tenantId, bookingId, user);
    return this.portal.sendBuyerDealNotificationStub(tenantId, bookingId);
  }

  @Public()
  @Post('buyer/devices/register')
  registerBuyerDevice(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Body() body: { pushToken?: string; platform?: string },
  ) {
    const tenantId = requireHostTenant(host);
    assertHeaderMatches(tenantHeader, tenantId);
    return this.portal.registerBuyerDevice(tenantId, body);
  }

  @Public()
  @Post('buyer/deals/:bookingId/bnpl')
  async applyBuyerBnpl(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: { planId?: string },
  ) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'booking', bookingId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    await this.portal.requireOwnedBuyerBooking(tenantId, bookingId, user);
    return this.portal.applyBuyerBnpl(tenantId, bookingId, body.planId ?? 'bnpl_3');
  }

  @Public()
  @Get('buyer/deals/:bookingId/sign-session')
  async buyerSignSession(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'booking', bookingId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    await this.portal.requireOwnedBuyerBooking(tenantId, bookingId, user);
    return this.portal.getBuyerSignSession(tenantId, bookingId);
  }

  @Post('buyer/contracts/:contractId/sign-token')
  async issueContractSignToken(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('contractId') contractId: string,
  ) {
    const tenantId = await oneLookedUpTenant(this.dataSource, 'contract', contractId, 'not-found');
    assertHeaderMatches(tenantHeader, tenantId);
    if (!user?.tenantId || user.tenantId !== tenantId) {
      throw new ForbiddenException({ detail: 'contract tenant does not match the signed-in buyer' });
    }
    const secret = contractSignSecret((key) => this.config.get<string>(key));
    if (!secret) {
      throw new UnprocessableEntityException({ detail: 'contract sign secret is not configured' });
    }
    return this.portal.issueContractSignToken(tenantId, contractId, user, secret);
  }

  /** UC-UX-06 · SCR-PUBLIC-003 */
  @Public()
  @Get('public/map')
  async publicMap(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('host') host: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    const id = projectId?.trim();
    const tenantId = id
      ? await oneLookedUpTenant(this.dataSource, 'project', id, 'not-found')
      : requireHostTenant(host);
    assertHeaderMatches(tenantHeader, tenantId);
    return this.portal.getPublicMap(tenantId, id);
  }
}
