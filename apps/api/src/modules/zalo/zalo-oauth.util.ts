import { createHash, randomBytes } from 'crypto';

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export function generateOAuthState(): string {
  return randomBytes(16).toString('hex');
}

export function buildZaloOaAuthorizationUrl(input: {
  appId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL('https://oauth.zaloapp.com/v4/oa/permission');
  url.searchParams.set('app_id', input.appId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('state', input.state);
  return url.toString();
}
