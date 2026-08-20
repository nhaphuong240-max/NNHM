import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  BOOKING_CANCEL_REASONS,
  cancelBookingWithRefund,
  fetchBooking,
  fetchBookings,
  type BookingDetail,
  type RefundRecord,
} from '../../lib/api';
import { verifyMfaOtp } from '../../lib/auth';
import { brand, formatVnd } from '../../theme/tokens';

function RefundStepper({ refund }: { refund: RefundRecord }) {
  const steps =
    refund.attributes.status === 'SUCCEEDED'
      ? ['Initiated', 'Ledger reversal', 'SUCCEEDED']
      : refund.attributes.status === 'PENDING'
        ? ['Initiated', 'Processing…']
        : ['Initiated', refund.attributes.status];

  return (
    <ol className="flex flex-wrap gap-2 text-xs mt-3">
      {steps.map((step, idx) => (
        <li
          key={step}
          className="rounded-full px-3 py-1 font-medium"
          style={{
            background: idx === steps.length - 1 ? '#DCFCE7' : brand.surface,
            color: idx === steps.length - 1 ? brand.success : brand.muted,
            border: `1px solid ${brand.border}`,
          }}
        >
          {step}
        </li>
      ))}
    </ol>
  );
}

export function AgentBookingCancelPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') ?? '';

  const [bookingIdInput, setBookingIdInput] = useState(initialBookingId);
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [reason, setReason] = useState<string>(BOOKING_CANCEL_REASONS[0].value);
  const [reasonNote, setReasonNote] = useState('');
  const [initiateRefund, setInitiateRefund] = useState(true);
  const [showMfa, setShowMfa] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultRefund, setResultRefund] = useState<RefundRecord | null>(null);
  const [cancelledStatus, setCancelledStatus] = useState<string | null>(null);

  const loadBooking = useCallback(async (id: string) => {
    if (!id.trim()) {
      setBooking(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchBooking(id.trim());
      setBooking(detail);
      setBookingId(id.trim());
      setSearchParams({ bookingId: id.trim() });
    } catch (e) {
      setBooking(null);
      setError(e instanceof Error ? e.message : 'Không tải booking');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    void fetchBookings({ limit: 8 }).then((res) => {
      setRecentIds(res.data.map((b) => b.id));
    });
  }, []);

  useEffect(() => {
    if (initialBookingId) void loadBooking(initialBookingId);
  }, [initialBookingId, loadBooking]);

  const attrs = booking?.data.attributes;
  const isDeposited = attrs?.status === 'DEPOSITED';
  const canCancel = booking?.meta.allowedTransitions.includes('CANCEL') ?? false;
  const requiresMfa = isDeposited && initiateRefund;

  const cancelReasonLabel = useMemo(() => {
    const base = BOOKING_CANCEL_REASONS.find((r) => r.value === reason)?.label ?? reason;
    return reasonNote.trim() ? `${base}: ${reasonNote.trim()}` : base;
  }, [reason, reasonNote]);

  async function executeCancel() {
    if (!bookingId || !canCancel) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cancelBookingWithRefund(bookingId, {
        reason: cancelReasonLabel,
        initiateRefund: isDeposited ? initiateRefund : false,
      });
      setCancelledStatus(res.data.attributes.status);
      setResultRefund(res.refund ?? null);
      await loadBooking(bookingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hủy booking thất bại');
    } finally {
      setBusy(false);
      setShowMfa(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bookingId || !canCancel) return;

    if (requiresMfa) {
      setShowMfa(true);
      return;
    }
    await executeCancel();
  }

  async function confirmMfa(e: FormEvent) {
    e.preventDefault();
    const ok = await verifyMfaOtp(otp);
    if (!ok) {
      setError('OTP không hợp lệ. Demo: 123456');
      return;
    }
    await executeCancel();
  }

  return (
    <AgentShell
      title="Hủy booking & refund"
      subtitle="UC-BK-05 · SCR-AGENT-004 · BR-14 MFA khi đã cọc"
      screenTag="Agent / Booking"
    >
      <Link to="/agent/bookings/new" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Tạo booking mới
      </Link>

      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm flex-1 min-w-[220px]">
          Booking ID
          <input
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value)}
            placeholder="bk_settle01"
            className="mt-1 w-full h-10 px-3 rounded-lg border font-mono text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <button
          type="button"
          disabled={loading || !bookingIdInput.trim()}
          onClick={() => void loadBooking(bookingIdInput)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: brand.primary }}
        >
          Tải booking
        </button>
        {recentIds.length > 0 && (
          <div className="w-full flex flex-wrap gap-2 text-xs">
            {recentIds.map((id) => (
              <button
                key={id}
                type="button"
                className="font-mono underline"
                style={{ color: brand.primary }}
                onClick={() => {
                  setBookingIdInput(id);
                  void loadBooking(id);
                }}
              >
                {id}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="grid lg:grid-cols-2 gap-8">
          <section
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold">CancelSummary</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt style={{ color: brand.muted }}>Booking</dt>
                <dd className="font-mono">{booking?.data.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: brand.muted }}>Trạng thái</dt>
                <dd className="font-bold">{attrs.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: brand.muted }}>Unit</dt>
                <dd className="font-mono">{attrs.unitId}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: brand.muted }}>Cọc</dt>
                <dd className="tabular-nums">{attrs.depositAmount ? formatVnd(attrs.depositAmount) : '—'}</dd>
              </div>
            </dl>
            {isDeposited && initiateRefund && (
              <p className="text-xs rounded-lg p-3" style={{ background: '#FFFBEB', color: brand.warning }}>
                Booking DEPOSITED — refund ước tính {formatVnd(attrs.depositAmount ?? 0)} · cần MFA OTP (BR-14)
              </p>
            )}
            {!canCancel && (
              <p className="text-sm" style={{ color: brand.destructive }}>
                Booking không thể hủy ở trạng thái {attrs.status}.
              </p>
            )}
            {bookingId && (
              <Link to={`/agent/bookings/${bookingId}`} className="text-sm underline" style={{ color: brand.primary }}>
                Xem timeline →
              </Link>
            )}
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <h2 className="font-semibold">Xác nhận hủy</h2>
              <label className="block">
                Lý do (enum) *
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border"
                  style={{ borderColor: brand.border }}
                  disabled={!canCancel || !!cancelledStatus}
                >
                  {BOOKING_CANCEL_REASONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Ghi chú thêm
                <input
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border"
                  style={{ borderColor: brand.border }}
                  disabled={!canCancel || !!cancelledStatus}
                />
              </label>
              {isDeposited && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiateRefund}
                    onChange={(e) => setInitiateRefund(e.target.checked)}
                    disabled={!!cancelledStatus}
                  />
                  Kích hoạt refund tự động (UC-PAY-03)
                </label>
              )}
              <button
                type="submit"
                disabled={busy || !canCancel || !!cancelledStatus}
                className="w-full rounded-lg py-2.5 font-semibold text-white disabled:opacity-50"
                style={{ background: brand.destructive }}
              >
                {busy ? 'Đang xử lý…' : 'ConfirmCancel — Hủy booking'}
              </button>
            </form>

            {cancelledStatus && (
              <div className="mt-6 rounded-lg p-4" style={{ background: '#DCFCE7' }}>
                <p className="font-semibold" style={{ color: brand.success }}>
                  Đã hủy · trạng thái {cancelledStatus}
                </p>
                {resultRefund && (
                  <div className="mt-3 text-sm">
                    <p>
                      Refund <span className="font-mono">{resultRefund.id}</span> ·{' '}
                      {formatVnd(resultRefund.attributes.amount)}
                    </p>
                    <RefundStepper refund={resultRefund} />
                  </div>
                )}
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  style={{ color: brand.primary }}
                  onClick={() => navigate('/agent/pipeline')}
                >
                  Về pipeline
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {showMfa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)' }}
        >
          <form
            onSubmit={confirmMfa}
            className="w-full max-w-sm rounded-xl p-6 space-y-4"
            style={{ background: brand.surface }}
          >
            <h3 className="font-semibold text-lg">MfaOtpModal (BR-14)</h3>
            <p className="text-sm" style={{ color: brand.muted }}>
              Nhập OTP demo <strong>123456</strong> trước khi hủy booking đã cọc.
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              className="w-full h-11 px-3 rounded-lg border text-center tracking-widest font-mono"
              style={{ borderColor: brand.border }}
              maxLength={6}
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg border py-2 text-sm"
                style={{ borderColor: brand.border }}
                onClick={() => setShowMfa(false)}
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={busy || otp.length < 6}
                className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.destructive }}
              >
                Xác nhận OTP
              </button>
            </div>
          </form>
        </div>
      )}
    </AgentShell>
  );
}
