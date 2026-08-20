import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchGmvReport, type GmvReportData } from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function AdminGmvPage() {
  const [data, setData] = useState<GmvReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGmvReport();
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải GMV');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attrs = data?.attributes;
  const maxMonth = Math.max(
    1,
    ...(attrs?.byMonth.map((m) => Math.max(m.depositGmv, m.paymentGmv)) ?? [1]),
  );

  return (
    <AdminShell
      title="Báo cáo GMV"
      subtitle="UC-AN-02 · SCR-ADMIN-003 · BR-11 reconcile pilot"
      screenTag="Admin / Analytics"
    >
      <Link to="/admin" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Dashboard
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải GMV…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="space-y-8">
          <p className="text-xs" style={{ color: brand.muted }}>
            Kỳ: {formatTs(attrs.period.from)} → {formatTs(attrs.period.to)} (mặc định 30 ngày)
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                GMV cọc (bookings)
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums">{formatVnd(attrs.depositGmv)}</p>
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                {attrs.depositedBookings} booking DEPOSITED
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                GMV payment intents
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums">{formatVnd(attrs.paymentGmv)}</p>
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                {attrs.succeededPayments} SUCCEEDED
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Total GMV (pilot)
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: brand.primary }}>
                {formatVnd(attrs.totalGmv)}
              </p>
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                max(cọc, payment) — tránh double-count
              </p>
            </div>
          </div>

          {attrs.byMonth.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold mb-4">Theo tháng</h3>
              <div className="space-y-3">
                {attrs.byMonth.map((row) => (
                  <div key={row.month} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono">{row.month}</span>
                      <span className="tabular-nums">{formatVnd(Math.max(row.depositGmv, row.paymentGmv))}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, Math.round((Math.max(row.depositGmv, row.paymentGmv) / maxMonth) * 100))}%`,
                          background: brand.primary,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-4">Cọc gần đây</h3>
            {attrs.recentDeposits.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có booking DEPOSITED trong kỳ. Seed demo: bk_settle01 (100M).
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ color: brand.muted }}>
                    <th className="pb-2">Booking</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Số tiền</th>
                    <th className="pb-2">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {attrs.recentDeposits.map((row) => (
                    <tr key={row.bookingId} className="border-t" style={{ borderColor: brand.border }}>
                      <td className="py-2 font-mono text-xs">{row.bookingId}</td>
                      <td className="py-2 font-mono text-xs">{row.unitId}</td>
                      <td className="py-2 tabular-nums">{formatVnd(row.amount)}</td>
                      <td className="py-2 text-xs">{formatTs(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
