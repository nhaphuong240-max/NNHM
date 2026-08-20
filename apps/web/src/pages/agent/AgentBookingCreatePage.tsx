import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  createBooking,
  createPaymentIntent,
  fetchGrUnits,
  fetchLeads,
  newIdempotencyKey,
  type GrUnit,
  type LeadRecord,
  type PaymentIntentRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const DEFAULT_DEPOSIT = 50_000_000;
const EXPIRY_OPTIONS = [
  { hours: 24, label: '24 giờ' },
  { hours: 48, label: '48 giờ (mặc định)' },
  { hours: 72, label: '72 giờ' },
];

function formatVnd(n: number) {
  return `${n.toLocaleString('vi-VN')} VND`;
}

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

type SuccessState = {
  bookingId: string;
  expiresAt: string;
  intent: PaymentIntentRecord;
  buyerUrl: string;
};

export function AgentBookingCreatePage() {
  const [searchParams] = useSearchParams();
  const presetLeadId = searchParams.get('leadId') ?? '';
  const presetUnitId = searchParams.get('unitId') ?? '';
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [units, setUnits] = useState<GrUnit[]>([]);
  const [leadId, setLeadId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [depositAmount, setDepositAmount] = useState(String(DEFAULT_DEPOSIT));
  const [expiryHours, setExpiryHours] = useState(48);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MOCK' | 'VNPAY'>('MOCK');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([fetchLeads(), fetchGrUnits('AVAILABLE')])
      .then(([leadRes, unitRes]) => {
        setLeads(leadRes.data);
        setUnits(unitRes.data);
        const leadMatch = leadRes.data.find((l) => l.id === presetLeadId);
        const unitMatch = unitRes.data.find((u) => u.id === presetUnitId);
        setLeadId(leadMatch?.id ?? leadRes.data[0]?.id ?? '');
        setUnitId(unitMatch?.id ?? unitRes.data[0]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false));
  }, [presetLeadId, presetUnitId]);

  const selectedUnit = units.find((u) => u.id === unitId);

  async function handleCreate() {
    if (!unitId) {
      setError('Chọn unit AVAILABLE.');
      return;
    }
    const deposit = Number(depositAmount.replace(/\D/g, ''));
    if (!Number.isFinite(deposit) || deposit <= 0) {
      setError('Số tiền cọc không hợp lệ.');
      return;
    }

    setBusy(true);
    setError(null);
    setCopied(false);

    try {
      const booking = await createBooking(
        {
          unitId,
          leadId: leadId || undefined,
          depositAmount: deposit,
          expiryHours,
          notes: notes.trim() || undefined,
        },
        newIdempotencyKey('bk'),
      );

      const intentRes = await createPaymentIntent({
        bookingId: booking.data.id,
        amount: deposit,
        method: paymentMethod,
        returnUrl: `${window.location.origin}/buyer/payment/result`,
      });

      const buyerUrl = `${window.location.origin}/buyer/payment/${intentRes.data.id}`;
      setSuccess({
        bookingId: booking.data.id,
        expiresAt: booking.data.attributes.expiresAt,
        intent: intentRes.data,
        buyerUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo booking thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <AgentShell
      title="Tạo booking / Giữ chỗ"
      subtitle="UC-BK-01 · SCR-AGENT-005 · UAT-03"
      screenTag="Agent / Booking"
    >
      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải leads & units…</p>
      ) : success ? (
        <div className="max-w-2xl space-y-4">
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: '#ECFDF5', border: `2px solid ${brand.success}` }}
          >
            <p className="font-semibold text-lg" style={{ color: brand.success }}>
              Booking {success.bookingId} · RESERVED
            </p>
            <p className="text-sm" style={{ color: brand.muted }}>
              Giữ chỗ đến {formatExpiry(success.expiresAt)} · Redis atomic lock
            </p>
            <p className="text-sm">
              Payment intent: <span className="font-mono">{success.intent.id}</span> (
              {success.intent.attributes.method})
            </p>
          </div>

          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <label className="text-sm font-medium">Link cọc cho buyer (SCR-BUYER-004)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={success.buyerUrl}
                className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono"
                style={{ borderColor: brand.border, background: brand.background }}
              />
              <button
                type="button"
                onClick={() => void copyLink(success.buyerUrl)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shrink-0"
                style={{ background: brand.primary }}
              >
                {copied ? 'Đã copy' : 'Copy'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to={`/buyer/payment/${success.intent.id}`}
                className="rounded-xl px-5 py-2.5 font-semibold text-white"
                style={{ background: brand.success }}
              >
                Mở trang buyer →
              </Link>
              <Link
                to={`/agent/bookings/${success.bookingId}`}
                className="rounded-xl px-5 py-2.5 font-semibold border"
                style={{ borderColor: brand.border }}
              >
                Timeline booking
              </Link>
              <button
                type="button"
                className="rounded-xl px-5 py-2.5 font-semibold border"
                style={{ borderColor: brand.border }}
                onClick={() => setSuccess(null)}
              >
                Tạo booking mới
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <section
            className="rounded-xl p-5 space-y-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Lead</label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.attributes.fullName} · {l.attributes.tier} · {l.attributes.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Unit (GR AVAILABLE)</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.attributes.code} · {u.attributes.bedrooms}PN · {formatVnd(u.attributes.basePrice)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedUnit && (
              <p className="text-sm rounded-lg p-3" style={{ background: brand.background, color: brand.muted }}>
                GR: {selectedUnit.attributes.code} · {selectedUnit.attributes.area} m² ·{' '}
                <span style={{ color: brand.success, fontWeight: 600 }}>AVAILABLE</span>
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Số tiền cọc (VND)</label>
                <input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm font-mono"
                  style={{ borderColor: brand.border }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Thời hạn giữ</label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full mt-1 h-10 px-3 rounded-lg border text-sm"
                  style={{ borderColor: brand.border }}
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.hours} value={o.hours}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Cổng thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'MOCK' | 'VNPAY')}
                className="w-full mt-1 h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              >
                <option value="MOCK">MOCK (dev · UAT-03)</option>
                <option value="VNPAY">VNPay sandbox</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Khách VIP gallery…"
                className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
            </div>

            <p className="text-xs rounded-lg p-3" style={{ background: brand.background, color: brand.muted }}>
              Atomic lock — unit chuyển RESERVED khi POST thành công (FR-BK-02). Idempotency-Key chống double-click.
            </p>
          </section>

          {error && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Link
              to="/"
              className="rounded-xl px-5 py-2.5 font-semibold border"
              style={{ borderColor: brand.border }}
            >
              Hủy
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreate()}
              className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-60 min-w-[200px]"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang giữ chỗ…' : 'Tạo booking & sinh link cọc →'}
            </button>
          </div>
        </div>
      )}
    </AgentShell>
  );
}
