import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { ApiPartnerRecord } from './api-marketplace.types';
import { ApiMarketplaceService } from './api-marketplace.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('integrations/api-marketplace')
export class ApiMarketplaceController {
  constructor(
    private readonly marketplace: ApiMarketplaceService,
    private readonly config: ConfigService,
  ) {}

  /** UC-NW-04 · SCR-ADMIN-004 */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.marketplace.listPartners(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('partners')
  @HttpCode(201)
  register(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: { name: string; category: ApiPartnerRecord['category']; webhookUrl?: string },
  ) {
    return this.marketplace.registerPartner(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('partners/:partnerId/webhooks/simulate')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  simulateWebhook(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('partnerId') partnerId: string,
    @Body() body: { event?: string },
  ) {
    return this.marketplace.simulateWebhook(
      resolveTenantId(this.config, user, tenantHeader),
      partnerId,
      body,
      user?.userId,
    );
  }
}
