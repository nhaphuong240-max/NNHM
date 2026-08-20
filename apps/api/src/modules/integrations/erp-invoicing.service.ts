import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { DataIntelligenceService } from '../analytics/data-intelligence.service';

export type ErpInvoicePayload = {
  invoiceId: string;
  tenantId: string;
  currency: string;
  lineItems: Array<{
    productCode: string;
    quantity: number;
    unitPriceVnd: number;
    amountVnd: number;
  }>;
  totalVnd: number;
  billingTier: string;
  issuedAt: string;
};

export type ErpSyncResult = {
  invoiceId: string;
  status: 'SUBMITTED' | 'STUB_ACCEPTED';
  provider: string;
  externalRef?: string;
  payload: ErpInvoicePayload;
};

/** T7-S8 — data product billing → external ERP (MISA connector profile). */
@Injectable()
export class ErpInvoicingService {
  private readonly logger = new Logger(ErpInvoicingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly billing: DataIntelligenceService,
  ) {}

  status() {
    const stub = this.config.get<string>('ERP_INVOICING_STUB', 'true') !== 'false';
    const enabled = this.config.get<string>('ERP_INVOICING_ENABLED', 'false') === 'true';
    return {
      module: 'erp-invoicing',
      provider: 'MISA',
      enabled,
      stub,
      urlConfigured: Boolean(this.config.get<string>('ERP_INVOICING_URL')),
      uc: ['T6-S2', 'T7-S8'],
    };
  }

  async buildInvoice(tenantId: string): Promise<ErpInvoicePayload> {
    const summary = await this.billing.getBillingSummary(tenantId);
    const lineItems = summary.data.lineItems
      .filter((l) => l.enabled)
      .map((l) => ({
        productCode: l.productCode,
        quantity: 1,
        unitPriceVnd: l.unitPriceVnd,
        amountVnd: l.unitPriceVnd,
      }));
    const totalVnd = lineItems.reduce((s, l) => s + l.amountVnd, 0);

    return {
      invoiceId: `inv_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      tenantId,
      currency: summary.data.currency,
      lineItems,
      totalVnd,
      billingTier: summary.data.billingTier,
      issuedAt: new Date().toISOString(),
    };
  }

  async syncInvoice(tenantId: string): Promise<ErpSyncResult> {
    const payload = await this.buildInvoice(tenantId);
    const stub = this.config.get<string>('ERP_INVOICING_STUB', 'true') !== 'false';
    const enabled = this.config.get<string>('ERP_INVOICING_ENABLED', 'false') === 'true';

    if (!enabled) {
      return {
        invoiceId: payload.invoiceId,
        status: 'STUB_ACCEPTED',
        provider: 'MISA',
        externalRef: `stub_${payload.invoiceId}`,
        payload,
      };
    }

    if (stub) {
      this.logger.log(`ERP stub accept tenant=${tenantId} invoice=${payload.invoiceId}`);
      return {
        invoiceId: payload.invoiceId,
        status: 'STUB_ACCEPTED',
        provider: 'MISA',
        externalRef: `misa_stub_${payload.invoiceId.slice(-8)}`,
        payload,
      };
    }

    const url = this.config.get<string>('ERP_INVOICING_URL', '');
    const secret = this.config.get<string>('ERP_INVOICING_HMAC_SECRET', '');
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', secret || 'erp_stub_secret').update(body).digest('hex');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ERP-Signature': `sha256=${signature}`,
        'X-Tenant-Id': tenantId,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`ERP invoicing failed: HTTP ${response.status}`);
    }

    const externalRef =
      (await response.json().catch(() => ({}))) as { reference?: string };

    return {
      invoiceId: payload.invoiceId,
      status: 'SUBMITTED',
      provider: 'MISA',
      externalRef: externalRef.reference ?? `misa_${payload.invoiceId.slice(-8)}`,
      payload,
    };
  }
}
