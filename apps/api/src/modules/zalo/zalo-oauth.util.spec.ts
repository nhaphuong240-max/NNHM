import {
  buildZaloOaAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from './zalo-oauth.util';

describe('zalo-oauth.util', () => {
  it('builds PKCE challenge from verifier', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThan(20);
    expect(generateCodeChallenge(verifier)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('builds Zalo OA authorization URL with PKCE', () => {
    const url = buildZaloOaAuthorizationUrl({
      appId: 'app_123',
      redirectUri: 'http://localhost:3000/api/v1/integrations/zalo/oauth/callback',
      codeChallenge: 'challenge_abc',
      state: 'state_xyz',
    });
    expect(url).toContain('oauth.zaloapp.com/v4/oa/permission');
    expect(url).toContain('app_id=app_123');
    expect(url).toContain('code_challenge=challenge_abc');
    expect(url).toContain('state=state_xyz');
  });
});
