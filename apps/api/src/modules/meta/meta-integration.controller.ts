import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { MetaLeadService } from './meta-lead.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('integrations/meta')
export class MetaIntegrationController {
  constructor(
    private readonly meta: MetaLeadService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.meta.getIntegrationStatus(tenantId);
  }

  /** Phase 2 — bind Meta page + page access token for Graph lead fetch */
  @Post('pages/connect')
  @HttpCode(201)
  connectPage(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { pageId: string; pageName?: string; pageAccessToken: string },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.meta.connectPage(
      tenantId,
      {
        pageId: body.pageId,
        pageName: body.pageName ?? body.pageId,
        pageAccessToken: body.pageAccessToken,
      },
      user?.userId,
    );
  }

  /** TC-21 sandbox — simulate Meta webhook without Facebook app */
  @Post('simulate')
  @HttpCode(201)
  @UseGuards(SimulateRailGuard)
  simulate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      pageId?: string;
      leadgenId?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      campaignId?: string;
      adId?: string;
    },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.meta.simulateLead(tenantId, {
      pageId: body.pageId?.trim() || 'page_sunrise_dev',
      leadgenId: body.leadgenId,
      campaignId: body.campaignId,
      adId: body.adId,
      fieldData: [
        { name: 'full_name', values: [body.fullName?.trim() || 'Lead Meta Sandbox'] },
        { name: 'phone_number', values: [body.phone?.trim() || '+84901234567'] },
        ...(body.email ? [{ name: 'email', values: [body.email.trim()] }] : []),
      ],
    });
  }
}
