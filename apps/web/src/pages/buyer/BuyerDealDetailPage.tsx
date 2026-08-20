import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BuyerShell } from '../../components/BuyerShell';
import { fetchBuyerDeal, sendBuyerDealNotifyStub, type BuyerDealDetail } from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

export function BuyerDealDetailPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const [deal, setDeal] = useState<BuyerDealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    setLoading(true);
    fetchBuyerDeal(bookingId)
      .then((res) => {
        if (active) setDeal(res.data.attributes);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải deal');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  return (
    <BuyerShell title={`Deal ${bookingId}`} subtitle="UC-BK-02 · UC-UX-02 · Deal tracker + notifications">
      <Link to="/buyer/deals" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Tất cả deals
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {deal && (
        <div className="space-y-6">
          <section
            className="rounded-xl p-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <p className="text-xs" style={{ color: brand.muted }}>
              Căn {deal.unitCode}
            </p>
            <p className="text-lg font-bold mt-1">{deal.status}</p>
            {deal.depositAmount != null && (
              <p className="text-sm mt-1 tabular-nums">{formatVnd(deal.depositAmount)}</p>
            )}
            <p className="text-xs mt-2" style={{ color: brand.muted }}>
              Hết hạn giữ chỗ: {new Date(deal.expiresAt).toLocaleString('vi-VN')}
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-4 text-sm">Tiến trình giao dịch</h2>
            <ol className="relative border-s-2 space-y-6 ps-6" style={{ borderColor: brand.border }}>
              {deal.steps.map((step) => (
                <li key={step.id} className="relative">
                  <span
                    className="absolute -start-[1.35rem] top-0.5 h-3 w-3 rounded-full ring-4 ring-white"
                    style={{
                      background: step.done ? brand.success : step.active ? brand.warning : brand.border,
                    }}
                  />
                  <p className={`font-medium text-sm ${step.active ? '' : 'opacity-80'}`}>{step.label}</p>
                  {step.active && (
                    <p className="text-xs mt-1" style={{ color: brand.warning }}>
                      Đang thực hiện
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm">Thông báo (SMS / ZNS / in-app)</h2>
              <button
                type="button"
                disabled={notifyBusy}
                className="text-xs rounded-lg px-3 py-1.5 border disabled:opacity-50"
                style={{ borderColor: brand.border }}
                onClick={() => {
                  setNotifyBusy(true);
                  setNotifyMsg(null);
                  void sendBuyerDealNotifyStub(bookingId)
                    .then((res) => {
                      setNotifyMsg(
                        res.data.sent
                          ? `Đã gửi ZNS demo · ${res.data.deliveryId ?? 'ok'}`
                          : 'ZNS stub skipped (xem API meta)',
                      );
                      return fetchBuyerDeal(bookingId);
                    })
                    .then((res) => setDeal(res.data.attributes))
                    .catch((e) => setNotifyMsg(e instanceof Error ? e.message : 'Gửi thất bại'))
                    .finally(() => setNotifyBusy(false));
                }}
              >
                {notifyBusy ? 'Đang gửi…' : 'Gửi ZNS demo'}
              </button>
            </div>
            {notifyMsg && (
              <p className="text-xs rounded-lg p-2" style={{ background: '#EFF6FF', color: brand.primary }}>
                {notifyMsg}
              </p>
            )}
            <ul className="space-y-2">
              {(deal.notifications ?? []).map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg p-3 text-xs"
                  style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{n.title}</span>
                    <span style={{ color: brand.muted }}>{n.channel}</span>
                  </div>
                  <p className="mt-1">{n.body}</p>
                  <p className="mt-1" style={{ color: brand.muted }}>
                    {new Date(n.sentAt).toLocaleString('vi-VN')} · {n.status}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {deal.status === 'RESERVED' && deal.paymentIntentId && (
            <Link
              to={`/buyer/payment/${encodeURIComponent(deal.paymentIntentId)}`}
              className="block text-center rounded-xl py-3 font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Thanh toán cọc →
            </Link>
          )}

          {deal.status === 'DEPOSITED' && (
            <div className="space-y-3">
              <p
                className="text-sm rounded-lg p-3"
                style={{ background: '#ECFDF5', color: brand.success, border: `1px solid ${brand.success}` }}
              >
                Cọc đã hoàn tất. Agent đã gửi HĐ đặt cọc — ký điện tử bước tiếp theo.
              </p>
              <Link
                to="/buyer/esign?contractId=ctr_esign_demo01"
                className="block text-center rounded-xl py-3 font-semibold text-white"
                style={{ background: brand.success }}
              >
                Ký HĐ điện tử (UC-BK-07) →
              </Link>
            </div>
          )}
        </div>
      )}
    </BuyerShell>
  );
}
