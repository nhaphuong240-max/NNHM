import { buildMetaAuthorizationUrl } from './meta-oauth.util';

describe('meta-oauth.util', () => {
  it('builds Facebook OAuth URL with scopes', () => {
    const url = buildMetaAuthorizationUrl({
      appId: 'app_123',
      redirectUri: 'http://localhost:3000/callback',
      state: 'state_abc',
    });
    expect(url).toContain('facebook.com/v21.0/dialog/oauth');
    expect(url).toContain('client_id=app_123');
    expect(url).toContain('state=state_abc');
    expect(url).toContain('leads_retrieval');
  });
});
