import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  beginSsoAuthorize,
  fetchSsoProviders,
  upsertSsoProvider,
  type SsoProvider,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AuthSsoPage() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [label, setLabel] = useState('Azure AD OIDC');
  const [issuerUrl, setIssuerUrl] = useState('https://login.microsoftonline.com/common/v2.0');
  const [clientId, setClientId] = useState('wereal-sso-pilot');
  const [pilotEmail, setPilotEmail] = useState('agent@sunrise-dev.vn');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSsoProviders();
      setProviders(res.data);
      if (res.data.length > 0) {
        setSelectedProviderId((prev) => prev || res.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải SSO providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpsert(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await upsertSsoProvider({
        type: 'OIDC',
        label: label.trim(),
        issuerUrl: issuerUrl.trim(),
        clientId: clientId.trim(),
        enabled: true,
      });
      setProviders(res.data);
      if (res.data.length > 0) setSelectedProviderId(res.data[res.data.length - 1].id);
      setToast('Đã lưu OIDC provider — UC-ID-06');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu provider thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleOidcLogin() {
    if (!selectedProviderId || !pilotEmail.trim()) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await beginSsoAuthorize({
        providerId: selectedProviderId,
        emailHint: pilotEmail.trim(),
      });
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SSO authorize thất bại');
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: brand.background }}
    >
      <div className="w-full max-w-lg space-y-6">
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: brand.primary }}>
              WEREAL Auth
            </p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: brand.primaryDark }}>
              SSO / OIDC
            </h1>
            <p className="text-sm mt-2" style={{ color: brand.muted }}>
              UC-ID-06 · SCR-AUTH-002 · Enterprise identity
            </p>
          </div>

          {toast && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
              {toast}
            </p>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleUpsert}>
            <h2 className="font-semibold text-sm">Cấu hình OIDC provider</h2>
            <label className="block text-sm">
              <span className="font-medium">Label</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Issuer URL</span>
              <input
                value={issuerUrl}
                onChange={(e) => setIssuerUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Client ID</span>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-mono"
                style={{ borderColor: brand.border }}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang lưu…' : 'Lưu provider'}
            </button>
          </form>
        </div>

        <div
          className="rounded-2xl p-8 space-y-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold text-sm">Đăng nhập OIDC</h2>
          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Đang tải providers…
            </p>
          ) : providers.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Chưa có provider — cấu hình OIDC ở trên.
            </p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="font-medium">Provider</span>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                  style={{ borderColor: brand.border }}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.type})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Email pilot</span>
                <input
                  type="email"
                  value={pilotEmail}
                  onChange={(e) => setPilotEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                  style={{ borderColor: brand.border }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !selectedProviderId}
                onClick={() => void handleOidcLogin()}
                className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                style={{ background: brand.primaryDark }}
              >
                {busy ? 'Đang chuyển IdP…' : 'Sign in with OIDC'}
              </button>
              <p className="text-xs" style={{ color: brand.muted }}>
                Mock mode: redirect callback → JWT → /agent (SSO_OIDC_USE_MOCK=true)
              </p>
            </>
          )}
        </div>

        <Link to="/auth/login" className="block text-center text-sm underline" style={{ color: brand.muted }}>
          ← Về đăng nhập thường
        </Link>
      </div>
    </div>
  );
}
