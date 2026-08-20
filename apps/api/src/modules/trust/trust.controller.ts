import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { TrustDisputeStatus } from '../../database/entities/trust-dispute.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import type { OpenTrustDisputeInput, ResolveTrustDisputeInput } from './trust.types';
import { TrustService } from './trust.service';

@Controller('disputes')
export class TrustController {
  constructor(
    private readonly trust: TrustService,
    private readonly config: ConfigService,
  ) {}

  /** UC-TR-03 · SCR-ADMIN-008 */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('status') status?: TrustDisputeStatus,
  ) {
    return this.trust.listDisputes(resolveTenantId(this.config, user, tenantHeader), status);
  }

  @Get(':disputeId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('disputeId') disputeId: string,
  ) {
    return this.trust.getDispute(resolveTenantId(this.config, user, tenantHeader), disputeId);
  }

  @Post()
  open(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: OpenTrustDisputeInput,
  ) {
    return this.trust.openDispute(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Patch(':disputeId/mediate')
  mediate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('disputeId') disputeId: string,
  ) {
    return this.trust.startMediation(
      resolveTenantId(this.config, user, tenantHeader),
      disputeId,
      user?.userId,
    );
  }

  @Patch(':disputeId/resolve')
  resolve(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('disputeId') disputeId: string,
    @Body() body: ResolveTrustDisputeInput,
  ) {
    return this.trust.resolveDispute(
      resolveTenantId(this.config, user, tenantHeader),
      disputeId,
      body,
      user?.userId,
    );
  }
}
