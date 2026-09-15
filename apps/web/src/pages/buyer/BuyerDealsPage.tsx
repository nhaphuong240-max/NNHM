import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import { SeekerOtpModal } from '../../components/public/SeekerOtpModal';
import { fetchBuyerDeals, type BuyerDealSummary } from '../../lib/api';
import { getSeekerSession } from '../../lib/seeker';
import { brand, formatVnd } from '../../theme/tokens';

function statusColor(status: string) {
  switch (status) {
    case 'DEPOSITED':
      return brand.success;
    case 'RESERVED':
      return brand.warning;
    default:
      return brand.muted;
  }
}

export function BuyerDealsPage() {
  const [deals, setDeals] = useState<BuyerDealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => getSeekerSession()?.phone ?? null);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBuyerDeals();
      if (res.meta.requiresSeekerAuth) {
        setNeedsAuth(true);
        setDeals([]);
      } else {
        setNeedsAuth(false);
        setDeals(res.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  function onVerified(phone: string) {
    setVerifiedPhone(phone);
    void loadDeals();
  }

  return (
    <BuyerShell title="Theo dõi giao dịch" subtitle="FR-BUY-001 · UC-BK-02 · SCR-BUYER-002">
      {showOtp && (
        <SeekerOtpModal onClose={() => setShowOtp(false)} onVerified={onVerified} />
      )}

      {needsAuth && !verifiedPhone && (
        <div
          className="rounded-xl p-5 mb-4 space-y-3"
          style={{ background: brand.accentSoft, border: `1px solid ${brand.accent}` }}
        >
          <p className="text-sm font-medium">Xác minh SĐT để xem giao dịch của bạn</p>
          <p className="text-xs" style={{ color: brand.muted }}>
            Chỉ hiển thị booking gắn với số điện thoại đã xác minh — không lộ deal của người khác.
          </p>
          <button
            type="button"
            onClick={() => setShowOtp(true)}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: brand.primary }}
          >
            Xác minh OTP
          </button>
        </div>
      )}

      {verifiedPhone && (
        <p className="text-xs mb-4" style={{ color: brand.muted }}>
          SĐT đã xác minh: {verifiedPhone}{' '}
          <button type="button" className="underline ml-1" onClick={() => setShowOtp(true)}>
            Đổi số
          </button>
        </p>
      )}

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {!loading && !needsAuth && deals.length === 0 && verifiedPhone && (
        <p className="text-sm" style={{ color: brand.muted }}>
          Chưa có booking cho SĐT {verifiedPhone}. Agent tạo booking và gửi link thanh toán cho bạn.
        </p>
      )}

      <ul className="space-y-3">
        {deals.map((deal) => (
          <li key={deal.id}>
            <Link
              to={`/buyer/deals/${encodeURIComponent(deal.id)}`}
              className="block rounded-xl p-4 hover:shadow-sm transition-shadow"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold">{deal.unitCode}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {deal.id} · {new Date(deal.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white shrink-0"
                  style={{ background: statusColor(deal.status) }}
                >
                  {deal.status}
                </span>
              </div>
              {deal.depositAmount != null && (
                <p className="text-sm mt-2 font-semibold tabular-nums">{formatVnd(deal.depositAmount)}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </BuyerShell>
  );
}
