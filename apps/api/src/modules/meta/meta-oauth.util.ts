import { randomBytes } from 'crypto';

export const META_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'leads_retrieval',
  'pages_manage_metadata',
] as const;

export function generateOAuthState(): string {
  return randomBytes(16).toString('hex');
}

export function buildMetaAuthorizationUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}): string {
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', input.appId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('state', input.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', (input.scopes ?? META_OAUTH_SCOPES).join(','));
  return url.toString();
}
