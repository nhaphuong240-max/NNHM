import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator';
import { ZaloLeadService } from './zalo-lead.service';
import type { ZaloWebhookPayload } from './zalo.types';

@Controller('webhooks')
export class ZaloWebhookController {
  constructor(private readonly zalo: ZaloLeadService) {}

  /** UC-NW-01 — Zalo OA inbound message webhook */
  @Public()
  @Post('zalo')
  @HttpCode(200)
  ingest(
    @Body() body: ZaloWebhookPayload,
    @Headers('x-zevent-signature') signature?: string,
  ) {
    return this.zalo.handleWebhook(body, signature);
  }
}
