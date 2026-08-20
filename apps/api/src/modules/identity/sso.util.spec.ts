import { validateSsoProvider } from './sso.util';

describe('sso.util', () => {
  it('requires https issuer', () => {
    const errors = validateSsoProvider({
      type: 'OIDC',
      label: 'Corp IdP',
      issuerUrl: 'http://bad.example',
      clientId: 'client',
    });
    expect(errors).toContain('issuer_https_required');
  });
});
