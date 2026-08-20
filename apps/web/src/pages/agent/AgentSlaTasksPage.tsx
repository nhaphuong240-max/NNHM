import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  escalateSlaLead,
  fetchSlaTasks,
  sendSlaReminder,
  type SlaTask,
  type SlaTasksData,
} from '../../lib/api';
import { brand } from '../../theme/tokens';
import { formatRelativeTime, SLA_HOURS, stageLabel, tierColor } from './agentLeadUi';

function TaskRow({
  task,
  onRemind,
  onEscalate,
  busyId,
}: {
  task: SlaTask;
  onRemind: (id: string, channel: 'ZALO' | 'CALL') => void;
  onEscalate: (id: string) => void;
  busyId: string | null;
}) {
  const attrs = task.attributes;
  const overdue = attrs.bucket === 'overdue';

  return (
    <tr className="border-t" style={{ borderColor: brand.border }}>
      <td className="p-3">
        <Link to={`/agent/leads/${task.id}`} className="font-semibold underline" style={{ color: brand.primary }}>
          {attrs.fullName}
        </Link>
        <p className="text-xs font-mono" style={{ color: brand.muted }}>
          {attrs.phone}
        </p>
      </td>
      <td className="p-3 text-xs">{stageLabel(attrs.status)}</td>
      <td className="p-3">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded text-white"
          style={{ background: tierColor(attrs.tier) }}
        >
          {attrs.tier} · {attrs.score}
        </span>
      </td>
      <td className="p-3 text-xs tabular-nums">
        {Math.round(attrs.idleHours)}h idle
        <br />
        <span style={{ color: brand.muted }}>{formatRelativeTime(attrs.lastActivityAt)}</span>
      </td>
      <td className="p-3">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded text-white"
          style={{ background: overdue ? brand.destructive : brand.warning }}
        >
          {overdue ? 'OVERDUE' : 'DUE SOON'}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busyId === task.id}
            onClick={() => onRemind(task.id, 'ZALO')}
            className="rounded px-2 py-1 text-xs border disabled:opacity-50"
            style={{ borderColor: brand.border }}
          >
            Nhắc Zalo
          </button>
          <button
            type="button"
            disabled={busyId === task.id}
            onClick={() => onRemind(task.id, 'CALL')}
            className="rounded px-2 py-1 text-xs border disabled:opacity-50"
            style={{ borderColor: brand.border }}
          >
            Gọi
          </button>
          {overdue && (
            <button
              type="button"
              disabled={busyId === task.id}
              onClick={() => onEscalate(task.id)}
              className="rounded px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: brand.destructive }}
            >
              Escalate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AgentSlaTasksPage() {
  const [data, setData] = useState<SlaTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSlaTasks();
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải SLA tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemind(leadId: string, channel: 'ZALO' | 'CALL') {
    setBusyId(leadId);
    setToast(null);
    try {
      await sendSlaReminder(leadId, { channel });
      setToast(`Đã ghi nhận reminder ${channel} · ${leadId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reminder thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleEscalate(leadId: string) {
    setBusyId(leadId);
    setToast(null);
    try {
      await escalateSlaLead(leadId, 'SLA 48h breached — escalate Agency Admin');
      setToast(`Đã escalate ${leadId} → Agency Admin`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Escalate thất bại');
    } finally {
      setBusyId(null);
    }
  }

  const summary = data?.summary;

  return (
    <AgentShell
      title="SLA follow-up"
      subtitle="UC-CRM-06 · SCR-AGENT-SLA · Reminder & escalation"
      screenTag="Agent · SLA task board"
    >
      <Link to="/agent" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Agent dashboard
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải SLA board…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {toast && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#ECFDF5', color: brand.success }}>
          {toast}
        </p>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            <p className="text-xs" style={{ color: brand.muted }}>
              SLA policy
            </p>
            <p className="text-2xl font-bold">{SLA_HOURS}h</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#FEE2E2', border: `1px solid ${brand.destructive}` }}>
            <p className="text-xs" style={{ color: brand.muted }}>
              Quá hạn
            </p>
            <p className="text-2xl font-bold" style={{ color: brand.destructive }}>
              {summary.overdueCount}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: `1px solid ${brand.warning}` }}>
            <p className="text-xs" style={{ color: brand.muted }}>
              Sắp quá hạn (≥36h)
            </p>
            <p className="text-2xl font-bold" style={{ color: brand.warning }}>
              {summary.dueSoonCount}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            <p className="text-xs" style={{ color: brand.muted }}>
              Lead tracked
            </p>
            <p className="text-2xl font-bold">{summary.trackedLeads}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold mb-3">Quá SLA ({SLA_HOURS}h) — NEW/CONTACTED</h2>
            <TaskTable
              tasks={data.overdue}
              empty="Không có lead quá hạn 🎉"
              onRemind={handleRemind}
              onEscalate={handleEscalate}
              busyId={busyId}
            />
          </section>

          <section>
            <h2 className="font-semibold mb-3">Sắp quá hạn (36–48h idle)</h2>
            <TaskTable
              tasks={data.dueSoon}
              empty="Không có lead sắp quá hạn"
              onRemind={handleRemind}
              onEscalate={handleEscalate}
              busyId={busyId}
            />
          </section>

          <section>
            <h2 className="font-semibold mb-3">SLA events gần đây</h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              {data.recentSlaEvents.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: brand.muted }}>
                  Chưa có reminder/escalation — thử bấm Nhắc Zalo trên lead overdue
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: brand.border }}>
                  {data.recentSlaEvents.map((ev) => (
                    <li key={ev.id} className="p-3 text-sm flex flex-wrap justify-between gap-2">
                      <span>
                        <strong>{String(ev.attributes.metadata?.slaAction ?? 'SLA')}</strong> · lead{' '}
                        <Link to={`/agent/leads/${ev.attributes.leadId}`} className="underline">
                          {ev.attributes.leadId}
                        </Link>
                      </span>
                      <span className="text-xs" style={{ color: brand.muted }}>
                        {ev.attributes.summary} · {formatRelativeTime(ev.attributes.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </AgentShell>
  );
}

function TaskTable({
  tasks,
  empty,
  onRemind,
  onEscalate,
  busyId,
}: {
  tasks: SlaTask[];
  empty: string;
  onRemind: (id: string, channel: 'ZALO' | 'CALL') => void;
  onEscalate: (id: string) => void;
  busyId: string | null;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden overflow-x-auto"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <table className="w-full text-sm min-w-[720px]">
        <thead style={{ background: brand.background }}>
          <tr>
            <th className="text-left p-3 font-medium">Lead</th>
            <th className="text-left p-3 font-medium">Stage</th>
            <th className="text-left p-3 font-medium">Score</th>
            <th className="text-left p-3 font-medium">Idle</th>
            <th className="text-left p-3 font-medium">Bucket</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-center" style={{ color: brand.muted }}>
                {empty}
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onRemind={onRemind}
                onEscalate={onEscalate}
                busyId={busyId}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
