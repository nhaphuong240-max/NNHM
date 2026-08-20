import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { KycSubjectType } from '../../database/entities/kyc-profile.entity';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { EkycService } from './ekyc.service';
import { SimulateRailGuard } from '../tenant-config/simulate-rail.guard';

@Controller('kyc/ekyc')
export class EkycController {
  constructor(
    private readonly ekyc: EkycService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('status')
  status() {
    return { data: this.ekyc.status() };
  }

  @Post(':subjectType/:subjectId/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
    @Body() body: { documentType?: string },
  ) {
    return this.ekyc.startVerification(
      resolveTenantId(this.config, user, tenantHeader),
      subjectType,
      subjectId,
      user?.userId,
      body.documentType,
    );
  }

  @Public()
  @Post('webhooks/vnpt')
  @HttpCode(200)
  webhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.ekyc.handleWebhook(resolveTenantId(this.config, undefined, tenantHeader), body);
  }

  @Post('simulate/approve')
  @HttpCode(200)
  @UseGuards(SimulateRailGuard)
  simulateApprove(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { externalRef: string },
  ) {
    return this.ekyc.simulateApprove(
      resolveTenantId(this.config, user, tenantHeader),
      body.externalRef.trim(),
      user?.userId,
    );
  }
}
