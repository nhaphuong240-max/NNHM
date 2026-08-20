import { useCallback, useEffect, useMemo, useState } from 'react';
import { FinanceShell } from '../../components/FinanceShell';
import {
  approveCommissionLines,
  approveKycProfile,
  createSettlementRun,
  downloadCommissionExport,
  fetchCommissionLines,
  fetchSettlementRuns,
  fetchSettlementSchedule,
  reconcilePayoutBatch,
  runSettlementSchedule,
  updateSettlementSchedule,
  type SettlementLineRecord,
  type SettlementRunRecord,
  type SettlementScheduleConfig,
} from '../../lib/api';
import { brand, finance, formatVnd } from '../../theme/tokens';

function KycBadge({ status, eligible }: { status?: string; eligible?: boolean }) {
  if (eligible) {
    return (
      <span
        className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold"
        style={{ background: '#DCFCE7', color: brand.success }}
      >
        KYC ✓
      </span>
    );
  }
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ background: '#FEE2E2', color: brand.destructive }}
    >
      KYC {status ?? 'PENDING'}
    </span>
  );
}

function PayoutBadge({ status }: { status: string }) {
  const tone =
    status === 'PAID'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'APPROVED'
        ? { bg: '#EFF6FF', color: brand.primary }
        : status === 'HOLDBACK'
          ? { bg: '#FEE2E2', color: brand.destructive }
          : { bg: '#FFEDD5', color: brand.warning };

  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold"
      style={tone}
    >
      {status}
    </span>
  );
}

function RunStatusBadge({ status }: { status: SettlementRunRecord['attributes']['status'] }) {
  const tone =
    status === 'COMPLETED'
      ? { bg: '#DCFCE7', color: brand.success }
      : status === 'SUBMITTED'
        ? { bg: '#EFF6FF', color: brand.primary }
      : status === 'FAILED'
        ? { bg: '#FEE2E2', color: brand.destructive }
        : { bg: '#FFEDD5', color: brand.warning };

  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold" style={tone}>
      {status}
    </span>
  );
}

function PayoutRailBadge({
  payout,
}: {
  payout?: SettlementRunRecord['attributes']['payout'];
}) {
  if (!payout) return null;
  const tone =
    payout.status === 'SUBMITTED'
      ? { bg: '#EFF6FF', color: brand.primary }
      : payout.status === 'SKIPPED'
        ? { bg: '#F1F5F9', color: brand.muted }
        : { bg: '#FEE2E2', color: brand.destructive };

  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold" style={tone}>
      Payout {payout.status}
    </span>
  );
}

export function FinanceSettlementPage() {
  const [lines, setLines] = useState<SettlementLineRecord[]>([]);
  const [runs, setRuns] = useState<SettlementRunRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [runLabel, setRunLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reconcileRunId, setReconcileRunId] = useState('');
  const [reconcileBatchId, setReconcileBatchId] = useState('');
  const [reconcileAmount, setReconcileAmount] = useState('');
  const [lineMeta, setLineMeta] = useState({
    kycBlockedCount: 0,
    settlementReadyCount: 0,
  });
  const [schedule, setSchedule] = useState<SettlementScheduleConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lineRes, runRes, scheduleRes] = await Promise.all([
        fetchCommissionLines(),
        fetchSettlementRuns(),
        fetchSettlementSchedule(),
      ]);
      setLines(lineRes.data);
      setLineMeta({
        kycBlockedCount: lineRes.meta.kycBlockedCount,
        settlementReadyCount: lineRes.meta.settlementReadyCount,
      });
      setRuns(runRes.data);
      setSchedule(scheduleRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được settlement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingLines = useMemo(
    () => lines.filter((l) => l.attributes.payoutStatus === 'PENDING'),
    [lines],
  );
  const approvedLines = useMemo(
    () => lines.filter((l) => l.attributes.payoutStatus === 'APPROVED'),
    [lines],
  );
  const settlementReadyLines = useMemo(
    () => approvedLines.filter((l) => l.attributes.payoutEligible),
    [approvedLines],
  );
  const selectedPendingEligible = useMemo(
    () =>
      [...selected].filter((id) => {
        const line = lines.find((l) => l.id === id);
        return (
          line?.attributes.payoutStatus === 'PENDING' && line.attributes.payoutEligible === true
        );
      }),
    [selected, lines],
  );

  function toggleLine(line: SettlementLineRecord) {
    if (line.attributes.payoutStatus !== 'PENDING' || !line.attributes.payoutEligible) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(line.id)) next.delete(line.id);
      else next.add(line.id);
      return next;
    });
  }

  async function handleApproveKyc(subjectType: 'USER' | 'AGENCY', subjectId: string) {
    setBusy(true);
    setError(null);
    try {
      await approveKycProfile(subjectType, subjectId, 'Approved from SCR-FIN-006');
      setMessage(`KYC ${subjectId} đã APPROVED — có thể duyệt chi HH`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt KYC thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (selectedPendingEligible.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await approveCommissionLines(selectedPendingEligible);
      setMessage(`Đã duyệt ${res.meta.approvedCount} dòng HH`);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunSettlement() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await createSettlementRun({
        label: runLabel.trim() || undefined,
        periodFrom: periodFrom || undefined,
        periodTo: periodTo || undefined,
      });
      setMessage(
        `Settlement ${res.data.id} — ${res.meta.entryCount} dòng · ${formatVnd(res.data.attributes.totalAmount)}${
          res.data.attributes.status === 'SUBMITTED' ? ' · chờ bank webhook' : ''
        }`,
      );
      setRunLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chạy settlement thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleReconcilePayout() {
    if (!reconcileRunId.trim() || !reconcileBatchId.trim() || !reconcileAmount.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await reconcilePayoutBatch(reconcileRunId.trim(), {
        batchId: reconcileBatchId.trim(),
        bankAmount: Number(reconcileAmount.replace(/\D/g, '')),
      });
      setMessage(
        `G-OPS-2 reconcile ${res.data.status}: batch ${res.data.batchMatched ? '✓' : '✗'} · amount ${res.data.amountMatched ? '✓' : '✗'} (Δ ${formatVnd(res.data.delta)})`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đối chiếu batch thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadCommissionExport(periodFrom || undefined, periodTo || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'commission-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Đã tải commission-export.csv (UC-COM-05)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSchedule() {
    if (!schedule) return;
    setBusy(true);
    setError(null);
    try {
      const res = await updateSettlementSchedule({ enabled: !schedule.enabled });
      setSchedule(res.data);
      setMessage(`Scheduler ${res.data.enabled ? 'bật' : 'tắt'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật schedule thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunScheduledBatch() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await runSettlementSchedule();
      if (res.data.skipped) {
        setMessage(`Scheduler skip: ${res.data.reason ?? 'unknown'} (${res.data.readyCount ?? 0} ready)`);
      } else if (res.data.run) {
        setMessage(
          `Scheduled batch ${res.data.run.id} — ${res.data.entryCount ?? 0} dòng · ${formatVnd(res.data.run.attributes.totalAmount)}`,
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chạy scheduled batch thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FinanceShell
      title="Settlement batch"
      subtitle="UC-PAY-04 · BR-23 KYC gate · G2.1 Commission E2E"
      screenTag="Finance / SCR-FIN-006"
    >
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Chờ duyệt
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: finance.accentDark }}>
            {pendingLines.length}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Đã duyệt (queue)
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: brand.primary }}>
            {approvedLines.length}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            KYC chặn (BR-23)
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: brand.destructive }}>
            {lineMeta.kycBlockedCount}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: finance.accentSoft, border: `1px solid ${finance.accent}` }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Sẵn sàng settlement
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: finance.accentDark }}>
            {lineMeta.settlementReadyCount}
          </p>
        </div>
        <div
          className="rounded-xl p-4 lg:col-span-2"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
            Settlement runs
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: brand.primary }}>
            {runs.length}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm space-y-1">
          <span style={{ color: brand.muted }}>Từ ngày</span>
          <input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className="block h-9 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <label className="text-sm space-y-1">
          <span style={{ color: brand.muted }}>Đến ngày</span>
          <input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            className="block h-9 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <label className="text-sm space-y-1 flex-1 min-w-[180px]">
          <span style={{ color: brand.muted }}>Nhãn batch</span>
          <input
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            placeholder="July 2026 close…"
            className="block w-full h-9 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <button
          type="button"
          disabled={busy || settlementReadyLines.length === 0}
          onClick={() => void handleRunSettlement()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: finance.accentDark }}
        >
          Chạy settlement ({settlementReadyLines.length})
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="rounded-lg px-4 py-2 text-sm font-medium border disabled:opacity-50"
          style={{ borderColor: brand.border }}
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm underline"
          style={{ color: brand.primary }}
        >
          Làm mới
        </button>
      </div>

      {schedule && (
        <div
          className="rounded-xl p-4 mb-6 space-y-3"
          style={{ background: finance.accentSoft, border: `1px solid ${finance.accent}` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-sm">Settlement scheduler (cron)</h2>
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                {schedule.cronLabel} · {schedule.timezone} · min {schedule.minReadyLines} lines
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleToggleSchedule()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: brand.border, background: brand.surface }}
              >
                {schedule.enabled ? 'Tắt scheduler' : 'Bật scheduler'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRunScheduledBatch()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: finance.accentDark }}
              >
                Chạy scheduled batch
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: brand.muted }}>
            <span>Ready queue: {schedule.readyCount}</span>
            {schedule.lastRunAt && (
              <span>
                Last run: {new Date(schedule.lastRunAt).toLocaleString('vi-VN')} ·{' '}
                {schedule.lastRunStatus ?? '—'}
              </span>
            )}
            {schedule.lastRunId && <span className="font-mono">run {schedule.lastRunId}</span>}
            {schedule.lastError && (
              <span style={{ color: brand.destructive }}>Error: {schedule.lastError}</span>
            )}
          </div>
        </div>
      )}

      {message && (
        <p
          className="mb-4 text-sm rounded-lg p-3"
          style={{ background: '#DCFCE7', color: brand.success }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          className="mb-4 text-sm rounded-lg p-3"
          style={{ background: '#FEE2E2', color: brand.destructive }}
        >
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Payable lines (UC-COM-03)</h2>
            <button
              type="button"
              disabled={busy || selectedPendingEligible.length === 0}
              onClick={() => void handleApprove()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              Duyệt ({selectedPendingEligible.length})
            </button>
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Đang tải…
            </p>
          ) : lines.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Chưa có commission line. Chạy close deal trước.
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => {
                const a = line.attributes;
                const canSelect = a.payoutStatus === 'PENDING' && a.payoutEligible === true;
                const kycSubjectType = a.recipientType === 'AGENCY' ? 'AGENCY' : 'USER';
                return (
                  <div
                    key={line.id}
                    className="rounded-lg p-3 flex gap-3 items-start"
                    style={{
                      background: brand.background,
                      border: `1px solid ${a.payoutEligible === false ? brand.destructive : brand.border}`,
                    }}
                  >
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={selected.has(line.id)}
                        onChange={() => toggleLine(line)}
                        className="mt-1"
                      />
                    ) : (
                      <span className="w-4" title={a.payoutEligible === false ? 'BR-23 KYC' : ''} />
                    )}
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{line.id}</span>
                        <PayoutBadge status={a.payoutStatus} />
                        <KycBadge status={a.kycStatus} eligible={a.payoutEligible} />
                      </div>
                      <p className="mt-1">
                        {a.bookingId ?? '—'} · {a.role} · {a.recipientId}
                      </p>
                      <p className="font-bold tabular-nums mt-1">{formatVnd(a.amount)}</p>
                      {a.payoutEligible === false && a.payoutStatus === 'PENDING' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleApproveKyc(kycSubjectType, a.recipientId)}
                          className="mt-2 text-xs underline disabled:opacity-50"
                          style={{ color: brand.primary }}
                        >
                          Duyệt KYC {a.recipientId}
                        </button>
                      )}
                      {a.settlementRunId && (
                        <p className="text-xs mt-1 font-mono" style={{ color: brand.muted }}>
                          run {a.settlementRunId}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-3">Settlement history (UC-PAY-04)</h2>

          <div
            className="rounded-lg p-3 mb-4 text-sm space-y-2"
            style={{ background: finance.accentSoft, border: `1px solid ${finance.accent}` }}
          >
            <p className="font-medium text-xs">OPS-S5-05 · Đối chiếu batch vs sao kê (G-OPS-2)</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                className="rounded border px-2 py-1 text-xs font-mono"
                style={{ borderColor: brand.border }}
                placeholder="run id"
                value={reconcileRunId}
                onChange={(e) => setReconcileRunId(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1 text-xs font-mono"
                style={{ borderColor: brand.border }}
                placeholder="pay_sr_…"
                value={reconcileBatchId}
                onChange={(e) => setReconcileBatchId(e.target.value)}
              />
              <input
                className="rounded border px-2 py-1 text-xs tabular-nums"
                style={{ borderColor: brand.border }}
                placeholder="Số tiền sao kê"
                value={reconcileAmount}
                onChange={(e) => setReconcileAmount(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReconcilePayout()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: finance.accentDark }}
            >
              Đối chiếu batch
            </button>
          </div>

          {runs.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Chưa có batch nào.
            </p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{run.id}</span>
                    <RunStatusBadge status={run.attributes.status} />
                    <PayoutRailBadge payout={run.attributes.payout} />
                  </div>
                  <p className="font-medium mt-1">{run.attributes.label ?? '—'}</p>
                  <p className="tabular-nums mt-1">
                    {run.attributes.entryCount} dòng · {formatVnd(run.attributes.totalAmount)}
                  </p>
                  {run.attributes.payout?.batchId && (
                    <p className="text-xs mt-1 font-mono" style={{ color: brand.muted }}>
                      batch {run.attributes.payout.batchId}
                      {run.attributes.payout.provider ? ` · ${run.attributes.payout.provider}` : ''}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {run.attributes.periodFrom ?? '—'} → {run.attributes.periodTo ?? '—'}
                  </p>
                  {run.attributes.completedAt && (
                    <p className="text-xs mt-1" style={{ color: brand.muted }}>
                      Hoàn tất {new Date(run.attributes.completedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="text-xs mt-8" style={{ color: brand.muted }}>
        G2.1 E2E: policy → snapshot → KYC (BR-23) → duyệt lines → settlement → export CSV
      </p>
    </FinanceShell>
  );
}
