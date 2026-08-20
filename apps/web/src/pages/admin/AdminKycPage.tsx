import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  approveKycProfile,
  fetchKycProfiles,
  fetchKycWorkflow,
  rejectKycProfile,
  requestKycResubmit,
  type KycProfileRecord,
  type KycWorkflowData,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function KycStatusBadge({ status }: { status: KycProfileRecord['attributes']['status'] }) {
  const color =
    status === 'APPROVED' ? brand.success : status === 'REJECTED' ? brand.destructive : brand.warning;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: color }}>
      {status}
    </span>
  );
}

function SubjectBadge({ type }: { type: KycProfileRecord['attributes']['subjectType'] }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">{type}</span>
  );
}

export function AdminKycPage() {
  const [profiles, setProfiles] = useState<KycProfileRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [workflowKey, setWorkflowKey] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<KycWorkflowData | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [resubmitReason, setResubmitReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchKycProfiles();
      setProfiles(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được KYC queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return profiles;
    return profiles.filter((p) => p.attributes.status === filter);
  }, [filter, profiles]);

  const counts = useMemo(
    () => ({
      ALL: profiles.length,
      PENDING: profiles.filter((p) => p.attributes.status === 'PENDING').length,
      APPROVED: profiles.filter((p) => p.attributes.status === 'APPROVED').length,
      REJECTED: profiles.filter((p) => p.attributes.status === 'REJECTED').length,
    }),
    [profiles],
  );

  async function handleApprove(profile: KycProfileRecord) {
    const key = `${profile.attributes.subjectType}:${profile.attributes.subjectId}`;
    setBusyKey(key);
    setError(null);
    try {
      await approveKycProfile(
        profile.attributes.subjectType,
        profile.attributes.subjectId,
        notes[key]?.trim() || 'Approved from SCR-ADMIN-014',
      );
      setToast(`Đã duyệt KYC ${profile.attributes.subjectId} — BR-23 pass`);
      if (workflowKey === key) await loadWorkflow(profile);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt KYC thất bại');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReject(profile: KycProfileRecord) {
    const key = `${profile.attributes.subjectType}:${profile.attributes.subjectId}`;
    setBusyKey(key);
    setError(null);
    try {
      await rejectKycProfile(
        profile.attributes.subjectType,
        profile.attributes.subjectId,
        notes[key]?.trim() || 'Rejected from SCR-ADMIN-014',
      );
      setToast(`Đã từ chối KYC ${profile.attributes.subjectId}`);
      if (workflowKey === key) await loadWorkflow(profile);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Từ chối KYC thất bại');
    } finally {
      setBusyKey(null);
    }
  }

  async function loadWorkflow(profile: KycProfileRecord) {
    const key = `${profile.attributes.subjectType}:${profile.attributes.subjectId}`;
    setWorkflowKey(key);
    setWorkflowLoading(true);
    setError(null);
    try {
      const res = await fetchKycWorkflow(profile.attributes.subjectType, profile.attributes.subjectId);
      setWorkflow(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải workflow KYC');
      setWorkflow(null);
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function handleResubmit(profile: KycProfileRecord) {
    const key = `${profile.attributes.subjectType}:${profile.attributes.subjectId}`;
    const reason = resubmitReason.trim() || 'Yêu cầu bổ sung hồ sơ từ SCR-ADMIN-014';
    setBusyKey(key);
    setError(null);
    try {
      await requestKycResubmit(profile.attributes.subjectType, profile.attributes.subjectId, reason);
      setToast(`Đã yêu cầu resubmit ${profile.attributes.subjectId}`);
      setResubmitReason('');
      await loadWorkflow(profile);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resubmit thất bại');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <AdminShell
      title="KYC / KYB queue"
      subtitle="UC-ID-05 · SCR-ADMIN-014 · BR-23 payout gate"
      screenTag="Admin / Identity"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: brand.muted }}>
          Agency & Developer phải APPROVED trước chi hoa hồng
        </p>
        <div className="flex gap-3 text-sm">
          <Link to="/finance/settlement" className="underline" style={{ color: brand.primary }}>
            Finance settlement
          </Link>
          <button type="button" className="underline" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: filter === s ? '#334155' : brand.surface,
              color: filter === s ? '#fff' : brand.muted,
              border: `1px solid ${filter === s ? '#334155' : brand.border}`,
            }}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {toast && (
        <p
          className="mb-4 text-sm rounded-lg p-3"
          style={{ background: '#ECFDF5', color: brand.success, border: `1px solid ${brand.success}` }}
        >
          {toast}
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải queue…</p>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-sm rounded-xl p-6 text-center" style={{ color: brand.muted, background: brand.surface }}>
              Không có hồ sơ {filter === 'ALL' ? '' : filter}
            </p>
          ) : (
            filtered.map((profile) => {
              const key = `${profile.attributes.subjectType}:${profile.attributes.subjectId}`;
              const pending = profile.attributes.status === 'PENDING';
              return (
                <article
                  key={profile.id}
                  className="rounded-xl p-4"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SubjectBadge type={profile.attributes.subjectType} />
                        <span className="font-mono font-semibold">{profile.attributes.subjectId}</span>
                        <KycStatusBadge status={profile.attributes.status} />
                      </div>
                      <p className="text-xs mt-2 font-mono" style={{ color: brand.muted }}>
                        {profile.id}
                        {profile.attributes.verifiedAt &&
                          ` · verified ${new Date(profile.attributes.verifiedAt).toLocaleString('vi-VN')}`}
                      </p>
                      {profile.attributes.notes && (
                        <p className="text-sm mt-2" style={{ color: brand.muted }}>
                          Ghi chú: {profile.attributes.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        type="button"
                        className="text-xs underline"
                        style={{ color: brand.primary }}
                        onClick={() => void loadWorkflow(profile)}
                      >
                        Workflow
                      </button>
                      {pending && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <input
                            value={notes[key] ?? ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Ghi chú duyệt/từ chối"
                            className="rounded-lg border px-3 py-1.5 text-sm"
                            style={{ borderColor: brand.border }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busyKey === key}
                              onClick={() => void handleApprove(profile)}
                              className="flex-1 rounded-lg py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                              style={{ background: brand.success }}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === key}
                              onClick={() => void handleReject(profile)}
                              className="flex-1 rounded-lg py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                              style={{ background: brand.destructive }}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {workflowKey === key && (
                    <div
                      className="mt-4 pt-4 border-t space-y-3"
                      style={{ borderColor: brand.border }}
                    >
                      {workflowLoading ? (
                        <p className="text-xs" style={{ color: brand.muted }}>
                          Đang tải workflow…
                        </p>
                      ) : workflow ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className="font-bold px-2 py-0.5 rounded"
                              style={{
                                background: workflow.payoutGate ? '#DCFCE7' : '#FEE2E2',
                                color: workflow.payoutGate ? brand.success : brand.destructive,
                              }}
                            >
                              Payout gate: {workflow.payoutGate ? 'OPEN' : 'BLOCKED'}
                            </span>
                          </div>
                          <ul className="space-y-1 text-sm">
                            {workflow.checklist.map((step) => (
                              <li key={step.id} className="flex items-center gap-2">
                                <span style={{ color: step.done ? brand.success : brand.muted }}>
                                  {step.done ? '✓' : '○'}
                                </span>
                                <span>{step.label}</span>
                                {step.required && (
                                  <span className="text-xs" style={{ color: brand.muted }}>
                                    (bắt buộc)
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {workflow.events.length > 0 && (
                            <ul className="text-xs space-y-1" style={{ color: brand.muted }}>
                              {workflow.events.slice(0, 6).map((ev) => (
                                <li key={ev.id}>
                                  {new Date(ev.createdAt).toLocaleString('vi-VN')} · {ev.label}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex flex-wrap gap-2 items-end">
                            <input
                              value={resubmitReason}
                              onChange={(e) => setResubmitReason(e.target.value)}
                              placeholder="Lý do yêu cầu bổ sung"
                              className="flex-1 min-w-[180px] rounded-lg border px-3 py-1.5 text-sm"
                              style={{ borderColor: brand.border }}
                            />
                            <button
                              type="button"
                              disabled={busyKey === key}
                              onClick={() => void handleResubmit(profile)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold border disabled:opacity-50"
                              style={{ borderColor: brand.border }}
                            >
                              Yêu cầu resubmit
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: brand.muted }}>
        Seed demo: <code className="font-mono">agcy_sunrise</code> trên{' '}
        <code className="font-mono">ten_agency_01</code> (AGENCY · PENDING) chặn payout trên Finance
        Settlement — duyệt tại đây hoặc từ SCR-FIN-006.
      </p>
    </AdminShell>
  );
}
