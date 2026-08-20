import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  createActivity,
  fetchActivities,
  fetchLead,
  fetchLeadScoreExplain,
  LOST_REASONS,
  patchLeadStage,
  PIPELINE_STAGES,
  type ActivityRecord,
  type LeadRecord,
  type LeadScoreExplain,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const QUICK_ACTIVITIES = [
  { type: 'CALL' as const, label: 'Gọi' },
  { type: 'ZALO' as const, label: 'Zalo' },
  { type: 'VISIT' as const, label: 'Xem nhà' },
  { type: 'NOTE' as const, label: 'Ghi chú' },
];

function formatTs(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function tierColor(tier: string) {
  if (tier === 'HOT') return brand.destructive;
  if (tier === 'WARM') return brand.warning;
  return brand.muted;
}

export function AgentLeadDetailPage() {
  const { leadId = '' } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityNote, setActivityNote] = useState('');
  const [scoreExplain, setScoreExplain] = useState<LeadScoreExplain | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const [leadRes, actRes, scoreRes] = await Promise.all([
        fetchLead(leadId),
        fetchActivities(leadId),
        fetchLeadScoreExplain(leadId).catch(() => null),
      ]);
      setLead(leadRes.data);
      setActivities(actRes.data);
      setScoreExplain(scoreRes?.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const bookingHref = useMemo(() => {
    if (!lead) return '/agent/bookings/new';
    const qs = new URLSearchParams({ leadId: lead.id });
    if (lead.attributes.unitId) qs.set('unitId', lead.attributes.unitId);
    return `/agent/bookings/new?${qs.toString()}`;
  }, [lead]);

  async function handleQuickActivity(type: 'CALL' | 'NOTE' | 'VISIT' | 'ZALO' | 'MEETING') {
    if (!lead) return;
    setBusy(true);
    try {
      await createActivity({
        leadId: lead.id,
        type,
        summary: activityNote.trim() || undefined,
      });
      setActivityNote('');
      const actRes = await fetchActivities(lead.id);
      setActivities(actRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ghi activity thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(stage: string) {
    if (!lead) return;
    setBusy(true);
    try {
      const res = await patchLeadStage(lead.id, { stage });
      setLead(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đổi stage thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AgentShell
      title={lead ? lead.attributes.fullName : 'Lead detail'}
      subtitle="UC-CRM-02 · UC-AI-02 · Lead detail + score explain"
      screenTag="Agent / SCR-AGENT-014"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/agent/leads" className="underline" style={{ color: brand.primary }}>
          ← Lead list
        </Link>
        <Link to="/agent/pipeline" className="underline" style={{ color: brand.primary }}>
          Pipeline
        </Link>
        <Link to="/agent/settings/routing" className="underline" style={{ color: brand.muted }}>
          Routing settings
        </Link>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải lead…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {lead && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="text-xs font-mono" style={{ color: brand.muted }}>
                {lead.id}
              </p>
              <h2 className="text-xl font-bold mt-1">{lead.attributes.fullName}</h2>
              <p className="text-sm mt-1">
                {lead.attributes.phone} ·{' '}
                <span style={{ color: tierColor(lead.attributes.tier) }}>
                  {lead.attributes.tier} · {lead.attributes.score}
                </span>
              </p>
              <dl className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <dt style={{ color: brand.muted }}>Stage</dt>
                  <dd className="font-semibold">{lead.attributes.status}</dd>
                </div>
                <div>
                  <dt style={{ color: brand.muted }}>Routing</dt>
                  <dd>{lead.attributes.routingStatus ?? '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: brand.muted }}>Agent</dt>
                  <dd className="font-mono">{lead.attributes.assignedTo ?? '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: brand.muted }}>Unit</dt>
                  <dd className="font-mono">{lead.attributes.unitId ?? '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: brand.muted }}>Nguồn</dt>
                  <dd>{lead.attributes.source}</dd>
                </div>
                <div>
                  <dt style={{ color: brand.muted }}>Hoạt động cuối</dt>
                  <dd>{formatTs(lead.attributes.lastActivityAt)}</dd>
                </div>
              </dl>
            </section>

            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="font-semibold mb-3">Chuyển stage</p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STAGES.filter((s) => s.code !== 'LOST').map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    disabled={busy || lead.attributes.status === s.code}
                    onClick={() => void changeStage(s.code)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium border disabled:opacity-50"
                    style={{
                      borderColor: brand.border,
                      background: lead.attributes.status === s.code ? brand.primary : brand.surface,
                      color: lead.attributes.status === s.code ? '#fff' : brand.primaryDark,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {LOST_REASONS.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patchLeadStage(lead.id, { stage: 'LOST', lostReason: r.code }).then((res) =>
                        setLead(res.data),
                      )
                    }
                    className="text-xs underline"
                    style={{ color: brand.destructive }}
                  >
                    LOST · {r.label}
                  </button>
                ))}
              </div>
            </section>

            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="font-semibold mb-2">Timeline ({activities.length})</p>
              {activities.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Chưa có activity.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activities.map((act) => (
                    <li
                      key={act.id}
                      className="rounded-lg p-2 text-xs"
                      style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                    >
                      <span className="font-bold">{act.attributes.type}</span> ·{' '}
                      {act.attributes.summary ?? '—'}
                      <br />
                      <span style={{ color: brand.muted }}>{formatTs(act.attributes.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            {scoreExplain && (
              <section
                className="rounded-xl p-5 space-y-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <p className="font-semibold">AI score explain (UC-AI-02)</p>
                <p className="text-sm">
                  <span style={{ color: tierColor(scoreExplain.tier) }} className="font-bold">
                    {scoreExplain.tier} · {scoreExplain.score}
                  </span>
                  <span className="text-xs ml-2" style={{ color: brand.muted }}>
                    {scoreExplain.scoreStatus} · {scoreExplain.modelVersion}
                  </span>
                </p>
                {scoreExplain.unscored && (
                  <p className="text-xs rounded-lg p-2" style={{ background: '#FFEDD5', color: brand.warning }}>
                    Provisional / unscored — fallback rules
                  </p>
                )}
                <ul className="space-y-2 text-xs">
                  {scoreExplain.factors.map((factor) => (
                    <li
                      key={factor.key}
                      className="rounded-lg p-2"
                      style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{factor.label}</span>
                        <span className="tabular-nums font-bold">+{factor.impact}</span>
                      </div>
                      <p style={{ color: brand.muted }}>{factor.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section
              className="rounded-xl p-5 space-y-3"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p className="font-semibold">Quick activity</p>
              <input
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                placeholder="Ghi chú…"
                className="w-full h-9 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border }}
              />
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIVITIES.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleQuickActivity(a.type)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium border disabled:opacity-50"
                    style={{ borderColor: brand.border }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
            <Link
              to={bookingHref}
              className="block text-center rounded-xl px-4 py-3 text-sm font-semibold text-white"
              style={{ background: brand.primary }}
            >
              Tạo booking (UC-BK-01)
            </Link>
          </aside>
        </div>
      )}
    </AgentShell>
  );
}
