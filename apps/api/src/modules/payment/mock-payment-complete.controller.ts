import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SEED_TENANT_ID } from '../../database/database.seed.service';
import { isLiveDeploymentEnv } from '../../infrastructure/security/production-security.service';
import { configEnvReader } from '../../infrastructure/config-env-reader';
import { Public } from '../identity/decorators/public.decorator';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { signWebhookPayload } from './webhook/webhook-signature.util';
import { PaymentWebhookService } from './webhook/payment-webhook.service';

/** Dev helper — MOCK gateway redirect simulates gateway IPN */
@Controller('payments')
export class MockPaymentCompleteController {
  constructor(
    private readonly webhook: PaymentWebhookService,
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  @Public()
  @Get('mock/complete')
  async mockComplete(
    @Query('intentId') intentId: string,
    @Query('ref') ref: string,
    @Query('amount') amountRaw: string,
    @Query('tenantId') tenantQuery: string | undefined,
    @Res() res: Response,
  ) {
    if (isLiveDeploymentEnv(configEnvReader(this.config))) {
      throw new NotFoundException();
    }

    const tenantId = tenantQuery?.trim() || SEED_TENANT_ID;
    const liveRails = await this.rails.resolve(tenantId);
    if (!liveRails.simulateEndpoints) {
      throw new NotFoundException();
    }

    const amount = Number.parseInt(amountRaw, 10);
    const payload = {
      eventId: `mock_${ref ?? intentId}`,
      eventType: 'payment.success' as const,
      transactionId: ref ?? `MOCK_${intentId}`,
      amount,
      paymentIntentId: intentId,
      tenantId,
      timestamp: new Date().toISOString(),
    };

    const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET', 'wereal-dev-webhook-secret');
    const signature = signWebhookPayload(payload, secret);

    const result = await this.webhook.handle(payload, signature);

    res.status(200).json({
      simulated: true,
      webhook: result,
    });
  }
}
