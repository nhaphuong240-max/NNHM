import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PaymentService } from './payment.service';
import type { CreatePaymentIntentInput } from './payment.types';

@Controller('payment-intents')
export class PaymentController {
  constructor(
    private readonly payment: PaymentService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.payment.status();
  }

  /** API-062 GET /payment-intents/{id}/checkout — SCR-BUYER-004 public summary */
  @Public()
  @Get(':intentId/checkout')
  checkout(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('intentId') intentId: string,
  ) {
    return this.payment.getCheckout(
      resolveTenantId(this.config, undefined, tenantHeader),
      intentId,
    );
  }

  /** API-061 POST /payment-intents — UC-PAY-01 S4-01 */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreatePaymentIntentInput,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.payment.createIntent(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      idempotencyKey,
      user?.userId,
    );
  }
}
