import type { ContractSignChannel } from './contract-sign-token';

export const ESIGN_LINK_CHANNEL_ENV = 'ESIGN_LINK_CHANNEL';
export const ESIGN_LINK_FALLBACK_CHANNELS_ENV = 'ESIGN_LINK_FALLBACK_CHANNELS';
export const ESIGN_ZNS_ENABLED_ENV = 'ESIGN_ZNS_ENABLED';
export const ESIGN_SIGNING_BASE_URL_ENV = 'ESIGN_SIGNING_BASE_URL';

export type EsignDest = { channel: ContractSignChannel; value: string };

export function parseEsignChannel(raw: string | undefined): ContractSignChannel | null {
  const value = raw?.trim().toUpperCase();
  if (value === 'EMAIL' || value === 'SMS' || value === 'ZALO') return value;
  return null;
}

export function parseFallbackChannels(raw: string | undefined): ContractSignChannel[] {
  const text = raw?.trim() ?? '';
  if (!text) return [];
  return text
    .split(',')
    .map((item) => parseEsignChannel(item))
    .filter((item): item is ContractSignChannel => item !== null);
}

export function znsEnabled(raw: string | undefined): boolean {
  return raw?.trim() === 'true';
}

export function pickRegisteredChannel(input: {
  preferred: ContractSignChannel | null;
  fallback: ContractSignChannel[];
  dest: Partial<Record<ContractSignChannel, string | null | undefined>>;
  znsOn: boolean;
}): { ok: true; dest: EsignDest } | { ok: false; detail: string } {
  if (!input.preferred) return { ok: false, detail: 'esign link channel is not configured' };
  const order = [input.preferred, ...input.fallback.filter((item) => item !== input.preferred)];
  for (const channel of order) {
    if (channel === 'ZALO' && !input.znsOn) {
      if (channel === input.preferred && input.fallback.length === 0) {
        return { ok: false, detail: 'esign zalo is disabled' };
      }
      continue;
    }
    const value = input.dest[channel]?.trim();
    if (value) return { ok: true, dest: { channel, value } };
    if (channel === input.preferred && input.fallback.length === 0) {
      return {
        ok: false,
        detail:
          channel === 'EMAIL'
            ? 'signer email is not registered'
            : channel === 'SMS'
              ? 'signer phone is not registered'
              : 'signer zalo is not registered',
      };
    }
  }
  return { ok: false, detail: 'signer channel destination is not registered' };
}

export function buildSigningUrl(baseUrl: string, input: { contractId: string; tenantId: string; token: string }): string {
  const url = new URL(baseUrl);
  url.searchParams.set('contractId', input.contractId);
  url.searchParams.set('tenantId', input.tenantId);
  url.hash = `signToken=${encodeURIComponent(input.token)}`;
  return url.toString();
}

export function sandboxOutboxEnabled(nodeEnv: string | undefined, flag: string | undefined): boolean {
  return nodeEnv === 'test' || flag?.trim() === 'true';
}
