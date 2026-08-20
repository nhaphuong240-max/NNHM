import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import type {
  EsignCreateInput,
  EsignCreateResult,
  EsignProviderAdapter,
  EsignWebhookPayload,
} from './esign-provider.adapter';

/** VNPT SmartCA sandbox stub — legal provider pilot for Tier 2 */
@Injectable()
export class VnptEsignAdapter implements EsignProviderAdapter {
  readonly providerId = 'VNPT_SMARTCA';

  private readonly envelopes = new Map<
    string,
    { input: EsignCreateInput; status: EsignCreateResult['status']; signatureRef?: string }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  async createEnvelope(input: EsignCreateInput): Promise<EsignCreateResult> {
    const envelopeId = `env_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const resolved = await this.rails.resolve(input.tenantId);
    const sandbox = resolved.esignSandbox;
    const baseUrl = this.config.get<string>(
      'ESIGN_SIGNING_BASE_URL',
      'http://localhost:5174/buyer/esign',
    );

    let status: EsignCreateResult['status'] = sandbox ? 'SENT' : 'CREATED';

    if (!sandbox) {
      const apiUrl = this.config.get<string>('VNPT_ESIGN_API_URL');
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl.replace(/\/$/, '')}/envelopes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.get<string>('VNPT_ESIGN_CLIENT_SECRET', '')}`,
            },
            body: JSON.stringify({
              contractId: input.contractId,
              signerName: input.signerName,
              signerEmail: input.signerEmail,
            }),
          });
          if (res.ok) {
            const body = (await res.json()) as Record<string, unknown>;
            status = (typeof body.status === 'string' ? body.status : 'CREATED') as EsignCreateResult['status'];
          }
        } catch {
          status = 'CREATED';
        }
      }
    }

    const result: EsignCreateResult = {
      envelopeId,
      signingUrl: `${baseUrl}?contractId=${encodeURIComponent(input.contractId)}&envelopeId=${envelopeId}`,
      status,
      provider: this.providerId,
    };

    this.envelopes.set(envelopeId, { input, status: result.status });
    return result;
  }

  async getSigningUrl(envelopeId: string): Promise<string | null> {
    const entry = this.envelopes.get(envelopeId);
    if (!entry) return null;
    const baseUrl = this.config.get<string>(
      'ESIGN_SIGNING_BASE_URL',
      'http://localhost:5174/buyer/esign',
    );
    return `${baseUrl}?contractId=${encodeURIComponent(entry.input.contractId)}&envelopeId=${envelopeId}`;
  }

  parseWebhook(body: unknown): EsignWebhookPayload | null {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    const envelopeId = typeof payload.envelopeId === 'string' ? payload.envelopeId : '';
    const contractId = typeof payload.contractId === 'string' ? payload.contractId : '';
    const event = typeof payload.event === 'string' ? payload.event : '';
    if (!envelopeId || !contractId || !event) return null;

    const normalized = event.toUpperCase() as EsignWebhookPayload['event'];
    const signatureRef =
      typeof payload.signatureRef === 'string'
        ? payload.signatureRef
        : `sig_${envelopeId}_${Date.now()}`;

    const entry = this.envelopes.get(envelopeId);
    if (entry && normalized === 'SIGNED') {
      entry.status = 'SIGNED';
      entry.signatureRef = signatureRef;
    }

    return {
      envelopeId,
      contractId,
      event: normalized,
      signatureRef,
      signedAt:
        typeof payload.signedAt === 'string'
          ? payload.signedAt
          : normalized === 'SIGNED'
            ? new Date().toISOString()
            : undefined,
    };
  }

  async downloadSignedPdf(envelopeId: string): Promise<Buffer | null> {
    const entry = this.envelopes.get(envelopeId);
    if (!entry || entry.status !== 'SIGNED') return null;
    const signedText = [
      entry.input.documentText,
      '',
      '---',
      'ĐÃ KÝ ĐIỆN TỬ (VNPT SmartCA sandbox)',
      `Người ký: ${entry.input.signerName}`,
      `Envelope: ${envelopeId}`,
      `Chữ ký số: ${entry.signatureRef ?? 'pending'}`,
    ].join('\n');
    return Buffer.from(signedText, 'utf8');
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('ESIGN_WEBHOOK_SECRET', 'wereal-esign-dev-secret');
    if (!signature) return this.config.get<string>('ESIGN_WEBHOOK_SKIP_VERIFY') === 'true';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
  }
}

@Injectable()
export class EsignAdapterRegistry {
  constructor(private readonly vnpt: VnptEsignAdapter) {}

  resolve(providerId?: string): VnptEsignAdapter {
    const id = providerId ?? process.env.ESIGN_PROVIDER ?? 'VNPT_SMARTCA';
    if (id === 'VNPT_SMARTCA') return this.vnpt;
    return this.vnpt;
  }
}
