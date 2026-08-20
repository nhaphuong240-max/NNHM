import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import type { SmsGraphMode } from './sms.types';

@Injectable()
export class SmsProviderClient {
  private readonly logger = new Logger(SmsProviderClient.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S4-04 — tenant LIVE_RAILS.smsSandbox wins over SMS_SANDBOX env. */
  async isSandboxMode(tenantId: string): Promise<boolean> {
    const resolved = await this.rails.resolve(tenantId);
    return resolved.smsSandbox;
  }

  isStubMode(): boolean {
    return this.config.get<string>('SMS_PROVIDER_STUB', 'false') === 'true';
  }

  async graphMode(tenantId: string, binding: { apiKey?: string | null } | null): Promise<SmsGraphMode> {
    if (await this.isSandboxMode(tenantId)) return 'SANDBOX';
    if (binding?.apiKey) return 'LIVE';
    return 'UNCONFIGURED';
  }

  async sendTemplate(input: {
    tenantId: string;
    phone: string;
    templateId: string;
    params: Record<string, unknown>;
    brandName: string;
    trackingId: string;
    apiKey?: string;
  }): Promise<{ providerRef: string }> {
    if (await this.isSandboxMode(input.tenantId)) {
      this.logger.log(`SMS sandbox ${input.templateId} → ${input.phone} (${input.trackingId})`);
      return { providerRef: `sandbox_${input.trackingId}` };
    }

    if (this.isStubMode()) {
      this.logger.log(
        `SMS live stub ${input.templateId} → ${input.phone} (${input.trackingId}) · SMS_PROVIDER_STUB`,
      );
      return { providerRef: `live_stub_${input.trackingId}` };
    }

    const url = this.config.get<string>('SMS_PROVIDER_URL');
    const apiKey = input.apiKey ?? this.config.get<string>('SMS_PROVIDER_API_KEY');
    if (!url || !apiKey) {
      throw new Error('SMS_PROVIDER_URL and apiKey required for live SMS (UC-NW-03)');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: input.phone,
        templateId: input.templateId,
        brandName: input.brandName,
        params: input.params,
        trackingId: input.trackingId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SMS provider failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json().catch(() => ({}))) as { providerRef?: string; messageId?: string };
    const providerRef = json.providerRef ?? json.messageId ?? `live_${input.trackingId}`;
    this.logger.log(`SMS LIVE ${input.templateId} → ${input.phone} ref=${providerRef}`);
    return { providerRef };
  }
}
