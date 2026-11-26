import { createHmac, timingSafeEqual } from 'crypto';

/** Access ticket for one contract. Not a legal signature. D08 stays unsigned. */
export const CONTRACT_SIGN_TOKEN_TTL_MS = 15 * 60 * 1000;

export const CONTRACT_SIGN_CHANNELS = ['EMAIL', 'SMS', 'ZALO'] as const;
export type ContractSignChannel = (typeof CONTRACT_SIGN_CHANNELS)[number];

export type ContractSignClaims = {
  tenantId: string;
  contractId: string;
  buyerId: string;
  signerId: string;
  requestId: string;
  jti: string;
  channel: ContractSignChannel;
  exp: number;
};

/** Only CONTRACT_SIGN_SECRET. A missing or short value rejects the sign route. */
export function contractSignSecret(read: (key: string) => string | undefined): string | null {
  const secret = read('CONTRACT_SIGN_SECRET')?.trim() ?? '';
  return secret.length >= 16 ? secret : null;
}

function isChannel(value: unknown): value is ContractSignChannel {
  return value === 'EMAIL' || value === 'SMS' || value === 'ZALO';
}

function filled(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function mintContractSignToken(input: {
  tenantId: string;
  contractId: string;
  buyerId: string;
  signerId: string;
  requestId: string;
  jti: string;
  channel: ContractSignChannel;
  secret: string;
  now?: number;
}): string {
  const claims: ContractSignClaims = {
    tenantId: input.tenantId.trim(),
    contractId: input.contractId.trim(),
    buyerId: input.buyerId.trim(),
    signerId: input.signerId.trim(),
    requestId: input.requestId.trim(),
    jti: input.jti.trim(),
    channel: input.channel,
    exp: (input.now ?? Date.now()) + CONTRACT_SIGN_TOKEN_TTL_MS,
  };
  if (
    !claims.tenantId ||
    !claims.contractId ||
    !claims.buyerId ||
    !claims.signerId ||
    !claims.requestId ||
    !claims.jti ||
    !isChannel(claims.channel)
  ) {
    throw new Error('contract sign token is missing a binding');
  }
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = createHmac('sha256', input.secret).update(body).digest('base64url');
  return `v1s.${body}.${sig}`;
}

export function readContractSignToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): ContractSignClaims | null {
  if (!secret || secret.length < 16 || !token?.startsWith('v1s.')) return null;
  const [, body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ContractSignClaims;
    if (
      !filled(claims.tenantId) ||
      !filled(claims.contractId) ||
      !filled(claims.buyerId) ||
      !filled(claims.signerId) ||
      !filled(claims.requestId) ||
      !filled(claims.jti) ||
      !isChannel(claims.channel) ||
      claims.exp <= now
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
