import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { RefundService } from './refund.service';
import type { CreateRefundInput } from './refund.types';
import { mapRefundEntity } from './refund.types';

@Controller('refunds')
export class RefundController {
  constructor(
    private readonly refunds: RefundService,
    private readonly config: ConfigService,
  ) {}

  /** POST /refunds — UC-PAY-03 S4-05 gateway refund + ledger reversal */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateRefundInput,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.refunds.createRefund(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      idempotencyKey,
      user?.userId,
    );
  }

  @Get()
  listOrGet(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('paymentIntentId') paymentIntentId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);

    if (paymentIntentId?.trim()) {
      return this.refunds.findByPaymentIntent(tenantId, paymentIntentId.trim()).then((row) => ({
        data: row ? mapRefundEntity(row) : null,
        meta: { tenantId, paymentIntentId: paymentIntentId.trim() },
      }));
    }

    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.refunds.list(tenantId, Number.isFinite(limit) ? limit : 50);
  }
}
