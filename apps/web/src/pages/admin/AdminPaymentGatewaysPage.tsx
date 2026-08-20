import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchPaymentGatewayRules,
  patchPaymentGatewayRule,
  simulatePaymentGatewayRoute,
  type PaymentGatewayRule,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AdminPaymentGatewaysPage() {
  const [rules, setRules] = useState<PaymentGatewayRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState('50000000');
  const [method, setMethod] = useState<'MOCK' | 'VNPAY'>('VNPAY');
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPaymentGatewayRules();
      setRules(res.data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải routing rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSimulate() {
    setError(null);
    setDecision(null);
    try {
      const res = await simulatePaymentGatewayRoute({
        method,
        amount: Number(amount),
        primaryFailed,
      });
      const d = res.data.decision;
      setDecision(
        d
          ? `Rule ${d.ruleId} → ${d.selected}${d.usedFallback ? ' (fallback)' : ''}`
          : 'Không khớp rule',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulate thất bại');
    }
  }

  async function toggleRule(rule: PaymentGatewayRule) {
    try {
      const res = await patchPaymentGatewayRule(rule.id, { enabled: !rule.enabled });
      setRules(res.data.rules);
      setMessage(`Đã ${rule.enabled ? 'tắt' : 'bật'} ${rule.label}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật rule thất bại');
    }
  }

  return (
    <AdminShell
      title="Payment gateway routing"
      subtitle="UC-PAY-05 · SCR-ADMIN-017 · Multi-gateway fallback"
      screenTag="Admin / Integrations"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/integrations/leads" className="underline" style={{ color: brand.primary }}>
          Omnichannel
        </Link>
        <Link to="/admin/api-marketplace" className="underline" style={{ color: brand.muted }}>
          API Marketplace
        </Link>
      </div>

      {message && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#ECFDF5', color: brand.success }}>
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Route rules</h3>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl p-4"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{rule.label}</p>
                    <p className="text-xs mt-1" style={{ color: brand.muted }}>
                      {rule.id} · priority {rule.priority}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => void toggleRule(rule)}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <p className="text-xs mt-2">
                  Primary <strong>{rule.primary}</strong>
                  {rule.fallback ? ` · fallback ${rule.fallback}` : ''}
                </p>
              </div>
            ))}
          </section>

          <section
            className="rounded-xl p-4 space-y-4 h-fit"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold text-sm">Simulate routing</h3>
            <div>
              <label className="text-xs block mb-1">Method</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as 'MOCK' | 'VNPAY')}
              >
                <option value="VNPAY">VNPAY</option>
                <option value="MOCK">MOCK</option>
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1">Amount (VND)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={primaryFailed}
                onChange={(e) => setPrimaryFailed(e.target.checked)}
              />
              Primary gateway failed → fallback
            </label>
            <button
              type="button"
              className="w-full rounded-lg py-2 text-sm font-semibold text-white"
              style={{ background: brand.primary }}
              onClick={() => void handleSimulate()}
            >
              Simulate route
            </button>
            {decision && (
              <p className="text-sm" style={{ color: brand.success }}>
                {decision}
              </p>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
