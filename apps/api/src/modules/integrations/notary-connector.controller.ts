import { Body, Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { oneLookedUpTenant, recordUnscopedAudit } from '../../common/public-tenant-lookup';
import { assertHeaderMatches } from '../../common/resolve-tenant-id';
import { verifyWebhookSignature } from '../payment/webhook/webhook-signature.util';
import { notaryJournalId } from './notary-webhook-journal';
import { Public } from '../identity/decorators/public.decorator';
import { ApiMarketplaceService } from '../api-marketplace/api-marketplace.service';

@Public()
@Controller('integrations/notary')
export class NotaryConnectorController {
  constructor(
    private readonly marketplace: ApiMarketplaceService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-tenant-id') tenantHeader: string,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body()
    body: {
      bookingId: string;
      milestoneId?: string;
      notarizationStatus: 'PENDING' | 'COMPLETED' | 'REJECTED';
      contractRef?: string;
    },
    @Req() request?: { ip?: string },
  ) {
    const source = request?.ip?.trim() ? `ip:${request.ip.trim().slice(0, 64)}` : 'notary-webhook';
    const secret = this.config.get<string>('NOTARY_WEBHOOK_SECRET') ?? '';
    const payload = body as unknown as Record<string, unknown>;
    if (!secret || !verifyWebhookSignature(payload, signature, secret)) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: null,
        entityType: 'booking',
        source,
        entityId: body.bookingId || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: 'bad-signature', connector: 'NOTARY' },
      });
      throw new UnauthorizedException({ detail: 'notary webhook signature is invalid' });
    }
    let tenantId: string;
    try {
      tenantId = await oneLookedUpTenant(this.dataSource, 'booking', body.bookingId, 'not-found');
    } catch (error) {
      await recordUnscopedAudit(this.dataSource, {
        tenantId: null,
        entityType: 'booking',
        source,
        entityId: body.bookingId || 'missing',
        action: 'WEBHOOK_REJECTED',
        payload: { reason: 'no-matching-record', connector: 'NOTARY' },
      });
      throw error;
    }
    assertHeaderMatches(tenantHeader, tenantId);
    const partner = await this.marketplace.findPartnerByCategory(tenantId, 'NOTARY');
    const milestoneId = body.milestoneId ?? 'ms_contract';
    const contractRef = body.contractRef ?? '';
    const journal = await this.marketplace.recordDeliveryOnce({
      tenantId,
      partnerId: partner?.id ?? 'ptn_notary_stub',
      event: 'notary.status',
      status: body.notarizationStatus === 'REJECTED' ? 'FAILED' : 'DELIVERED',
      responseCode: body.notarizationStatus === 'REJECTED' ? 422 : 200,
      payload: body as unknown as Record<string, unknown>,
      journalId: notaryJournalId({
        tenantId,
        bookingId: body.bookingId,
        milestoneId,
        notarizationStatus: body.notarizationStatus,
        contractRef,
      }),
    });

    return {
      data: {
        bookingId: body.bookingId,
        milestoneId,
        notarizationStatus: body.notarizationStatus,
        contractRef: contractRef || null,
        escrowLinked: true,
      },
      meta: {
        uc: ['T5-S4', 'T5-S6'],
        connector: 'NOTARY',
        mode: 'sandbox',
        idempotentReplay: journal.replay,
      },
    };
  }
}
