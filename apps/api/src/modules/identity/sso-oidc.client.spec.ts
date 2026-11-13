import {
  buildAuthorizeUrl,
  buildMockAuthorizeUrl,
  createOidcState,
  fetchOidcDiscovery,
  parseIdTokenClaims,
  parseOidcState,
} from './sso-oidc.client';

describe('sso-oidc.client', () => {
  it('creates and parses OIDC state', () => {
    const secret = 'sso-state-secret-for-test';
    const state = createOidcState({ tenantId: 'ten_dev_01', providerId: 'sso_1' }, secret);
    const parsed = parseOidcState(state, secret);
    expect(parsed?.tenantId).toBe('ten_dev_01');
    expect(parseOidcState(state, 'other-secret-value')).toBeNull();
    expect(parseOidcState(Buffer.from('{"tenantId":"ten_dev_01"}').toString('base64url'), secret)).toBeNull();
  });

  it('buildAuthorizeUrl includes PKCE params', () => {
    const url = buildAuthorizeUrl({
      discovery: {
        issuer: 'https://issuer.example',
        authorization_endpoint: 'https://issuer.example/authorize',
        token_endpoint: 'https://issuer.example/token',
      },
      clientId: 'client',
      redirectUri: 'https://app/callback',
      state: 'state123',
      codeChallenge: 'challenge',
    });
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('client_id=client');
  });

  it('buildMockAuthorizeUrl returns mock code', () => {
    const url = buildMockAuthorizeUrl({
      callbackUrl: 'http://localhost:3000/api/v1/auth/sso/callback',
      state: 'abc',
    });
    expect(url).toContain('mock_sso_code');
    expect(url).toContain('state=abc');
  });

  it('parseIdTokenClaims reads email', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'a@b.com', sub: '1' })).toString('base64url');
    const claims = parseIdTokenClaims(`header.${payload}.sig`);
    expect(claims.email).toBe('a@b.com');
  });

  it('fetchOidcDiscovery throws on HTTP error', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    await expect(fetchOidcDiscovery('https://bad.example')).rejects.toThrow('OIDC discovery failed');
  });
});
