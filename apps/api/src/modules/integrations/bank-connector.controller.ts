import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { configEnvReader } from '../../infrastructure/config-env-reader';
import { webhookSkipVerifyAllowed } from '../../infrastructure/security/production-security.service';
import { Public } from '../identity/decorators/public.decorator';
import { ApiMarketplaceService } from '../api-marketplace/api-marketplace.service';
import { CommissionSettlementService } from '../commission/commission-settlement.service';
import { ReconciliationService } from '../ledger/reconciliation.service';

function verifyBankWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
  skipVerify: boolean,
): boolean {
  if (skipVerify) return true;
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = signature.replace(/^sha256=/, '');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
  } catch {
    return expected === normalized;
  }
}

@Public()
@Controller('integrations/bank')
export class BankConnectorController {
  constructor(
    private readonly marketplace: ApiMarketplaceService,
    private readonly reconcile: ReconciliationService,
    private readonly settlement: CommissionSettlementService,
    private readonly config: ConfigService,
  ) {}

  private connectorMode(): 'sandbox' | 'live' {
    const stub = this.config.get<string>('SETTLEMENT_PAYOUT_STUB', 'false') === 'true';
    const liveEnabled =
      this.config.get<string>('BANK_CONNECTOR_LIVE', 'false') === 'true' ||
      (!stub && this.config.get<string>('SETTLEMENT_PAYOUT_ENABLED') === 'true');
    return liveEnabled && !stub ? 'live' : 'sandbox';
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-tenant-id') tenantHeader: string,
    @Headers('x-bank-signature') signature: string | undefined,
    @Body()
    body: {
      event?: 'payment.status' | 'payout.submitted' | 'escrow.custody';
      transactionId: string;
      bookingId?: string;
      paymentIntentId?: string;
      settlementRunId?: string;
      batchId?: string;
      amount: number;
      status: 'SUCCESS' | 'FAILED' | 'SUBMITTED';
    },
  ) {
    const tenantId = tenantHeader?.trim() || this.config.get('DEFAULT_TENANT_ID', 'ten_dev_01');
    const mode = this.connectorMode();
    const skipVerify = webhookSkipVerifyAllowed(configEnvReader(this.config));
    const secret = this.config.get<string>('BANK_WEBHOOK_SECRET', 'wereal-bank-dev-secret');
    const rawBody = JSON.stringify(body);

    if (mode === 'live' && !verifyBankWebhookSignature(rawBody, signature, secret, skipVerify)) {
      throw new UnauthorizedException({ detail: 'Invalid bank webhook signature' });
    }

    const partner = await this.marketplace.findPartnerByCategory(tenantId, 'BANK');
    const event = body.event ?? 'payment.status';

    await this.marketplace.recordDelivery({
      tenantId,
      partnerId: partner?.id ?? 'ptn_bank_stub',
      event,
      status: body.status === 'FAILED' ? 'FAILED' : 'DELIVERED',
      responseCode: body.status === 'FAILED' ? 400 : 200,
      payload: body as unknown as Record<string, unknown>,
    });

    if (event === 'payment.status' && body.status === 'SUCCESS' && body.paymentIntentId) {
      await this.reconcile.reconcilePaymentEvent(tenantId, body.paymentIntentId);
    }

    let payoutConfirmed: Awaited<
      ReturnType<CommissionSettlementService['confirmPayoutFromBankWebhook']>
    > | null = null;

    if (event === 'payout.submitted' && body.batchId) {
      payoutConfirmed = await this.settlement.confirmPayoutFromBankWebhook(tenantId, {
        settlementRunId: body.settlementRunId,
        batchId: body.batchId,
        amount: body.amount,
        status: body.status,
      });
    }

    return {
      data: {
        accepted: true,
        transactionId: body.transactionId,
        event,
        payoutSubmitted: event === 'payout.submitted' && body.status === 'SUBMITTED',
        payoutConfirmed,
      },
      meta: { uc: ['T5-S4', 'T7-S5', 'OP-WIN-06', 'OPS-S5-01'], connector: 'BANK', mode },
    };
  }
}
