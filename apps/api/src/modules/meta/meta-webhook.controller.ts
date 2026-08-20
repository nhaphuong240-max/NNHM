import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { Public } from '../identity/decorators/public.decorator';
import { MetaLeadService } from './meta-lead.service';
import type { MetaWebhookPayload } from './meta.types';

@Controller('webhooks')
export class MetaWebhookController {
  constructor(private readonly meta: MetaLeadService) {}

  /** UC-NW-02 — Meta Leadgen webhook verify (GET) */
  @Public()
  @Get('meta')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    return this.meta.verifySubscription(mode, token, challenge);
  }

  /** UC-NW-02 / TC-21 — Meta Leadgen webhook ingest (POST) */
  @Public()
  @Post('meta')
  @HttpCode(200)
  ingest(
    @Body() body: MetaWebhookPayload,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    return this.meta.handleWebhook(body, signature);
  }
}
