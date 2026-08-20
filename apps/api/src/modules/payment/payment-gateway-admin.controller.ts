import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { PaymentMethod } from '../../database/entities/payment-intent.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';

@Controller('integrations/payment-gateways')
export class PaymentGatewayAdminController {
  constructor(
    private readonly gateways: PaymentGatewayAdminService,
    private readonly config: ConfigService,
  ) {}

  /** UC-PAY-05 · SCR-ADMIN-017 */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.gateways.getRoutingConfig(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('simulate')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  simulate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { method: PaymentMethod; amount: number; primaryFailed?: boolean },
  ) {
    return this.gateways.simulateRoute(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Patch('rules/:ruleId')
  updateRule(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('ruleId') ruleId: string,
    @Body() body: { enabled?: boolean; fallback?: PaymentMethod | null; label?: string },
  ) {
    return this.gateways.updateRule(
      resolveTenantId(this.config, user, tenantHeader),
      ruleId,
      body,
      user?.userId,
    );
  }
}
