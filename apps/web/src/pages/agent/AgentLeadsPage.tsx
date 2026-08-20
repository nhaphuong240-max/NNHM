import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import { fetchLeads, PIPELINE_STAGES, type LeadRecord } from '../../lib/api';
import { brand } from '../../theme/tokens';
import {
  formatRelativeTime,
  hasPendingScoring,
  isHotLead,
  isOverdue,
  PENDING_POLL_MS,
  stageLabel,
  tierColor,
} from './agentLeadUi';

type TierFilter = 'ALL' | 'HOT' | 'WARM' | 'NEW';

export function AgentLeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTier = (searchParams.get('tier')?.toUpperCase() as TierFilter) || 'ALL';
  const initialStage = searchParams.get('stage') ?? 'ALL';

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [tierFilter, setTierFilter] = useState<TierFilter>(
    ['ALL', 'HOT', 'WARM', 'NEW'].includes(initialTier) ? initialTier : 'ALL',
  );
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeads();
      setLeads(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải lead list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoringPending = useMemo(() => hasPendingScoring(leads), [leads]);

  useEffect(() => {
    if (!scoringPending) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetchLeads();
        setLeads(res.data);
      } catch {
        /* silent */
      }
    }, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [scoringPending]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tierFilter !== 'ALL') params.set('tier', tierFilter);
    if (stageFilter !== 'ALL') params.set('stage', stageFilter);
    setSearchParams(params, { replace: true });
  }, [tierFilter, stageFilter, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (tierFilter !== 'ALL' && lead.attributes.tier !== tierFilter) return false;
        if (stageFilter !== 'ALL' && lead.attributes.status !== stageFilter) return false;
        if (!q) return true;
        return (
          lead.attributes.fullName.toLowerCase().includes(q) ||
          lead.attributes.phone.includes(q) ||
          lead.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.attributes.score - a.attributes.score);
  }, [leads, tierFilter, stageFilter, query]);

  return (
    <AgentShell
      title="Lead list"
      subtitle="UC-CRM-03 · Sorted by AI score · AC-CRM-05-03"
      screenTag="Agent / CRM"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link to="/agent" className="text-sm underline" style={{ color: brand.primary }}>
          ← Dashboard
        </Link>
        <div className="flex gap-3 text-sm">
          <Link to="/agent/leads/import" className="underline" style={{ color: brand.primary }}>
            Import CSV
          </Link>
          <Link to="/agent/pipeline" className="underline" style={{ color: brand.primary }}>
            Pipeline kanban
          </Link>
          <button type="button" className="underline" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['ALL', 'HOT', 'WARM', 'NEW'] as TierFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTierFilter(t)}
            className="rounded-full px-3 py-1 text-xs border"
            style={{
              borderColor: tierFilter === t ? brand.primary : brand.border,
              background: tierFilter === t ? '#EFF6FF' : brand.surface,
              color: tierFilter === t ? brand.primary : brand.muted,
            }}
          >
            {t === 'ALL' ? 'Tất cả tier' : t}
          </button>
        ))}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border px-3 py-1 text-xs ml-auto"
          style={{ borderColor: brand.border }}
        >
          <option value="ALL">Mọi stage</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm tên, SĐT, lead ID…"
        className="w-full max-w-md h-10 px-3 rounded-lg border text-sm mb-4"
        style={{ borderColor: brand.border }}
      />

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {!loading && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <table className="w-full text-sm">
            <thead style={{ background: brand.background }}>
              <tr>
                <th className="text-left p-3 font-medium">Score</th>
                <th className="text-left p-3 font-medium">Lead</th>
                <th className="text-left p-3 font-medium">Stage</th>
                <th className="text-left p-3 font-medium">Unit</th>
                <th className="text-left p-3 font-medium">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center" style={{ color: brand.muted }}>
                    Không có lead phù hợp bộ lọc
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="border-t hover:bg-slate-50/80" style={{ borderColor: brand.border }}>
                    <td className="p-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{
                          background: isHotLead(lead) ? tierColor(lead.attributes.tier) : brand.muted,
                        }}
                      >
                        {lead.attributes.scoreStatus === 'PENDING' ? '…' : lead.attributes.score}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/agent/leads/${encodeURIComponent(lead.id)}`}
                        className="font-medium underline"
                        style={{ color: brand.primaryDark }}
                      >
                        {lead.attributes.fullName}
                      </Link>
                      <p className="text-xs font-mono mt-0.5" style={{ color: brand.muted }}>
                        {lead.attributes.phone} · {lead.id}
                      </p>
                      {isOverdue(lead) && (
                        <span className="text-[10px] font-bold" style={{ color: brand.destructive }}>
                          SLA overdue
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs">{stageLabel(lead.attributes.status)}</td>
                    <td className="p-3 font-mono text-xs">{lead.attributes.unitId ?? '—'}</td>
                    <td className="p-3 text-xs" style={{ color: brand.muted }}>
                      {formatRelativeTime(lead.attributes.lastActivityAt ?? lead.attributes.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="text-xs p-3 border-t" style={{ borderColor: brand.border, color: brand.muted }}>
            {filtered.length} / {leads.length} lead · sắp xếp theo score giảm dần
          </p>
        </div>
      )}
    </AgentShell>
  );
}
