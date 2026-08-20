import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { TenantWebhookService } from './tenant-webhook.service';
import type { TenantWebhookEvent } from './tenant-webhook.util';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('integrations/webhooks')
export class TenantWebhookController {
  constructor(
    private readonly webhooks: TenantWebhookService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.webhooks.listSubscriptions(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: { label: string; targetUrl: string; events?: TenantWebhookEvent[] },
  ) {
    return this.webhooks.createSubscription(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post(':subscriptionId/simulate')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  simulate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { event?: TenantWebhookEvent; payload?: Record<string, unknown> },
  ) {
    return this.webhooks.simulateDelivery(
      resolveTenantId(this.config, user, tenantHeader),
      subscriptionId,
      body,
      user?.userId,
    );
  }

  @Patch(':subscriptionId')
  toggle(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.webhooks.toggleSubscription(
      resolveTenantId(this.config, user, tenantHeader),
      subscriptionId,
      body.enabled,
      user?.userId,
    );
  }
}
