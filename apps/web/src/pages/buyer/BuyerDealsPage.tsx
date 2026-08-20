import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import { fetchBuyerDeals, type BuyerDealSummary } from '../../lib/api';
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

  useEffect(() => {
    let active = true;
    fetchBuyerDeals()
      .then((res) => {
        if (active) setDeals(res.data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được deals');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <BuyerShell title="Theo dõi giao dịch" subtitle="UC-BK-02 · SCR-BUYER-002">
      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {!loading && deals.length === 0 && (
        <p className="text-sm" style={{ color: brand.muted }}>
          Chưa có booking. Agent tạo booking và gửi link thanh toán cho bạn.
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

      <p className="text-xs mt-6" style={{ color: brand.muted }}>
        Demo seed: <Link to="/buyer/deals/bk_settle01" className="underline">bk_settle01</Link> (DEPOSITED)
      </p>
    </BuyerShell>
  );
}
