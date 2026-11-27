import { Logger, UnprocessableEntityException } from '@nestjs/common';
import { maskChannelDest } from '../booking/esign-otp-policy';
import type { EmailSendInput, EmailSendResult, EmailSender } from './email.types';

const log = new Logger('EmailSender');

function dropSecrets(params: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (['otp', 'token', 'to', 'email', 'signingUrl'].includes(key)) continue;
    if (typeof value === 'string' && value.includes('v1s.')) continue;
    safe[key] = value;
  }
  return safe;
}

/** Sandbox: log a masked destination and do not call a provider. */
export class SandboxEmailSender implements EmailSender {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    log.log(
      `email sandbox ${input.templateId} → ${maskChannelDest(input.to)} (${input.trackingId}) ${JSON.stringify(dropSecrets(input.params))}`,
    );
    return { providerRef: `sandbox_${input.trackingId}` };
  }
}

/**
 * Live HTTP post. Host and key come from env. SMTP and SES are only labels
 * for which credential names must be present; this class does not hard-code a vendor.
 */
export class LiveEmailSender implements EmailSender {
  constructor(
    private readonly read: (key: string) => string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const url = this.read('EMAIL_PROVIDER_URL')?.trim();
    const apiKey = this.read('EMAIL_PROVIDER_API_KEY')?.trim();
    if (!url || !apiKey) {
      throw new UnprocessableEntityException({ detail: 'email provider is not configured' });
    }
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        to: input.to,
        templateId: input.templateId,
        params: input.params,
        trackingId: input.trackingId,
        provider: this.read('EMAIL_PROVIDER')?.trim(),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`email provider failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json().catch(() => ({}))) as { providerRef?: string; messageId?: string };
    log.log(`email live ${input.templateId} → ${maskChannelDest(input.to)} ref=${json.providerRef ?? json.messageId ?? input.trackingId}`);
    return { providerRef: json.providerRef ?? json.messageId ?? `live_${input.trackingId}` };
  }
}

export function assertLiveEmailCredentials(read: (key: string) => string | undefined): void {
  const provider = read('EMAIL_PROVIDER')?.trim().toLowerCase() ?? '';
  if (provider !== 'smtp' && provider !== 'ses') {
    throw new UnprocessableEntityException({ detail: 'email provider is not configured' });
  }
  if (provider === 'smtp') {
    const host = read('EMAIL_SMTP_HOST')?.trim();
    const user = read('EMAIL_SMTP_USER')?.trim();
    const pass = read('EMAIL_SMTP_PASS')?.trim();
    const from = read('EMAIL_FROM')?.trim();
    if (!host || !user || !pass || !from) {
      throw new UnprocessableEntityException({ detail: 'email smtp is not configured' });
    }
  }
  if (provider === 'ses') {
    const region = read('EMAIL_SES_REGION')?.trim();
    const key = read('EMAIL_SES_ACCESS_KEY_ID')?.trim();
    const secret = read('EMAIL_SES_SECRET_ACCESS_KEY')?.trim();
    const from = read('EMAIL_FROM')?.trim();
    if (!region || !key || !secret || !from) {
      throw new UnprocessableEntityException({ detail: 'email ses is not configured' });
    }
  }
  if (!read('EMAIL_PROVIDER_URL')?.trim() || !read('EMAIL_PROVIDER_API_KEY')?.trim()) {
    throw new UnprocessableEntityException({ detail: 'email provider is not configured' });
  }
}
