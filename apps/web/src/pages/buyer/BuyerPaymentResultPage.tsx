import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import { fetchPaymentCheckout, type PaymentCheckout } from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

export function BuyerPaymentResultPage() {
  const [params] = useSearchParams();
  const intentId = params.get('intentId') ?? '';
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId) {
      setLoading(false);
      return;
    }
    fetchPaymentCheckout(intentId)
      .then(setCheckout)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được kết quả'))
      .finally(() => setLoading(false));
  }, [intentId]);

  const paid =
    checkout?.data.status === 'SUCCEEDED' || checkout?.data.booking.status === 'DEPOSITED';

  return (
    <BuyerShell title={paid ? 'Thanh toán thành công' : 'Kết quả thanh toán'}>
      {loading ? (
        <p style={{ color: brand.muted }}>Đang xác nhận…</p>
      ) : !intentId ? (
        <p style={{ color: brand.destructive }}>Thiếu intentId trong URL.</p>
      ) : error ? (
        <p className="rounded-lg p-4 text-sm" style={{ background: '#FEF2F2', color: brand.destructive }}>
          {error}
        </p>
      ) : checkout ? (
        <div
          className="rounded-xl p-6 space-y-4 text-center"
          style={{
            background: paid ? '#ECFDF5' : brand.surface,
            border: `2px solid ${paid ? brand.success : brand.border}`,
          }}
        >
          <p className="text-4xl">{paid ? '✓' : '…'}</p>
          <p className="font-semibold text-lg">
            {paid ? 'Cọc đã ghi nhận · DEPOSITED' : `Trạng thái: ${checkout.data.status}`}
          </p>
          <p className="text-sm" style={{ color: brand.muted }}>
            Booking {checkout.data.booking.id}
            {checkout.data.booking.unitCode ? ` · ${checkout.data.booking.unitCode}` : ''}
          </p>
          <p className="text-xl font-bold" style={{ color: brand.primary }}>
            {formatVnd(checkout.data.amount)}
          </p>
          {paid && (
            <p className="text-xs" style={{ color: brand.muted }}>
              Webhook idempotent · ledger 2 dòng · kiểm tra Finance reconcile
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              to={`/agent/bookings/${checkout.data.booking.id}`}
              className="rounded-xl py-3 font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Xem timeline agent
            </Link>
            <Link to="/" className="text-sm underline" style={{ color: brand.muted }}>
              Về trang chủ
            </Link>
          </div>
        </div>
      ) : null}
    </BuyerShell>
  );
}
