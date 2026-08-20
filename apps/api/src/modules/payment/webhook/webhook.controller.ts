import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../identity/decorators/public.decorator';
import { PaymentWebhookService } from './payment-webhook.service';
import type { PaymentWebhookPayload } from './webhook.types';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhook: PaymentWebhookService) {}

  /** API-064 POST /webhooks/payment — FR-PAY-04, BR-21 idempotent */
  @Public()
  @Post('payment')
  @HttpCode(200)
  handlePayment(
    @Body() body: PaymentWebhookPayload,
    @Headers('x-signature') signature?: string,
  ) {
    return this.webhook.handle(body, signature);
  }
}
