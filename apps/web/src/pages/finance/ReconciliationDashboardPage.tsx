import { useCallback, useEffect, useMemo, useState } from 'react';
import { FinanceShell } from '../../components/FinanceShell';
import {
  fetchReconciliationDay,
  fetchReconciliationRange,
  type ReconciliationRecord,
} from '../../lib/api';
import { brand, finance, formatIctDate, formatPercent, formatVnd } from '../../theme/tokens';

function todayIct(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function StatusBadge({ status }: { status: ReconciliationRecord['attributes']['status'] }) {
  const matched = status === 'MATCHED';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
      style={{
        background: matched ? '#DCFCE7' : '#FEE2E2',
        color: matched ? brand.success : brand.destructive,
      }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: matched ? brand.success : brand.destructive }}
      />
      {status}
    </span>
  );
}

function StreakBadge({
  rows,
  consecutiveMatchedDays,
  targetDays,
}: {
  rows: ReconciliationRecord[];
  consecutiveMatchedDays: number;
  targetDays: number;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, targetDays),
    [rows, targetDays],
  );
  const passed = consecutiveMatchedDays >= targetDays;

  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
      style={{
        background: passed ? '#DCFCE7' : '#F8FAFC',
        border: `1px solid ${passed ? '#BBF7D0' : brand.border}`,
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.muted }}>
          SCR-FIN-002 · OP-WIN-02 streak
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: passed ? brand.success : brand.warning }}>
          {consecutiveMatchedDays}/{targetDays} ngày MATCHED liên tiếp
        </p>
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          {passed ? 'Gate OP-WIN-02 PASS — export KPI screenshot' : 'Cần 7 ngày MATCHED liên tiếp (tính từ hôm nay)'}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {[...sorted].reverse().map((row) => {
          const matched = row.attributes.status === 'MATCHED';
          return (
            <span
              key={row.date}
              title={`${row.date} · ${row.attributes.status}`}
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: matched ? brand.success : brand.destructive }}
            />
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: highlight ? finance.accentSoft : brand.surface,
        border: `1px solid ${highlight ? finance.accent : brand.border}`,
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: finance.accentDark }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function ReconciliationDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayIct());
  const [range, setRange] = useState<ReconciliationRecord[]>([]);
  const [dayReport, setDayReport] = useState<ReconciliationRecord | null>(null);
  const [matchRate, setMatchRate] = useState(1);
  const [matchedDays, setMatchedDays] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [consecutiveMatchedDays, setConsecutiveMatchedDays] = useState(0);
  const [opWin02Passed, setOpWin02Passed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (date: string, refresh = false) => {
    setError(null);
    const [rangeRes, dayRes] = await Promise.all([
      fetchReconciliationRange(7, refresh),
      fetchReconciliationDay(date, refresh),
    ]);
    setRange(rangeRes.data);
    setMatchRate(rangeRes.meta.matchRate ?? 1);
    setMatchedDays(rangeRes.meta.matchedDays ?? 0);
    setTotalDays(rangeRes.meta.totalDays ?? rangeRes.data.length);
    setConsecutiveMatchedDays(rangeRes.meta.consecutiveMatchedDays ?? 0);
    setOpWin02Passed(rangeRes.meta.opWin02Passed ?? false);
    setDayReport(dayRes.data);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadData(selectedDate)
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Lỗi tải báo cáo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadData, selectedDate]);

  const gatePassed = opWin02Passed || matchRate >= 1;

  const discrepancies = dayReport?.attributes.discrepancies ?? [];

  const sortedRange = useMemo(
    () => [...range].sort((a, b) => b.date.localeCompare(a.date)),
    [range],
  );

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await loadData(selectedDate, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi làm mới');
    } finally {
      setRefreshing(false);
    }
  }

  const attrs = dayReport?.attributes;

  return (
    <FinanceShell
      title="Đối soát thanh toán hàng ngày"
      subtitle="Gateway webhooks vs ledger journals · Cron 06:00 ICT"
      screenTag="UC-PAY-02 · SCR-FIN-002 · SCR-FIN-004 · P3-S3"
    >
      <div className="space-y-6">
        <StreakBadge
          rows={range}
          consecutiveMatchedDays={consecutiveMatchedDays}
          targetDays={7}
        />

        <section
          className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
          style={{
            background: gatePassed ? '#DCFCE7' : '#FFEDD5',
            border: `1px solid ${gatePassed ? '#BBF7D0' : '#FED7AA'}`,
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: gatePassed ? brand.success : brand.warning }}>
              OP-WIN-02 · Match rate 7 ngày
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {formatPercent(matchRate)}{' '}
              <span className="text-base font-normal" style={{ color: brand.muted }}>
                ({matchedDays}/{totalDays} ngày MATCHED)
              </span>
            </p>
          </div>
          <StatusBadge status={gatePassed ? 'MATCHED' : 'MISMATCH'} />
        </section>

        <section className="flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            <span className="font-medium block mb-1">Ngày đối soát (ICT)</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: brand.border }}
            />
          </label>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: finance.accent }}
          >
            {refreshing ? 'Đang chạy lại…' : 'Chạy lại đối soát'}
          </button>
          <p className="text-xs ml-auto" style={{ color: brand.muted }}>
            API: GET /ledger/reconciliation?date=&amp;refresh=true
          </p>
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        )}

        {loading && !dayReport ? (
          <div className="rounded-xl p-8 text-center text-sm" style={{ color: brand.muted }}>
            Đang tải báo cáo…
          </div>
        ) : attrs ? (
          <>
            <section className="grid sm:grid-cols-3 gap-4">
              <KpiCard label="Gateway Total" value={formatVnd(attrs.gatewayTotal)} hint={`${attrs.gatewayCount} webhook(s)`} />
              <KpiCard label="Ledger Total" value={formatVnd(attrs.ledgerTotal)} hint={`${attrs.ledgerCount} journal(s)`} />
              <KpiCard
                label="Trạng thái"
                value={attrs.status}
                highlight={attrs.status === 'MATCHED'}
              />
            </section>

            <section
              className="rounded-xl overflow-hidden"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="px-4 py-3 border-b flex flex-wrap justify-between gap-2" style={{ borderColor: brand.border }}>
                <h2 className="font-semibold">
                  Chi tiết {formatIctDate(selectedDate)}
                </h2>
                <StatusBadge status={attrs.status} />
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p style={{ color: brand.muted }}>Chênh lệch</p>
                  <p className="font-bold tabular-nums text-lg">
                    {formatVnd(Math.abs(attrs.gatewayTotal - attrs.ledgerTotal))}
                  </p>
                </div>
                <div>
                  <p style={{ color: brand.muted }}>Chạy lúc</p>
                  <p className="font-mono text-sm">
                    {new Date(attrs.ranAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </p>
                </div>
              </div>

              {discrepancies.length > 0 ? (
                <div className="overflow-x-auto border-t" style={{ borderColor: brand.border }}>
                  <table className="w-full text-sm">
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Loại</th>
                        <th className="text-left px-4 py-2 font-medium">Payment Intent</th>
                        <th className="text-left px-4 py-2 font-medium">Gateway</th>
                        <th className="text-left px-4 py-2 font-medium">Ledger</th>
                        <th className="text-left px-4 py-2 font-medium">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.map((row, idx) => (
                        <tr key={idx} className="border-t" style={{ borderColor: brand.border }}>
                          <td className="px-4 py-2 font-mono text-xs">{row.type}</td>
                          <td className="px-4 py-2 font-mono text-xs">{row.paymentIntentId ?? '—'}</td>
                          <td className="px-4 py-2 tabular-nums">
                            {row.gatewayAmount !== undefined ? formatVnd(row.gatewayAmount) : '—'}
                          </td>
                          <td className="px-4 py-2 tabular-nums">
                            {row.ledgerAmount !== undefined ? formatVnd(row.ledgerAmount) : '—'}
                          </td>
                          <td className="px-4 py-2 text-xs" style={{ color: brand.muted }}>
                            {row.detail ?? row.journalId ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="mx-4 mb-4 rounded-lg p-3 text-sm text-center"
                  style={{ background: '#DCFCE7', color: brand.success }}
                >
                  Không có discrepancy · Gateway khớp Ledger 100%
                </div>
              )}
            </section>
          </>
        ) : null}

        <section
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: brand.border }}>
            <h2 className="font-semibold">7 ngày gần nhất</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Ngày</th>
                  <th className="text-left px-4 py-2 font-medium">Gateway</th>
                  <th className="text-left px-4 py-2 font-medium">Ledger</th>
                  <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sortedRange.map((row) => (
                  <tr
                    key={row.date}
                    className="border-t cursor-pointer hover:bg-slate-50"
                    style={{
                      borderColor: brand.border,
                      background: row.date === selectedDate ? finance.accentSoft : undefined,
                    }}
                    onClick={() => setSelectedDate(row.date)}
                  >
                    <td className="px-4 py-2">{formatIctDate(row.date)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatVnd(row.attributes.gatewayTotal)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatVnd(row.attributes.ledgerTotal)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={row.attributes.status} />
                    </td>
                  </tr>
                ))}
                {!loading && sortedRange.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center" style={{ color: brand.muted }}>
                      Chưa có báo cáo. Chạy payment demo S4 rồi bấm &quot;Chạy lại đối soát&quot;.
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
