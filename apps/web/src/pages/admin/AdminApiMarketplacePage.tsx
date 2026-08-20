import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchApiMarketplace,
  registerApiPartner,
  simulateApiPartnerWebhook,
  type ApiPartner,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminApiMarketplacePage() {
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [deliveries, setDeliveries] = useState<{ id: string; event: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState('Partner Demo Co');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApiMarketplace();
      setPartners(res.data.partners);
      setDeliveries(res.data.recentDeliveries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải API marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRegister() {
    setError(null);
    setNewKey(null);
    try {
      const res = await registerApiPartner({
        name: name.trim(),
        category: 'ERP',
        webhookUrl: 'https://partner.example/wereal/hook',
      });
      setNewKey(res.data.apiKey);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Register thất bại');
    }
  }

  async function handleSimulate(partnerId: string) {
    setError(null);
    try {
      await simulateApiPartnerWebhook(partnerId, 'booking.deposited');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Webhook simulate thất bại');
    }
  }

  return (
    <AdminShell
      title="API Marketplace"
      subtitle="UC-NW-04 · SCR-ADMIN-004 · Partner webhooks"
      screenTag="Admin / Integrations"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/payment-gateways" className="underline" style={{ color: brand.primary }}>
          Payment gateways
        </Link>
        <Link to="/admin/integrations/meta" className="underline" style={{ color: brand.muted }}>
          Meta
        </Link>
      </div>

      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-6">
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold text-sm">Register partner</h3>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: brand.primary }}
              onClick={() => void handleRegister()}
            >
              Issue API key
            </button>
            {newKey && (
              <p className="text-xs break-all" style={{ color: brand.success }}>
                API key (copy once): <code>{newKey}</code>
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Partners ({partners.length})</h3>
            {partners.map((p) => (
              <div
                key={p.id}
                className="rounded-xl p-4 flex flex-wrap justify-between gap-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {p.id} · {p.category} · {p.status} · {p.eventsConsumed} events
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm underline"
                  style={{ color: brand.primary }}
                  onClick={() => void handleSimulate(p.id)}
                >
                  Simulate webhook
                </button>
              </div>
            ))}
          </section>

          {deliveries.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm mb-2">Recent deliveries</h3>
              <ul className="text-xs space-y-1" style={{ color: brand.muted }}>
                {deliveries.map((d) => (
                  <li key={d.id}>
                    {d.id} · {d.event} · {d.status}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminShell>
  );
}
