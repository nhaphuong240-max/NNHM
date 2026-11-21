import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { RefundCheckService } from './refund-check.service';

@Controller('refund-checks')
export class RefundCheckController {
  constructor(private readonly checks: RefundCheckService) {}

  @Post()
  @HttpCode(201)
  propose(
    @CurrentUser() user: AuthUser,
    @Body() body: { paymentIntentId?: string; amount?: number; currency?: string },
  ) {
    if (!body?.paymentIntentId?.trim() || typeof body.amount !== 'number') {
      throw new UnprocessableEntityException({ detail: 'payment intent and amount are required' });
    }
    return this.checks.propose({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      paymentIntentId: body.paymentIntentId.trim(),
      amount: body.amount,
      currency: body.currency,
    });
  }

  @Post(':paymentIntentId/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('paymentIntentId') paymentIntentId: string) {
    return this.checks.approve({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      paymentIntentId,
    });
  }
}
