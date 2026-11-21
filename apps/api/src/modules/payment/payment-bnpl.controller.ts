import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { lookupTenants, recordUnscopedAudit } from '../../common/public-tenant-lookup';
import { assertHeaderMatches, resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { verifyWebhookSignature } from './webhook/webhook-signature.util';
import { PaymentBnplService } from './payment-bnpl.service';

@Controller('bnpl')
export class PaymentBnplController {
  constructor(
    private readonly bnpl: PaymentBnplService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('plans')
  plans() {
    return this.bnpl.listPlans();
  }

  @Get('applications')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.bnpl.listApplications(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('applications')
  @HttpCode(201)
  apply(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { bookingId: string; planId: string },
  ) {
    return this.bnpl.apply(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('webhook/partner')
  @Public()
  @HttpCode(200)
  async partnerWebhook(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() body: { externalId: string; status: 'APPROVED' | 'REJECTED'; reason?: string; signature?: string },
    @Req() request?: { ip?: string },
  ) {
    const source = request?.ip?.trim() ? `ip:${request.ip.trim().slice(0, 64)}` : 'bnpl-webhook';
    const secret = this.config.get<string>('BNPL_WEBHOOK_SECRET', '');
    const signed = Boolean(secret) && verifyWebhookSignature(body, signature ?? body.signature, secret);
    const rows = body.externalId
      ? await lookupTenants(this.dataSource, 'bnpl_external', body.externalId)
      : [];
    const matched = rows.length === 1 ? rows[0]! : null;
    if (!signed) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: matched,
        entityType: 'bnpl_application',
        source,
        entityId: body.externalId || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: 'bad-signature' },
      });
      throw new UnauthorizedException({ detail: 'Invalid BNPL webhook signature' });
    }
    if (rows.length !== 1) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: null,
        entityType: 'bnpl_application',
        source,
        entityId: body.externalId || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: rows.length > 1 ? 'ambiguous-record' : 'no-matching-record' },
      });
      if (rows.length > 1) {
        throw new UnprocessableEntityException({ detail: 'BNPL webhook matches more than one tenant' });
      }
      throw new NotFoundException({ detail: 'BNPL webhook does not match a stored application' });
    }
    assertHeaderMatches(tenantHeader, matched!);
    return this.bnpl.handlePartnerWebhook(matched!, body);
  }
}
