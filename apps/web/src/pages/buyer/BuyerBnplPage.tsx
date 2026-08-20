import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyBnpl,
  fetchBnplApplications,
  fetchBnplPlans,
  simulateBnplPartnerWebhook,
  type BnplApplication,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

const DEFAULT_BOOKING_ID = 'bk_contract01';

function BnplStatusBadge({ status }: { status: BnplApplication['status'] }) {
  const tone =
    status === 'APPROVED' || status === 'ACTIVE' || status === 'COMPLETED'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'REJECTED'
        ? { bg: '#FEE2E2', color: brand.destructive }
        : { bg: '#FFEDD5', color: brand.warning };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={tone}>
      {status}
    </span>
  );
}

export function BuyerBnplPage() {
  const [plans, setPlans] = useState<{ id: string; label: string; installments: number }[]>([]);
  const [applications, setApplications] = useState<BnplApplication[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [bookingId, setBookingId] = useState(DEFAULT_BOOKING_ID);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [webhookBusyId, setWebhookBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => applications.filter((app) => app.status === 'PENDING').length,
    [applications],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, appRes] = await Promise.all([fetchBnplPlans(), fetchBnplApplications()]);
      setPlans(planRes.data);
      setApplications(appRes.data);
      if (planRes.data.length > 0 && !selectedPlanId) {
        setSelectedPlanId(planRes.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải BNPL');
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApply() {
    if (!selectedPlanId || !bookingId.trim()) return;
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await applyBnpl({ bookingId: bookingId.trim(), planId: selectedPlanId });
      const app = res.data;
      if (app.status === 'PENDING') {
        setToast(
          `Đã nộp ${app.id} · PENDING partner · externalId ${app.externalId ?? '—'} — chờ webhook duyệt`,
        );
      } else {
        setToast(`Đã nộp ${app.id} · ${app.status} — UC-PAY-07`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nộp đơn BNPL thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handlePartnerDecision(
    app: BnplApplication,
    status: 'APPROVED' | 'REJECTED',
  ) {
    if (!app.externalId) return;
    setWebhookBusyId(app.id);
    setError(null);
    setToast(null);
    try {
      const res = await simulateBnplPartnerWebhook({
        externalId: app.externalId,
        status,
        reason: status === 'REJECTED' ? 'Demo partner từ chối' : undefined,
      });
      setToast(`Partner webhook · ${res.data.id} → ${res.data.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Webhook partner thất bại');
    } finally {
      setWebhookBusyId(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="text-white px-4 py-4" style={{ background: brand.primary }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs opacity-80">UC-PAY-07 · SCR-BUYER-001</p>
          <h1 className="text-xl font-bold">Trả góp (BNPL)</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {toast && (
          <p className="text-sm rounded-lg p-3" style={{ background: '#ECFDF5', color: brand.success }}>
            {toast}
          </p>
        )}
        {error && (
          <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
            {error}
          </p>
        )}

        {loading ? (
          <p style={{ color: brand.muted }}>Đang tải…</p>
        ) : (
          <>
            {pendingCount > 0 && (
              <p
                className="text-sm rounded-lg p-3 flex flex-wrap items-center gap-2"
                style={{ background: '#FFFBEB', color: brand.warning, border: `1px solid ${brand.border}` }}
              >
                <BnplStatusBadge status="PENDING" />
                <span>
                  {pendingCount} đơn chờ partner · demo webhook{' '}
                  <code className="font-mono text-xs">POST /bnpl/webhook/partner</code>
                </span>
              </p>
            )}

            <section
              className="rounded-xl p-4 space-y-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h2 className="font-semibold text-sm">Chọn gói trả góp</h2>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className="flex items-center gap-3 rounded-lg p-3 cursor-pointer"
                    style={{
                      background: selectedPlanId === plan.id ? '#EFF6FF' : brand.background,
                      border: `1px solid ${selectedPlanId === plan.id ? brand.primary : brand.border}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                    />
                    <div>
                      <p className="font-medium text-sm">{plan.label}</p>
                      <p className="text-xs" style={{ color: brand.muted }}>
                        {plan.installments} kỳ · {plan.id}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <label className="block text-sm">
                <span style={{ color: brand.muted }}>Booking ID</span>
                <input
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  style={{ borderColor: brand.border }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !selectedPlanId}
                onClick={() => void handleApply()}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.primary }}
              >
                {busy ? 'Đang nộp…' : 'Nộp đơn trả góp'}
              </button>
            </section>

            <section>
              <h2 className="font-semibold text-sm mb-3">Đơn đã nộp ({applications.length})</h2>
              {applications.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Chưa có đơn BNPL.
                </p>
              ) : (
                <ul className="space-y-3">
                  {applications.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-xl p-4 text-sm"
                      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{app.id}</span>
                        <BnplStatusBadge status={app.status} />
                      </div>
                      <p className="mt-1">
                        {app.bookingId} · {app.planLabel} · {app.installmentCount} kỳ
                      </p>
                      {app.externalId && (
                        <p className="text-xs font-mono mt-1" style={{ color: brand.muted }}>
                          partner ref · {app.externalId}
                        </p>
                      )}
                      {app.status === 'PENDING' && (
                        <p className="text-xs mt-2" style={{ color: brand.warning }}>
                          Đang chờ partner xét duyệt — dùng nút demo bên dưới hoặc webhook production.
                        </p>
                      )}
                      {app.partnerReason && app.status === 'REJECTED' && (
                        <p className="text-xs mt-1" style={{ color: brand.destructive }}>
                          Lý do: {app.partnerReason}
                        </p>
                      )}
                      <p className="font-bold tabular-nums mt-1">{formatVnd(app.totalAmount)}</p>
                      {app.installments.length > 0 && (
                        <ul className="mt-2 text-xs space-y-1" style={{ color: brand.muted }}>
                          {app.installments.slice(0, 3).map((inst) => (
                            <li key={inst.id}>
                              {inst.dueDate} · {formatVnd(inst.amount)} · {inst.status}
                            </li>
                          ))}
                        </ul>
                      )}
                      {app.status === 'PENDING' && app.externalId && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: brand.border }}>
                          <button
                            type="button"
                            disabled={webhookBusyId === app.id}
                            onClick={() => void handlePartnerDecision(app, 'APPROVED')}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: brand.success }}
                          >
                            {webhookBusyId === app.id ? 'Đang gửi…' : 'Demo partner duyệt'}
                          </button>
                          <button
                            type="button"
                            disabled={webhookBusyId === app.id}
                            onClick={() => void handlePartnerDecision(app, 'REJECTED')}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                            style={{
                              background: '#FEE2E2',
                              color: brand.destructive,
                              border: `1px solid ${brand.destructive}`,
                            }}
                          >
                            Demo từ chối
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <p className="text-xs" style={{ color: brand.muted }}>
          Demo: booking <code className="font-mono">{DEFAULT_BOOKING_ID}</code> ·{' '}
          <Link to="/buyer/deals" className="underline">
            Theo dõi giao dịch
          </Link>
        </p>
      </main>
    </div>
  );
}
