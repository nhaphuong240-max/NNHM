import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type {
  EkycProviderAdapter,
  EkycStartInput,
  EkycStartResult,
  EkycVerificationStatus,
  EkycWebhookPayload,
} from './ekyc-provider.adapter';

/** VNPT eKYC sandbox stub — swap HTTP calls when vendor credentials available */
@Injectable()
export class VnptEkycAdapter implements EkycProviderAdapter {
  readonly providerId = 'VNPT_EKYC';

  private readonly sessions = new Map<string, EkycWebhookPayload>();

  constructor(private readonly config: ConfigService) {}

  async startVerification(input: EkycStartInput): Promise<EkycStartResult> {
    const externalRef = `vnpt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const sandbox = this.config.get<string>('EKYC_SANDBOX', 'true') !== 'false';
    const baseUrl = this.config.get<string>(
      'EKYC_VERIFICATION_BASE_URL',
      'http://localhost:5174/admin/kyc/verify',
    );

    let status: EkycVerificationStatus = sandbox ? 'IN_REVIEW' : 'PENDING';

    if (!sandbox) {
      const apiUrl = this.config.get<string>('VNPT_EKYC_API_URL');
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl.replace(/\/$/, '')}/sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': this.config.get<string>('VNPT_EKYC_API_KEY', ''),
            },
            body: JSON.stringify({
              subjectId: input.subjectId,
              subjectType: input.subjectType,
              documentType: input.documentType ?? 'CCCD',
            }),
          });
          if (res.ok) {
            const body = (await res.json()) as Record<string, unknown>;
            status = (typeof body.status === 'string'
              ? body.status.toUpperCase()
              : 'PENDING') as EkycVerificationStatus;
          }
        } catch {
          status = 'PENDING';
        }
      }
    }

    this.sessions.set(externalRef, {
      externalRef,
      status,
      documentType: input.documentType ?? 'CCCD',
      verificationLevel: 'LEVEL_2',
    });

    return {
      externalRef,
      verificationUrl: `${baseUrl}?ref=${externalRef}&subject=${input.subjectId}`,
      status,
      provider: this.providerId,
    };
  }

  async getStatus(externalRef: string): Promise<EkycVerificationStatus> {
    return this.sessions.get(externalRef)?.status ?? 'PENDING';
  }

  parseWebhook(body: unknown): EkycWebhookPayload | null {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    const externalRef = typeof payload.externalRef === 'string' ? payload.externalRef : '';
    const status = typeof payload.status === 'string' ? payload.status : '';
    if (!externalRef || !status) return null;

    const normalized = status.toUpperCase() as EkycVerificationStatus;
    const result: EkycWebhookPayload = {
      externalRef,
      status: normalized,
      verificationLevel:
        typeof payload.verificationLevel === 'string' ? payload.verificationLevel : undefined,
      documentType: typeof payload.documentType === 'string' ? payload.documentType : undefined,
      verifiedAt:
        typeof payload.verifiedAt === 'string'
          ? payload.verifiedAt
          : normalized === 'APPROVED'
            ? new Date().toISOString()
            : undefined,
      reason: typeof payload.reason === 'string' ? payload.reason : undefined,
    };
    this.sessions.set(externalRef, result);
    return result;
  }
}

@Injectable()
export class EkycAdapterRegistry {
  constructor(private readonly vnpt: VnptEkycAdapter) {}

  resolve(providerId?: string): EkycProviderAdapter {
    const id = providerId ?? process.env.EKYC_PROVIDER ?? 'VNPT_EKYC';
    if (id === 'VNPT_EKYC') return this.vnpt;
    return this.vnpt;
  }
}
