import { createHash, randomBytes } from 'crypto';

export type OidcDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
};

export type OidcTokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

export type OidcIdTokenClaims = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  groups?: string[];
  [key: string]: unknown;
};

export function createPkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createOidcState(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function parseOidcState(state: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchOidcDiscovery(issuerUrl: string): Promise<OidcDiscovery> {
  const base = issuerUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/.well-known/openid-configuration`);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status}`);
  }
  const json = (await res.json()) as OidcDiscovery;
  if (!json.authorization_endpoint || !json.token_endpoint) {
    throw new Error('OIDC discovery missing endpoints');
  }
  return json;
}

export function buildAuthorizeUrl(input: {
  discovery: OidcDiscovery;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}) {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', input.scope ?? 'openid profile email');
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeAuthorizationCode(input: {
  discovery: OidcDiscovery;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code_verifier: input.codeVerifier,
  });

  const res = await fetch(input.discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json()) as OidcTokenResponse & { error?: string; error_description?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error_description ?? json.error ?? `OIDC token exchange failed: ${res.status}`);
  }
  return json;
}

export function parseIdTokenClaims(idToken: string): OidcIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length < 2) return {};
  try {
    return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as OidcIdTokenClaims;
  } catch {
    return {};
  }
}

/** Dev mock authorize URL — redirects to our callback with synthetic code */
export function buildMockAuthorizeUrl(input: {
  callbackUrl: string;
  state: string;
}) {
  const url = new URL(input.callbackUrl);
  url.searchParams.set('code', 'mock_sso_code');
  url.searchParams.set('state', input.state);
  return url.toString();
}
