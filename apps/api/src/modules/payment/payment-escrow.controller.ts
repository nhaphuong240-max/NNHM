import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PaymentEscrowService } from './payment-escrow.service';

@Controller('escrow')
export class PaymentEscrowController {
  constructor(
    private readonly escrow: PaymentEscrowService,
    private readonly config: ConfigService,
  ) {}

  @Get('accounts')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.escrow.listAccounts(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('accounts')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { bookingId: string; totalAmount?: number },
  ) {
    return this.escrow.createAccount(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('accounts/:accountId/milestones/:milestoneId/release')
  @HttpCode(200)
  release(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('accountId') accountId: string,
    @Param('milestoneId') milestoneId: string,
    @Body()
    body: { financeApproved?: boolean; complianceApproved?: boolean; bankConfirmed?: boolean },
  ) {
    return this.escrow.releaseMilestone(
      resolveTenantId(this.config, user, tenantHeader),
      accountId,
      milestoneId,
      {
        financeApproved: body.financeApproved ?? true,
        complianceApproved: body.complianceApproved ?? true,
        bankConfirmed: body.bankConfirmed ?? false,
      },
      user?.userId,
    );
  }
}
