import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ZALO_ZNS_TEMPLATES } from './zalo.types';
import { ZaloLeadService } from './zalo-lead.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('integrations/zalo')
export class ZaloIntegrationController {
  constructor(
    private readonly zalo: ZaloLeadService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.zalo.getIntegrationStatus(tenantId);
  }

  /** AC-US-NW-01 sandbox — simulate Zalo OA inbound without Developer app */
  @Post('simulate')
  @HttpCode(201)
  @UseGuards(SimulateRailGuard)
  simulate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      oaId?: string;
      msgId?: string;
      fullName?: string;
      phone?: string;
      message?: string;
    },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.zalo.simulateLead(tenantId, {
      oaId: body.oaId?.trim() || 'oa_sunrise_dev',
      msgId: body.msgId,
      fullName: body.fullName,
      phone: body.phone,
      message: body.message,
    });
  }

  /** ZNS outbound — sandbox or Zalo Graph API live */
  @Post('zns/send')
  @HttpCode(201)
  sendZns(
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
    return this.zalo.sendZns(tenantId, {
      templateId: body.templateId?.trim() || ZALO_ZNS_TEMPLATES.LEAD_ACK,
      phone: body.phone?.trim() || '+84901234567',
      params: body.params,
    });
  }

  /** Connect OA refresh token — enables live Graph API (P2) */
  @Post('oauth/connect')
  @HttpCode(200)
  connectOAuth(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      oaId?: string;
      refreshToken: string;
      accessToken?: string;
      expiresIn?: number;
    },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.zalo.connectOAuth(tenantId, {
      oaId: body.oaId?.trim() || 'oa_sunrise_dev',
      refreshToken: body.refreshToken,
      accessToken: body.accessToken,
      expiresIn: body.expiresIn,
    });
  }

  /** Ping Zalo Graph API with stored token */
  @Post('oauth/verify')
  @HttpCode(200)
  verifyOAuth(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { oaId?: string },
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.zalo.verifyOAuth(tenantId, body.oaId?.trim());
  }

  /** Delivery report simulate — UC-NW-01 staging DELIVERED */
  @Patch('zns/deliveries/:deliveryId/delivered')
  markZnsDelivered(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('deliveryId') deliveryId: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.zalo.markZnsDelivered(tenantId, deliveryId);
  }
}
