import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import {
  connectMetaPage,
  fetchMetaIntegrationStatus,
  simulateMetaLead,
  startMetaOAuthRedirect,
  type MetaIntegrationStatus,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminMetaIntegrationPage() {
  const [status, setStatus] = useState<MetaIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('Lead Meta TC-21');
  const [phone, setPhone] = useState('+84901239999');
  const [campaignId, setCampaignId] = useState('camp_sunrise_july');
  const [pageId, setPageId] = useState('page_sunrise_dev');
  const [pageToken, setPageToken] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMetaIntegrationStatus();
      setStatus(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được Meta integration');
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
      const pageId = params.get('pageId');
      const pageCount = params.get('pageCount');
      const graphMode = params.get('graphMode');
      setMessage(
        `OAuth thành công${pageId ? ` · ${pageId}` : ''}${pageCount ? ` · ${pageCount} page(s)` : ''}${graphMode ? ` · ${graphMode}` : ''}`,
      );
      void load();
    } else if (oauth === 'error') {
      setError(params.get('message') ?? 'Meta OAuth thất bại');
    }

    params.delete('oauth');
    params.delete('pageId');
    params.delete('pageName');
    params.delete('pageCount');
    params.delete('graphMode');
    params.delete('message');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [load]);

  async function handleStartOAuth() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await startMetaOAuthRedirect();
      window.location.href = res.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được Meta OAuth');
      setBusy(false);
    }
  }

  async function handleConnectPage() {
    if (!pageId.trim() || !pageToken.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await connectMetaPage({
        pageId: pageId.trim(),
        pageAccessToken: pageToken.trim(),
      });
      setMessage(`Connected page ${res.data.pageId} · Graph fetch enabled`);
      setPageToken('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect page thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleSimulate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await simulateMetaLead({ fullName, phone, campaignId });
      setMessage(`Lead ${res.leadId} · ${res.leadgenId}${res.idempotentReplay ? ' (replay)' : ''}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulate thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Meta Lead Ads"
      subtitle="UC-NW-02 · TC-21 · Meta trước Zalo (BR-05)"
      screenTag="Admin / SCR-ADMIN-011"
    >
      {loading ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Đang tải…
        </p>
      ) : status ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Pages connected
              </p>
              <p className="text-2xl font-bold mt-1">{status.pages.length}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Leads synced
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: brand.success }}>
                {status.stats.processed}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Failed
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: brand.destructive }}>
                {status.stats.failed}
              </p>
            </div>
          </div>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">Connected pages</h2>
            {status.pages.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa bind page — chạy seed hoặc cấu hình DB.
              </p>
            ) : (
              <ul className="text-sm space-y-2">
                {status.pages.map((p) => (
                  <li key={p.id} className="font-mono">
                    {p.pageName} · {p.pageId}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs" style={{ color: brand.muted }}>
              Zalo OA (UC-NW-01) — live tại{' '}
              <a href="/admin/integrations/zalo" className="underline">
                /admin/integrations/zalo
              </a>
            </p>
            <div className="pt-3 border-t space-y-2" style={{ borderColor: brand.border }}>
              <p className="text-sm font-medium">Phase 2 — Connect with Facebook OAuth</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartOAuth()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#1877F2' }}
              >
                Connect with Facebook
              </button>
              <p className="text-xs" style={{ color: brand.muted }}>
                Hoặc bind thủ công page access token bên dưới (dev / fallback).
              </p>
              <p className="text-sm font-medium pt-2">Manual page token</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="Page ID"
                  className="rounded-lg border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: brand.border }}
                />
                <input
                  value={pageToken}
                  onChange={(e) => setPageToken(e.target.value)}
                  placeholder="Page access token"
                  type="password"
                  className="rounded-lg border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: brand.border }}
                />
              </div>
              <button
                type="button"
                disabled={busy || !pageToken.trim()}
                onClick={() => void handleConnectPage()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                Connect page (Graph fetch)
              </button>
            </div>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
          >
            <h2 className="font-semibold">TC-21 Sandbox simulate</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              Gửi lead giả lập webhook → CRM + AI scoring (không cần Facebook app).
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
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
              <input
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="campaign_id"
                className="h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSimulate()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              Simulate Meta lead
            </button>
          </section>

          <section>
            <h2 className="font-semibold mb-3">Recent events</h2>
            {status.recentEvents.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có webhook nào.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: brand.border }}>
                      <th className="py-2 pr-3">leadgen</th>
                      <th className="py-2 pr-3">lead</th>
                      <th className="py-2 pr-3">status</th>
                      <th className="py-2">time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.recentEvents.map((e) => (
                      <tr key={e.id} className="border-b" style={{ borderColor: brand.border }}>
                        <td className="py-2 pr-3 font-mono text-xs">{e.leadgenId}</td>
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
