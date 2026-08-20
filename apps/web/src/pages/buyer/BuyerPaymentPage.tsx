import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import {
  fetchPaymentCheckout,
  triggerMockPayment,
  type PaymentCheckout,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

const FALLBACK_DEMO_OTP = '123456';

function minutesLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 60_000));
}

export function BuyerPaymentPage() {
  const { intentId = '' } = useParams<{ intentId: string }>();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpOk, setOtpOk] = useState(false);
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);

  const loadCheckout = useCallback(async () => {
    if (!intentId) return;
    const data = await fetchPaymentCheckout(intentId);
    setCheckout(data);
    return data;
  }, [intentId]);

  useEffect(() => {
    if (!intentId) return;
    let active = true;
    setLoading(true);
    setError(null);

    loadCheckout()
      .then((data) => {
        if (!active || !data) return;
        if (data.data.status === 'SUCCEEDED' || data.data.booking.status === 'DEPOSITED') {
          navigate(`/buyer/payment/result?intentId=${intentId}`, { replace: true });
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được thông tin thanh toán');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [intentId, loadCheckout, navigate]);

  useEffect(() => {
    const expected = checkout?.meta?.sandboxOtp ?? FALLBACK_DEMO_OTP;
    setOtpOk(otp.replace(/\D/g, '') === expected);
  }, [otp, checkout?.meta?.sandboxOtp]);

  async function pollUntilPaid() {
    setPolling(true);
    for (let i = 0; i < 15; i += 1) {
      await new Promise((r) => window.setTimeout(r, 1500));
      const data = await loadCheckout();
      if (
        data?.data.status === 'SUCCEEDED' ||
        data?.data.booking.status === 'DEPOSITED'
      ) {
        navigate(`/buyer/payment/result?intentId=${intentId}`, { replace: true });
        return;
      }
    }
    setPolling(false);
    setError('Chưa nhận được xác nhận thanh toán — thử lại hoặc liên hệ agent.');
  }

  async function handlePayMock() {
    if (!checkout?.data.paymentUrl) return;
    const expectedOtp = checkout.meta?.sandboxOtp ?? FALLBACK_DEMO_OTP;
    if (!otpOk) {
      setError(`Nhập OTP SMS ${expectedOtp} trước khi thanh toán (BR-14).`);
      return;
    }

    setPaying(true);
    setError(null);
    try {
      await triggerMockPayment(checkout.data.paymentUrl);
      await pollUntilPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thanh toán thất bại');
    } finally {
      setPaying(false);
    }
  }

  function handlePayVnpay() {
    if (!checkout?.data.paymentUrl) return;
    const expectedOtp = checkout.meta?.sandboxOtp ?? FALLBACK_DEMO_OTP;
    if (!otpOk) {
      setError(`Nhập OTP SMS ${expectedOtp} trước khi chuyển VNPay.`);
      return;
    }
    window.location.href = checkout.data.paymentUrl;
  }

  if (!intentId) {
    return (
      <BuyerShell title="Thanh toán cọc">
        <p style={{ color: brand.destructive }}>Thiếu payment intent ID.</p>
      </BuyerShell>
    );
  }

  return (
    <BuyerShell title="Thanh toán cọc online" subtitle="UC-PAY-01 · UAT-03">
      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : error && !checkout ? (
        <p className="rounded-lg p-4 text-sm" style={{ background: '#FEF2F2', color: brand.destructive }}>
          {error}
        </p>
      ) : checkout ? (
        <div className="space-y-4">
          <section
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <p className="text-xs" style={{ color: brand.muted }}>
              Booking {checkout.data.booking.id}
              {checkout.data.booking.unitCode ? ` · ${checkout.data.booking.unitCode}` : ''}
            </p>
            <p className="text-2xl font-bold" style={{ color: brand.primary }}>
              {formatVnd(checkout.data.amount)}
            </p>
            <p className="text-sm" style={{ color: brand.muted }}>
              Trạng thái booking:{' '}
              <strong>{checkout.data.booking.status}</strong> · Intent: {checkout.data.status}
            </p>
            <p className="text-xs" style={{ color: brand.muted }}>
              Hết hạn link: ~{minutesLeft(checkout.data.expiresAt)} phút
            </p>
          </section>

          <section
            className="rounded-xl p-5 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold text-sm">Xác thực OTP (demo BR-14)</h2>
            <input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 số OTP SMS"
              className="w-full h-11 px-3 rounded-lg border text-center text-lg tracking-widest font-mono"
              style={{ borderColor: otpOk ? brand.success : brand.border }}
            />
            <p className="text-xs" style={{ color: brand.muted }}>
              {checkout.meta?.smsOtpSent
                ? 'OTP đã gửi qua SMS sandbox'
                : 'Chưa có OTP SMS — dùng fallback demo'}
              {checkout.meta?.sandboxOtp ? (
                <>
                  {' '}
                  · UAT: <strong>{checkout.meta.sandboxOtp}</strong>
                </>
              ) : (
                <>
                  {' '}
                  · UAT: <strong>{FALLBACK_DEMO_OTP}</strong>
                </>
              )}
            </p>
          </section>

          {checkout.data.method === 'MOCK' ? (
            <button
              type="button"
              disabled={paying || polling || !checkout.data.paymentUrl}
              onClick={() => void handlePayMock()}
              className="w-full rounded-xl py-3.5 font-bold text-white disabled:opacity-50"
              style={{ background: brand.success }}
            >
              {paying || polling ? 'Đang xử lý webhook…' : 'Thanh toán MOCK (UAT-03)'}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!checkout.data.paymentUrl}
                onClick={handlePayVnpay}
                className="w-full rounded-xl py-3.5 font-bold text-white"
                style={{ background: brand.primary }}
              >
                Chuyển VNPay sandbox →
              </button>
              <p className="text-xs text-center" style={{ color: brand.muted }}>
                Hoặc mở tab mới:{' '}
                <a href={checkout.data.paymentUrl} className="underline" target="_blank" rel="noreferrer">
                  payment link
                </a>
              </p>
            </>
          )}

          {error && (
            <p className="text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
              {error}
            </p>
          )}

          <p className="text-xs text-center" style={{ color: brand.muted }}>
            Sau thanh toán · ledger double-entry · Finance reconcile{' '}
            <Link to="/finance/reconciliation" className="underline">
              OP-WIN-02
            </Link>
          </p>
        </div>
      ) : null}
    </BuyerShell>
  );
}
