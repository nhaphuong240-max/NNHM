import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  createActivity,
  fetchActivities,
  fetchLeads,
  LOST_REASONS,
  patchLeadStage,
  PIPELINE_STAGES,
  type ActivityRecord,
  type LeadRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

type FilterId = 'all' | 'hot' | 'hasUnit' | 'overdue';

const QUICK_ACTIVITIES = [
  { type: 'CALL' as const, label: 'Gọi' },
  { type: 'ZALO' as const, label: 'Zalo' },
  { type: 'VISIT' as const, label: 'Xem nhà' },
  { type: 'NOTE' as const, label: 'Ghi chú' },
];

const SLA_HOURS = 48;
/** Khớp target lag UC-AI-02 worker (~2s) */
const PENDING_POLL_MS = 2000;

function hasPendingScoring(leads: LeadRecord[]) {
  return leads.some((l) => l.attributes.scoreStatus === 'PENDING');
}

function formatTs(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function tierColor(tier: string) {
  if (tier === 'HOT') return brand.destructive;
  if (tier === 'WARM') return brand.warning;
  return brand.muted;
}

function isOverdue(lead: LeadRecord) {
  const stage = lead.attributes.status;
  if (!['NEW', 'CONTACTED'].includes(stage)) return false;
  const ref = lead.attributes.lastActivityAt ?? lead.attributes.updatedAt;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > SLA_HOURS * 60 * 60 * 1000;
}

function matchesFilter(lead: LeadRecord, filter: FilterId) {
  if (filter === 'hot') return lead.attributes.tier === 'HOT';
  if (filter === 'hasUnit') return Boolean(lead.attributes.unitId);
  if (filter === 'overdue') return isOverdue(lead);
  return true;
}

export function AgentPipelinePage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeadRecord | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ leadId: string; stage: string } | null>(null);
  const [activityNote, setActivityNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeads();
      setLeads(res.data);
      setSelected((prev) => {
        if (!prev) return null;
        return res.data.find((l) => l.id === prev.id) ?? prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLeads = useCallback(async () => {
    try {
      const res = await fetchLeads();
      setLeads(res.data);
      setSelected((prev) => {
        if (!prev) return null;
        return res.data.find((l) => l.id === prev.id) ?? prev;
      });
    } catch {
      // Poll im lặng — không ghi đè lỗi từ load thủ công
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoringPending = useMemo(() => hasPendingScoring(leads), [leads]);

  useEffect(() => {
    if (!scoringPending) return;
    const timer = window.setInterval(() => void refreshLeads(), PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [scoringPending, refreshLeads]);

  useEffect(() => {
    if (!selected) {
      setActivities([]);
      return;
    }
    void fetchActivities(selected.id)
      .then((res) => setActivities(res.data))
      .catch(() => setActivities([]));
  }, [selected]);

  const filteredLeads = useMemo(
    () => leads.filter((l) => matchesFilter(l, filter)),
    [leads, filter],
  );

  const columns = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      leads: filteredLeads.filter((l) => l.attributes.status === stage.code),
    }));
  }, [filteredLeads]);

  async function moveLead(leadId: string, stage: string, lostReason?: string) {
    setBusyId(leadId);
    setError(null);
    try {
      const lead = leads.find((l) => l.id === leadId);
      const res = await patchLeadStage(leadId, {
        stage,
        lostReason,
        unitId: stage === 'BOOKING' && !lead?.attributes.unitId ? undefined : lead?.attributes.unitId,
      });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? res.data : l)));
      if (selected?.id === leadId) setSelected(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật stage thất bại');
    } finally {
      setBusyId(null);
      setLostPrompt(null);
    }
  }

  function handleDrop(stage: string) {
    if (!dragLeadId) return;
    if (stage === 'LOST') {
      setLostPrompt({ leadId: dragLeadId, stage });
      setDragLeadId(null);
      return;
    }
    void moveLead(dragLeadId, stage);
    setDragLeadId(null);
  }

  async function handleQuickActivity(type: (typeof QUICK_ACTIVITIES)[number]['type']) {
    if (!selected) return;
    setBusyId(selected.id);
    setError(null);
    try {
      await createActivity({
        leadId: selected.id,
        type,
        summary: activityNote.trim() || `${type} — pipeline quick log`,
      });
      setActivityNote('');
      const [leadRes, actRes] = await Promise.all([fetchLeads(), fetchActivities(selected.id)]);
      setLeads(leadRes.data);
      setActivities(actRes.data);
      const updated = leadRes.data.find((l) => l.id === selected.id);
      if (updated) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ghi activity thất bại');
    } finally {
      setBusyId(null);
    }
  }

  const bookingHref = selected
    ? `/agent/bookings/new?leadId=${encodeURIComponent(selected.id)}${
        selected.attributes.unitId ? `&unitId=${encodeURIComponent(selected.attributes.unitId)}` : ''
      }`
    : '/agent/bookings/new';

  return (
    <AgentShell
      title="Pipeline CRM"
      subtitle="UC-CRM-03 · FR-CRM-04/05 · Kanban stage"
      screenTag="Agent / SCR-AGENT-014"
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link to="/agent" className="text-sm underline" style={{ color: brand.primary }}>
          ← Dashboard
        </Link>
        <Link to="/agent/leads" className="text-sm underline" style={{ color: brand.primary }}>
          Lead list
        </Link>
        <Link
          to="/agent/leads/import"
          className="rounded-full px-3 py-1 text-sm font-medium border underline"
          style={{ borderColor: brand.primary, color: brand.primary, background: '#EFF6FF' }}
        >
          Import CSV (SCR-AGENT-008)
        </Link>
        {(
          [
            ['all', 'Tất cả'],
            ['hot', 'HOT'],
            ['hasUnit', 'Có unit'],
            ['overdue', 'Quá SLA'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="rounded-full px-3 py-1 text-sm font-medium border"
            style={{
              borderColor: filter === id ? brand.primary : brand.border,
              background: filter === id ? '#EFF6FF' : brand.surface,
              color: filter === id ? brand.primary : brand.muted,
            }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm underline ml-auto"
          style={{ color: brand.primary }}
        >
          Làm mới
        </button>
        {scoringPending && (
          <span
            className="text-xs px-2 py-0.5 rounded-full animate-pulse"
            style={{ background: '#FEF3C7', color: brand.warning }}
          >
            AI chấm điểm…
          </span>
        )}
        <span className="text-sm" style={{ color: brand.muted }}>
          {filteredLeads.length} lead
        </span>
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Đang tải kanban…
        </p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {columns.map((col) => (
              <div
                key={col.code}
                className="w-56 shrink-0 rounded-xl p-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.code)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: brand.background, color: brand.muted }}
                  >
                    {col.leads.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {col.leads.map((lead) => {
                    const a = lead.attributes;
                    const overdue = isOverdue(lead);
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragLeadId(lead.id)}
                        onDragEnd={() => setDragLeadId(null)}
                        className="rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        style={{
                          background: brand.background,
                          border: `1px solid ${overdue ? brand.warning : brand.border}`,
                          opacity: busyId === lead.id ? 0.6 : 1,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="text-left font-medium text-sm"
                            onClick={() => setSelected(lead)}
                          >
                            {a.fullName}
                          </button>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {a.scoreStatus === 'PENDING' && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: '#FEF3C7', color: brand.warning }}
                              >
                                AI…
                              </span>
                            )}
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                              style={{ background: tierColor(a.tier) }}
                            >
                              {a.tier}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs mt-1 font-mono" style={{ color: brand.muted }}>
                          {a.unitId ?? 'Chưa chọn unit'} · score {a.score}
                          {a.assignedTo ? ` · ${a.assignedTo}` : ''}
                        </p>
                        {overdue && (
                          <p className="text-xs mt-1 font-medium" style={{ color: brand.warning }}>
                            SLA &gt; {SLA_HOURS}h
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: brand.muted }}>
                          {formatTs(a.lastActivityAt ?? a.updatedAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lostPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-sm rounded-xl p-5 space-y-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold">Lý do thất bại (LOST)</h3>
            <div className="space-y-2">
              {LOST_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  className="block w-full text-left rounded-lg px-3 py-2 text-sm border hover:bg-slate-50"
                  style={{ borderColor: brand.border }}
                  onClick={() => void moveLead(lostPrompt.leadId, 'LOST', r.code)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" className="text-sm underline" onClick={() => setLostPrompt(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {selected && (
        <aside
          className="fixed inset-y-0 right-0 w-full max-w-md shadow-xl z-40 flex flex-col"
          style={{ background: brand.surface, borderLeft: `1px solid ${brand.border}` }}
        >
          <div
            className="px-5 py-4 flex items-start justify-between gap-3 border-b"
            style={{ borderColor: brand.border }}
          >
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Lead {selected.id} ·{' '}
                <Link
                  to={`/agent/leads/${encodeURIComponent(selected.id)}`}
                  className="underline"
                  style={{ color: brand.primary }}
                >
                  Mở trang chi tiết
                </Link>
              </p>
              <h2 className="font-semibold text-lg">{selected.attributes.fullName}</h2>
              <p className="text-sm" style={{ color: brand.muted }}>
                {selected.attributes.phone} · {selected.attributes.status}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-sm underline">
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <dt style={{ color: brand.muted }}>Tier / Score</dt>
              <dd>
                {selected.attributes.tier} · {selected.attributes.score}
                {selected.attributes.scoreStatus === 'PENDING' && (
                  <span className="ml-1 text-xs font-medium" style={{ color: brand.warning }}>
                    (đang chấm điểm)
                  </span>
                )}
              </dd>
              <dt style={{ color: brand.muted }}>Agent</dt>
              <dd className="font-mono">{selected.attributes.assignedTo ?? '—'}</dd>
              <dt style={{ color: brand.muted }}>Unit</dt>
              <dd className="font-mono">{selected.attributes.unitId ?? '—'}</dd>
              <dt style={{ color: brand.muted }}>Nguồn</dt>
              <dd>{selected.attributes.source}</dd>
              <dt style={{ color: brand.muted }}>Hoạt động cuối</dt>
              <dd>{formatTs(selected.attributes.lastActivityAt)}</dd>
            </dl>

            <div>
              <p className="font-semibold mb-2">Quick activity log</p>
              <input
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                placeholder="Ghi chú tùy chọn…"
                className="w-full h-9 px-3 rounded-lg border text-sm mb-2"
                style={{ borderColor: brand.border }}
              />
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIVITIES.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => void handleQuickActivity(a.type)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium border disabled:opacity-50"
                    style={{ borderColor: brand.border }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Timeline ({activities.length})</p>
              {activities.length === 0 ? (
                <p style={{ color: brand.muted }}>Chưa có activity.</p>
              ) : (
                <ul className="space-y-2">
                  {activities.map((act) => (
                    <li
                      key={act.id}
                      className="rounded-lg p-2 text-xs"
                      style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                    >
                      <span className="font-bold">{act.attributes.type}</span>
                      {' · '}
                      {act.attributes.summary ?? '—'}
                      <br />
                      <span style={{ color: brand.muted }}>{formatTs(act.attributes.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              to={bookingHref}
              className="inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Tạo booking (UC-BK-01)
            </Link>
          </div>
        </aside>
      )}
    </AgentShell>
  );
}
