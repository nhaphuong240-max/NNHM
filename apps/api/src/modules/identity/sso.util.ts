export type SsoProviderType = 'OIDC' | 'SAML';

export type SsoProviderConfig = {
  id: string;
  type: SsoProviderType;
  label: string;
  issuerUrl: string;
  clientId: string;
  enabled: boolean;
  roleMapping: Record<string, string>;
  createdAt: string;
};

export const DEFAULT_SSO_ROLE_MAPPING: Record<string, string> = {
  'enterprise-agent': 'AGENT',
  'enterprise-admin': 'PLATFORM_ADMIN',
};

export function validateSsoProvider(input: {
  type: SsoProviderType;
  label: string;
  issuerUrl: string;
  clientId: string;
}): string[] {
  const errors: string[] = [];
  if (!input.label?.trim()) errors.push('label_required');
  if (!input.issuerUrl?.startsWith('https://')) errors.push('issuer_https_required');
  if (!input.clientId?.trim()) errors.push('client_id_required');
  return errors;
}
