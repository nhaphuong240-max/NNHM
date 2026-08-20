import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PaymentBnplService } from './payment-bnpl.service';

@Controller('bnpl')
export class PaymentBnplController {
  constructor(
    private readonly bnpl: PaymentBnplService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('plans')
  plans() {
    return this.bnpl.listPlans();
  }

  @Get('applications')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.bnpl.listApplications(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('applications')
  @HttpCode(201)
  apply(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { bookingId: string; planId: string },
  ) {
    return this.bnpl.apply(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('webhook/partner')
  @Public()
  @HttpCode(200)
  partnerWebhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { externalId: string; status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.bnpl.handlePartnerWebhook(
      resolveTenantId(this.config, undefined, tenantHeader),
      body,
    );
  }
}
