import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  applyMarketplacePenalty,
  fetchMarketplaceRankings,
  type MarketplaceAgencyRank,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function statusColor(status: string) {
  if (status === 'PENALIZED') return brand.destructive;
  if (status === 'WARNING') return brand.warning;
  return brand.success;
}

export function AdminMarketplacePage() {
  const [rankings, setRankings] = useState<MarketplaceAgencyRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState('SLA breach trên lead pipeline');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarketplaceRankings();
      setRankings(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải marketplace rankings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePenalty(agencyTenantId: string) {
    setBusyId(agencyTenantId);
    setError(null);
    try {
      const res = await applyMarketplacePenalty({
        agencyTenantId,
        points: 5,
        reason: reason.trim() || 'Ops penalty',
      });
      setRankings(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply penalty thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Marketplace ranking & SLA"
      subtitle="UC-MKT-04 · SCR-ADMIN-015 · Agency penalty"
      screenTag="Admin / Ops Portal"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/agent/marketplace/apply" className="underline" style={{ color: brand.primary }}>
          Agent apply flow
        </Link>
        <Link to="/admin/kyc" className="underline" style={{ color: brand.muted }}>
          KYC queue
        </Link>
      </div>

      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      <div className="mb-4">
        <label className="text-xs font-medium block mb-1">Lý do penalty mặc định</label>
        <input
          className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-3">
          {rankings.map((row) => (
            <div
              key={row.agencyTenantId}
              className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div>
                <p className="font-semibold text-sm">
                  #{row.rank} {row.agencyName}
                </p>
                <p className="text-xs mt-1" style={{ color: brand.muted }}>
                  SLA {row.slaScore} · penalty −{row.penaltyPoints} · apps {row.openApplications}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ background: statusColor(row.status) }}
                >
                  {row.status}
                </span>
                <button
                  type="button"
                  disabled={busyId === row.agencyTenantId}
                  className="text-sm underline disabled:opacity-50"
                  style={{ color: brand.destructive }}
                  onClick={() => void handlePenalty(row.agencyTenantId)}
                >
                  +5 penalty
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
