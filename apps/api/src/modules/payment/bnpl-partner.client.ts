import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';

export type BnplPartnerDecision = {
  externalId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
};

@Injectable()
export class BnplPartnerClient {
  constructor(private readonly config: ConfigService) {}

  isLiveMode() {
    return (
      this.config.get<string>('BNPL_PARTNER_ENABLED', 'false') === 'true' &&
      !!this.config.get<string>('BNPL_PARTNER_URL')
    );
  }

  async submitApplication(input: {
    bookingId: string;
    planId: string;
    totalAmount: number;
    tenantId: string;
  }): Promise<BnplPartnerDecision> {
    const baseUrl = this.config.get<string>('BNPL_PARTNER_URL');
    if (!this.isLiveMode() || !baseUrl) {
      return {
        externalId: `sandbox_${randomUUID().slice(0, 8)}`,
        status: 'PENDING',
        reason: 'sandbox_pending_manual_review',
      };
    }

    const apiKey = this.config.get<string>('BNPL_PARTNER_API_KEY', '');
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(input),
    });

    const json = (await res.json()) as BnplPartnerDecision & { detail?: string };
    if (!res.ok) {
      throw new Error(json.detail ?? `BNPL partner error: ${res.status}`);
    }
    return json;
  }

  verifyWebhookSignature(signature: string | undefined, rawBody: string) {
    const secret = this.config.get<string>('BNPL_WEBHOOK_SECRET', '');
    if (!secret) return true;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
  }
}
