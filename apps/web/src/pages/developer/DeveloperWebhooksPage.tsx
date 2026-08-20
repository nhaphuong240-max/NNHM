import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  createTenantWebhook,
  fetchTenantWebhooks,
  simulateTenantWebhook,
  toggleTenantWebhook,
  type TenantWebhookDelivery,
  type TenantWebhookEvent,
  type TenantWebhookSubscription,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function DeveloperWebhooksPage() {
  const [subscriptions, setSubscriptions] = useState<TenantWebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<TenantWebhookDelivery[]>([]);
  const [events, setEvents] = useState<TenantWebhookEvent[]>([]);
  const [label, setLabel] = useState('ERP sync hook');
  const [targetUrl, setTargetUrl] = useState('https://hooks.example.com/wereal');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTenantWebhooks();
      setSubscriptions(res.data.subscriptions);
      setDeliveries(res.data.recentDeliveries);
      setEvents(res.data.availableEvents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    setNewSecret(null);
    setToast(null);
    try {
      const res = await createTenantWebhook({
        label: label.trim(),
        targetUrl: targetUrl.trim(),
        events: events.length ? events : undefined,
      });
      setNewSecret(res.data.secret);
      setToast(`Đã tạo subscription ${res.data.subscription.id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo webhook thất bại');
    }
  }

  async function handleSimulate(subscriptionId: string) {
    setBusyId(subscriptionId);
    setError(null);
    try {
      const res = await simulateTenantWebhook(subscriptionId, 'booking.deposited');
      setToast(`Simulate ${res.data.status} · ${res.data.event}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulate thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(subscription: TenantWebhookSubscription) {
    setBusyId(subscription.id);
    setError(null);
    try {
      await toggleTenantWebhook(subscription.id, !subscription.enabled);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật webhook thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DeveloperShell
      title="Outbound webhooks"
      subtitle="UC-NW-05 · SCR-DEV-013 · Tenant event delivery"
      screenTag="Developer / Integrations"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/api-marketplace" className="underline" style={{ color: brand.muted }}>
          API Marketplace (partner)
        </Link>
        <button type="button" className="underline" onClick={() => void load()}>
          Làm mới
        </button>
      </div>

      {toast && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
          {toast}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      <section
        className="rounded-xl p-4 mb-6 space-y-3"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <h3 className="font-semibold text-sm">Tạo subscription</h3>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          style={{ borderColor: brand.border }}
        />
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://…"
          style={{ borderColor: brand.border }}
        />
        <p className="text-xs" style={{ color: brand.muted }}>
          Events: {events.join(', ') || 'booking.created, …'}
        </p>
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: brand.primary }}
          onClick={() => void handleCreate()}
        >
          Tạo webhook
        </button>
        {newSecret && (
          <p className="text-xs break-all" style={{ color: brand.success }}>
            Secret (copy once): <code>{newSecret}</code>
          </p>
        )}
      </section>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Subscriptions ({subscriptions.length})</h3>
            {subscriptions.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có webhook — tạo subscription ở trên.
              </p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl p-4 flex flex-wrap justify-between gap-3"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{sub.label}</p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background: sub.enabled ? '#DCFCE7' : '#F1F5F9',
                          color: sub.enabled ? brand.success : brand.muted,
                        }}
                      >
                        {sub.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-mono break-all" style={{ color: brand.muted }}>
                      {sub.id} · {sub.targetUrl}
                    </p>
                    <p className="text-xs mt-1" style={{ color: brand.muted }}>
                      {sub.secretPrefix} · {sub.events.join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm items-center">
                    <button
                      type="button"
                      disabled={busyId === sub.id}
                      className="underline disabled:opacity-50"
                      style={{ color: brand.primary }}
                      onClick={() => void handleSimulate(sub.id)}
                    >
                      Simulate
                    </button>
                    <button
                      type="button"
                      disabled={busyId === sub.id}
                      className="underline disabled:opacity-50"
                      style={{ color: brand.muted }}
                      onClick={() => void handleToggle(sub)}
                    >
                      {sub.enabled ? 'Tắt' : 'Bật'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {deliveries.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm mb-2">Recent deliveries</h3>
              <ul className="text-xs space-y-2" style={{ color: brand.muted }}>
                {deliveries.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: d.mode === 'live' ? '#EFF6FF' : '#FEF3C7',
                        color: d.mode === 'live' ? brand.primary : brand.warning,
                      }}
                    >
                      {d.mode === 'live' ? 'LIVE' : 'SIMULATE'}
                    </span>
                    <span>
                      {d.id} · {d.event} · {d.status}
                      {d.attempt > 1 ? ` · attempt ${d.attempt}` : ''}
                      {d.error ? ` · ${d.error}` : ''}
                      {d.nextRetryAt ? ` · retry ${new Date(d.nextRetryAt).toLocaleTimeString('vi-VN')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </DeveloperShell>
  );
}
