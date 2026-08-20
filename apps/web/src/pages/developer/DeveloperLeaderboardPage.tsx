import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  fetchDeveloperLeaderboard,
  type DeveloperLeaderboardEntry,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

function StatusBadge({ status }: { status: DeveloperLeaderboardEntry['status'] }) {
  const tone =
    status === 'TOP'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'GOOD'
        ? { bg: '#EFF6FF', color: brand.primary }
        : status === 'PENALIZED'
          ? { bg: '#FEE2E2', color: brand.destructive }
          : { bg: '#FFEDD5', color: brand.warning };

  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={tone}>
      {status}
    </span>
  );
}

export function DeveloperLeaderboardPage() {
  const [rows, setRows] = useState<DeveloperLeaderboardEntry[]>([]);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeveloperLeaderboard();
      setRows(res.data);
      setPeriod(res.meta.period);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DeveloperShell
      title="Agency leaderboard"
      subtitle="UC-MKT-03 · SCR-DEV-009 · Compliance & GMV ranking"
      screenTag="Developer / Marketing"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm items-center">
        <Link to="/developer/distribution" className="underline" style={{ color: brand.primary }}>
          Distribution policy
        </Link>
        <button type="button" className="underline" onClick={() => void load()}>
          Làm mới
        </button>
        {period && (
          <span className="text-xs" style={{ color: brand.muted }}>
            Period: {period}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải bảng xếp hạng…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm rounded-xl p-6 text-center" style={{ color: brand.muted, background: brand.surface }}>
          Chưa có agency nào trong tenant pilot.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${brand.border}` }}>
          <table className="w-full text-sm">
            <thead style={{ background: brand.background }}>
              <tr>
                <th className="text-left p-3 font-semibold">#</th>
                <th className="text-left p-3 font-semibold">Agency</th>
                <th className="text-right p-3 font-semibold">Deposited</th>
                <th className="text-right p-3 font-semibold">Closed</th>
                <th className="text-right p-3 font-semibold">GMV</th>
                <th className="text-right p-3 font-semibold">Compliance</th>
                <th className="text-right p-3 font-semibold">Penalty</th>
                <th className="text-left p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.agencyTenantId} style={{ background: brand.surface, borderTop: `1px solid ${brand.border}` }}>
                  <td className="p-3 font-bold tabular-nums">{row.rank}</td>
                  <td className="p-3">
                    <p className="font-medium">{row.agencyName}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: brand.muted }}>
                      {row.agencyTenantId}
                    </p>
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.depositedCount}</td>
                  <td className="p-3 text-right tabular-nums">{row.dealsClosed}</td>
                  <td className="p-3 text-right tabular-nums">{formatVnd(row.gmvVnd)}</td>
                  <td className="p-3 text-right tabular-nums">{row.complianceScore}</td>
                  <td className="p-3 text-right tabular-nums">{row.penaltyPoints}</td>
                  <td className="p-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: brand.muted }}>
        Xếp hạng dựa trên deposited/closed deals, SLA compliance và điểm phạt marketplace (audit{' '}
        <code className="font-mono">marketplace_penalty</code>).
      </p>
    </DeveloperShell>
  );
}
