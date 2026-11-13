import { createHmac, timingSafeEqual } from 'crypto';

/** Access ticket for one contract. Not a legal signature. D08 stays unsigned. */
export const CONTRACT_SIGN_TOKEN_TTL_MS = 15 * 60 * 1000;

type Claims = { tenantId: string; contractId: string; exp: number };

export function mintContractSignToken(input: {
  tenantId: string;
  contractId: string;
  secret: string;
  now?: number;
}): string {
  const body = Buffer.from(
    JSON.stringify({
      tenantId: input.tenantId,
      contractId: input.contractId,
      exp: (input.now ?? Date.now()) + CONTRACT_SIGN_TOKEN_TTL_MS,
    } satisfies Claims),
  ).toString('base64url');
  const sig = createHmac('sha256', input.secret).update(body).digest('base64url');
  return `v1s.${body}.${sig}`;
}

export function readContractSignToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Claims | null {
  if (!secret || secret.length < 16 || !token?.startsWith('v1s.')) return null;
  const [, body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Claims;
    if (!claims.tenantId || !claims.contractId || claims.exp <= now) return null;
    return claims;
  } catch {
    return null;
  }
}
