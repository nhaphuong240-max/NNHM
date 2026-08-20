import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import {
  connectZaloOAuth,
  fetchZaloIntegrationStatus,
  sendZaloZns,
  simulateZaloLead,
  startZaloOAuthRedirect,
  verifyZaloOAuth,
  type ZaloIntegrationStatus,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminZaloIntegrationPage() {
  const [status, setStatus] = useState<ZaloIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('Lead Zalo AC-US-NW-01');
  const [phone, setPhone] = useState('0901234888');
  const [znsPhone, setZnsPhone] = useState('+84901234567');
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [refreshToken, setRefreshToken] = useState('');

  const graphModeLabel =
    status?.graphMode === 'LIVE'
      ? 'Graph API LIVE'
      : status?.graphMode === 'UNCONFIGURED'
        ? 'Live chưa cấu hình'
        : 'Sandbox (dev default)';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchZaloIntegrationStatus();
      setStatus(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được Zalo integration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (!oauth) return;

    if (oauth === 'success') {
      const oaId = params.get('oaId');
      const graphMode = params.get('graphMode');
      setMessage(
        `OAuth thành công${oaId ? ` · ${oaId}` : ''}${graphMode ? ` · ${graphMode}` : ''}`,
      );
      void load();
    } else if (oauth === 'error') {
      setError(params.get('message') ?? 'Zalo OAuth thất bại');
    }

    params.delete('oauth');
    params.delete('oaId');
    params.delete('graphMode');
    params.delete('message');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [load]);

  async function handleSimulate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await simulateZaloLead({ fullName, phone });
      setMessage(`Lead ${res.leadId} · ${res.msgId}${res.idempotentReplay ? ' (replay)' : ''}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulate thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendZns() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await sendZaloZns({ phone: znsPhone });
      setMessage(
        `ZNS ${res.deliveryId} · ${res.status}${res.sandbox ? ' (sandbox)' : ` · ${res.graphMode ?? 'LIVE'}`}`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi ZNS thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartOAuth() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await startZaloOAuthRedirect(status?.oas[0]?.oaId);
      window.location.href = res.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được Zalo OAuth');
      setBusy(false);
    }
  }

  async function handleConnectOAuth() {
    if (!refreshToken.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await connectZaloOAuth({ refreshToken: refreshToken.trim() });
      setMessage(`OAuth connected · ${res.oaId} · mode ${res.graphMode}`);
      setRefreshToken('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect OAuth thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOAuth() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await verifyZaloOAuth();
      if (res.ok) {
        setMessage(`Graph OK · ${res.oaName ?? res.oaId}${res.verified ? ' · verified' : ''}`);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verify Graph thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Zalo OA / ZNS"
      subtitle="UC-NW-01 · AC-US-NW-01 · BR-05 lead sync + ZNS notify"
      screenTag="Admin / SCR-ADMIN-013"
    >
      {loading ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Đang tải…
        </p>
      ) : status ? (
        <div className="space-y-6">
          <p
            className="text-sm rounded-lg px-3 py-2 inline-block font-medium"
            style={{
              background: status.graphMode === 'LIVE' ? '#DCFCE7' : '#EFF6FF',
              color: status.graphMode === 'LIVE' ? brand.success : brand.primary,
            }}
          >
            {graphModeLabel}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                OA connected
              </p>
              <p className="text-2xl font-bold mt-1">{status.oas.length}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Leads synced
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: brand.success }}>
                {status.stats.leadsProcessed}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                ZNS sent
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#0068FF' }}>
                {status.stats.znsSent}
              </p>
            </div>
          </div>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">Connected OA</h2>
            {status.oas.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa bind OA — chạy seed hoặc cấu hình DB.
              </p>
            ) : (
              <ul className="text-sm space-y-2">
                {status.oas.map((o) => (
                  <li key={o.id} className="font-mono">
                    {o.oaName} · {o.oaId}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs" style={{ color: brand.muted }}>
              Templates: {status.templates.join(', ')}
            </p>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#E8F4FF', border: '1px solid #0068FF' }}
          >
            <h2 className="font-semibold">AC-US-NW-01 Sandbox simulate</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              Giả lập tin nhắn OA → CRM + AI scoring (không cần Zalo Developer app).
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Họ tên"
                className="h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSimulate()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#0068FF' }}
            >
              Simulate Zalo lead
            </button>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">Graph API OAuth (PKCE redirect)</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              Admin OA bấm ủy quyền trên Zalo → callback lưu token tự động. Callback URL phải
              khớp Zalo Developer app.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartOAuth()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#0068FF' }}
              >
                Connect with Zalo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleVerifyOAuth()}
                className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: '#E2E8F0', color: '#334155' }}
              >
                Verify Graph API
              </button>
            </div>
            <p className="text-xs" style={{ color: brand.muted }}>
              Set <code className="font-mono">ZALO_ZNS_SANDBOX=false</code> để gửi ZNS live sau khi
              connect.
            </p>
            <button
              type="button"
              className="text-xs underline"
              style={{ color: brand.muted }}
              onClick={() => setShowAdvancedOAuth((v) => !v)}
            >
              {showAdvancedOAuth ? 'Ẩn' : 'Advanced'} — paste refresh token
            </button>
            {showAdvancedOAuth && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: brand.border }}>
                <input
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="refresh_token"
                  className="h-9 px-3 rounded-lg border text-sm w-full max-w-lg font-mono"
                  style={{ borderColor: brand.border }}
                />
                <button
                  type="button"
                  disabled={busy || !refreshToken.trim()}
                  onClick={() => void handleConnectOAuth()}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#334155' }}
                >
                  Connect manual
                </button>
              </div>
            )}
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">ZNS notify</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              Sandbox mặc định — live gọi{' '}
              <span className="font-mono text-xs">business.openapi.zalo.me</span> khi tắt sandbox.
            </p>
            <input
              value={znsPhone}
              onChange={(e) => setZnsPhone(e.target.value)}
              placeholder="Phone nhận ZNS"
              className="h-9 px-3 rounded-lg border text-sm max-w-xs"
              style={{ borderColor: brand.border }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSendZns()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ml-0 sm:ml-3"
              style={{ background: '#334155' }}
            >
              Send ZNS
            </button>
          </section>

          <section>
            <h2 className="font-semibold mb-3">Recent inbound events</h2>
            {status.recentEvents.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có webhook nào.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: brand.border }}>
                      <th className="py-2 pr-3">msg_id</th>
                      <th className="py-2 pr-3">lead</th>
                      <th className="py-2 pr-3">status</th>
                      <th className="py-2">time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.recentEvents.map((e) => (
                      <tr key={e.id} className="border-b" style={{ borderColor: brand.border }}>
                        <td className="py-2 pr-3 font-mono text-xs">{e.msgId}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{e.leadId ?? '—'}</td>
                        <td className="py-2 pr-3">{e.status}</td>
                        <td className="py-2 text-xs" style={{ color: brand.muted }}>
                          {new Date(e.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {message && (
        <p className="mt-4 text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
    </AdminShell>
  );
}
