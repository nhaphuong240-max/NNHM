import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FinanceShell } from '../../components/FinanceShell';
import {
  cancelBookingWithRefund,
  createRefund,
  fetchRefundByPaymentIntent,
  fetchRefunds,
  type RefundRecord,
} from '../../lib/api';
import { brand, finance, formatVnd } from '../../theme/tokens';

function RefundStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'SUCCEEDED'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'PENDING'
        ? { bg: '#FFEDD5', color: brand.warning }
        : { bg: '#FEE2E2', color: brand.destructive };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={tone}
    >
      {status}
    </span>
  );
}

function RefundDetailCard({ refund }: { refund: RefundRecord }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: finance.accentSoft, border: `1px solid ${finance.accent}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold font-mono text-sm">{refund.id}</h3>
        <RefundStatusBadge status={refund.attributes.status} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p style={{ color: brand.muted }}>Payment Intent</p>
          <p className="font-mono text-xs">{refund.attributes.paymentIntentId}</p>
        </div>
        <div>
          <p style={{ color: brand.muted }}>Booking</p>
          <p className="font-mono text-xs">{refund.attributes.bookingId}</p>
        </div>
        <div>
          <p style={{ color: brand.muted }}>Amount</p>
          <p className="font-bold tabular-nums">{formatVnd(refund.attributes.amount)}</p>
        </div>
        <div>
          <p style={{ color: brand.muted }}>Ledger reversal</p>
          <p className="font-mono text-xs">{refund.attributes.ledgerEntryId ?? '—'}</p>
        </div>
        {refund.attributes.reason && (
          <div className="sm:col-span-2">
            <p style={{ color: brand.muted }}>Reason</p>
            <p>{refund.attributes.reason}</p>
          </div>
        )}
      </div>
      <p className="text-xs" style={{ color: brand.muted }}>
        Reversal: DEBIT DEPOSIT_LIABILITY · CREDIT CASH_* · booking → REFUNDED · unit → AVAILABLE
      </p>
    </div>
  );
}

export function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [selected, setSelected] = useState<RefundRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('Customer requested refund');

  const [bookingId, setBookingId] = useState('');
  const [cancelReason, setCancelReason] = useState('Buyer withdrew');
  const [initiateRefund, setInitiateRefund] = useState(true);

  const [lookupIntentId, setLookupIntentId] = useState('');

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRefunds(50);
      setRefunds(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải refunds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  async function handleCreateRefund(e: FormEvent) {
    e.preventDefault();
    if (!paymentIntentId.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const amount = refundAmount.trim() ? Number(refundAmount) : undefined;
      const result = await createRefund({
        paymentIntentId: paymentIntentId.trim(),
        amount,
        reason: refundReason.trim() || undefined,
      });
      setSelected(result.data);
      setMessage(
        result.meta?.idempotentReplay
          ? `Refund replay · ${result.data.id}`
          : `Refund ${result.data.id} · ${result.data.attributes.status}`,
      );
      await loadRefunds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelBooking(e: FormEvent) {
    e.preventDefault();
    if (!bookingId.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await cancelBookingWithRefund(bookingId.trim(), {
        reason: cancelReason.trim() || undefined,
        initiateRefund,
      });
      if (result.refund) {
        setSelected(result.refund);
        setMessage(`Booking ${result.data.attributes.status} · refund ${result.refund.id}`);
      } else {
        setMessage(`Booking cancelled · ${result.data.attributes.status}`);
      }
      await loadRefunds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!lookupIntentId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fetchRefundByPaymentIntent(lookupIntentId.trim());
      setSelected(result.data);
      if (!result.data) setMessage('No refund found for this payment intent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FinanceShell
      title="Hoàn tiền & ledger reversal"
      subtitle="Gateway refund · double-entry reversal · cancel booking path"
      screenTag="UC-PAY-03 · SCR-FIN-005 · S4-05"
    >
      <div className="space-y-6">
        <section
          className="rounded-xl p-4 text-sm"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p style={{ color: brand.muted }}>
            <strong>Flow:</strong> initiate refund → gateway (MOCK sync / VNPAY async) → ledger reversal
            (DEBIT DEPOSIT_LIABILITY, CREDIT CASH_*) → booking REFUNDED → unit AVAILABLE · SSE{' '}
            <code className="text-xs">payment.refunded</code>
          </p>
        </section>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && (
          <div
            className="rounded-lg p-3 text-sm"
            style={{ background: '#DCFCE7', color: brand.success }}
          >
            {message}
          </div>
        )}

        {selected && <RefundDetailCard refund={selected} />}

        <section className="grid lg:grid-cols-2 gap-6">
          <form
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            onSubmit={handleCreateRefund}
          >
            <h2 className="font-semibold">POST /refunds — Direct refund</h2>
            <label className="block text-sm">
              Payment Intent ID
              <input
                required
                value={paymentIntentId}
                onChange={(e) => setPaymentIntentId(e.target.value)}
                placeholder="pi_..."
                className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              Amount (VND, optional — full intent amount if empty)
              <input
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="50000000"
                className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              Reason
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: finance.accent }}
            >
              Initiate refund
            </button>
          </form>

          <form
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            onSubmit={handleCancelBooking}
          >
            <h2 className="font-semibold">DELETE /bookings/:id — Cancel + refund</h2>
            <label className="block text-sm">
              Booking ID (DEPOSITED)
              <input
                required
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="bk_..."
                className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block text-sm">
              Reason
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={initiateRefund}
                onChange={(e) => setInitiateRefund(e.target.checked)}
              />
              initiateRefund (default true for DEPOSITED)
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: finance.accentDark }}
            >
              Cancel booking
            </button>
          </form>
        </section>

        <form
          className="rounded-xl p-4 flex flex-wrap gap-3 items-end"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          onSubmit={handleLookup}
        >
          <label className="text-sm flex-1 min-w-[200px]">
            Lookup by Payment Intent
            <input
              value={lookupIntentId}
              onChange={(e) => setLookupIntentId(e.target.value)}
              placeholder="pi_..."
              className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
              style={{ borderColor: brand.border }}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-semibold border"
            style={{ borderColor: brand.border }}
          >
            Lookup
          </button>
        </form>

        <section
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: brand.border }}>
            <h2 className="font-semibold">Recent refunds</h2>
            <button
              type="button"
              onClick={loadRefunds}
              disabled={loading}
              className="text-xs underline"
              style={{ color: brand.muted }}
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Refund</th>
                  <th className="text-left px-4 py-2 font-medium">Booking</th>
                  <th className="text-left px-4 py-2 font-medium">Intent</th>
                  <th className="text-left px-4 py-2 font-medium">Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Ledger</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center" style={{ color: brand.muted }}>
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!loading &&
                  refunds.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t cursor-pointer hover:bg-slate-50"
                      style={{
                        borderColor: brand.border,
                        background: selected?.id === row.id ? finance.accentSoft : undefined,
                      }}
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{row.id}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.attributes.bookingId}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.attributes.paymentIntentId}</td>
                      <td className="px-4 py-2 tabular-nums">{formatVnd(row.attributes.amount)}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {row.attributes.ledgerEntryId ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <RefundStatusBadge status={row.attributes.status} />
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: brand.muted }}>
                        {new Date(row.attributes.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                {!loading && refunds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center" style={{ color: brand.muted }}>
                      Chưa có refund. Chạy demo S4 (book → pay) rồi initiate refund.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </FinanceShell>
  );
}
