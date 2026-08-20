import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { SMS_TEMPLATES } from './sms.types';
import { SmsService } from './sms.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('integrations/sms')
export class SmsIntegrationController {
  constructor(
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.sms.getIntegrationStatus(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('simulate')
  @HttpCode(201)
  @UseGuards(SimulateRailGuard)
  simulate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      phone?: string;
      templateId?: string;
      message?: string;
    },
  ) {
    return this.sms.simulateSend(resolveTenantId(this.config, user, tenantHeader), body);
  }

  @Post('send')
  @HttpCode(201)
  send(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      templateId?: string;
      phone?: string;
      params?: Record<string, unknown>;
    },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.sms.sendSms(tenantId, {
      templateId: body.templateId?.trim() || SMS_TEMPLATES.TRANSACTION_NOTIFY,
      phone: body.phone?.trim() || '+84901234567',
      params: body.params,
      source: { type: 'MANUAL', id: `manual_${Date.now()}` },
    });
  }

  @Patch('deliveries/:deliveryId/delivered')
  markDelivered(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.sms.markDelivered(
      resolveTenantId(this.config, user, tenantHeader),
      deliveryId,
    );
  }
}
