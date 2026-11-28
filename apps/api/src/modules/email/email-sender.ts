import { Logger, UnprocessableEntityException } from '@nestjs/common';
import { maskChannelDest } from '../booking/esign-otp-policy';
import { EMAIL_TEMPLATE_COPY, type EmailSendInput, type EmailSendResult, type EmailSender } from './email.types';

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
      `email sandbox ${input.templateId} → ${maskChannelDest(input.to)} (${input.trackingId}) ${EMAIL_TEMPLATE_COPY[input.templateId] ?? JSON.stringify(dropSecrets(input.params))}`,
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
      await res.text().catch(() => '');
      throw new Error('email provider failed');
    }
    const json = (await res.json().catch(() => ({}))) as { providerRef?: string; messageId?: string };
    log.log(`email live ${input.templateId} → ${maskChannelDest(input.to)} ref=${json.providerRef ?? json.messageId ?? input.trackingId}`);
    return { providerRef: json.providerRef ?? json.messageId ?? `live_${input.trackingId}` };
  }
}

/** Live send is a generic HTTP relay. smtp and ses are labels only; no vendor SDK. */
export function assertLiveEmailCredentials(read: (key: string) => string | undefined): void {
  const provider = read('EMAIL_PROVIDER')?.trim().toLowerCase() ?? '';
  if (provider !== 'smtp' && provider !== 'ses') {
    throw new UnprocessableEntityException({ detail: 'email provider is not configured' });
  }
  const from = read('EMAIL_FROM')?.trim();
  if (!from || !read('EMAIL_PROVIDER_URL')?.trim() || !read('EMAIL_PROVIDER_API_KEY')?.trim()) {
    throw new UnprocessableEntityException({ detail: 'email provider is not configured' });
  }
}
