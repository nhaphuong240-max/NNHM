import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FinanceShell } from '../../components/FinanceShell';
import {
  approveCommissionLines,
  fetchCommissionLines,
  fetchCommissionSnapshot,
  type SettlementLineRecord,
} from '../../lib/api';
import { brand, finance, formatVnd } from '../../theme/tokens';

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
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold" style={tone}>
      {status}
    </span>
  );
}

export function FinanceCommissionSplitPage() {
  const [lines, setLines] = useState<SettlementLineRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [drawerLine, setDrawerLine] = useState<SettlementLineRecord | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState({ kycBlockedCount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCommissionLines(statusFilter || undefined);
      setLines(res.data);
      setMeta({
        kycBlockedCount: res.meta.kycBlockedCount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải split queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingEligible = useMemo(
    () =>
      lines.filter((l) => l.attributes.payoutStatus === 'PENDING' && l.attributes.payoutEligible === true),
    [lines],
  );

  const selectedEligible = useMemo(
    () =>
      [...selected].filter((id) => {
        const line = lines.find((l) => l.id === id);
        return line?.attributes.payoutStatus === 'PENDING' && line.attributes.payoutEligible === true;
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

  async function openDrawer(line: SettlementLineRecord) {
    setDrawerLine(line);
    setSnapshotHash(null);
    try {
      const snap = await fetchCommissionSnapshot(line.attributes.snapshotId ?? '');
      setSnapshotHash(snap.data.attributes.policyHash);
    } catch {
      setSnapshotHash('—');
    }
  }

  async function handleApprove() {
    if (selectedEligible.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await approveCommissionLines(selectedEligible);
      setMessage(`Đã duyệt ${res.meta.approvedCount} dòng HH → queue settlement`);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FinanceShell
      title="Commission split review"
      subtitle="UC-COM-03 · SCR-FIN-002 · Duyệt phân bổ trước settlement"
      screenTag="Finance / Commission"
    >
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <Link to="/finance/commission/export" className="underline" style={{ color: finance.accentDark }}>
          Export CSV
        </Link>
        <Link to="/finance/settlement" className="underline" style={{ color: finance.accentDark }}>
          Settlement batch
        </Link>
        <Link to="/admin/commission/holdback" className="underline" style={{ color: brand.destructive }}>
          Holdback console →
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
          <p className="text-xs uppercase" style={{ color: brand.muted }}>
            Dòng hiển thị
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{lines.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
          <p className="text-xs uppercase" style={{ color: brand.muted }}>
            Chờ duyệt (eligible)
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: finance.accentDark }}>
            {pendingEligible.length}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#FEE2E2', border: `1px solid ${brand.destructive}` }}>
          <p className="text-xs uppercase" style={{ color: brand.muted }}>
            KYC chặn (BR-23)
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: brand.destructive }}>
            {meta.kycBlockedCount}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm flex items-center gap-2">
          <span style={{ color: brand.muted }}>Trạng thái</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="HOLDBACK">HOLDBACK</option>
            <option value="PAID">PAID</option>
            <option value="">Tất cả</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy || selectedEligible.length === 0}
          onClick={() => void handleApprove()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: brand.primary }}
        >
          Duyệt batch ({selectedEligible.length})
        </button>
        <button type="button" onClick={() => void load()} className="text-sm underline" style={{ color: brand.primary }}>
          Làm mới
        </button>
      </div>

      {message && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Đang tải split queue…
        </p>
      ) : lines.length === 0 ? (
        <p className="text-sm" style={{ color: brand.muted }}>
          Chưa có commission line. Close deal trên booking DEPOSITED trước (cs_settle01 seed).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: brand.border }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ background: brand.surface, color: brand.muted }}>
                <th className="p-3 w-8" />
                <th className="p-3">Entry</th>
                <th className="p-3">Booking</th>
                <th className="p-3">Role</th>
                <th className="p-3">Recipient</th>
                <th className="p-3 text-right">Split</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const a = line.attributes;
                const canSelect = a.payoutStatus === 'PENDING' && a.payoutEligible === true;
                return (
                  <tr key={line.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={selected.has(line.id)}
                          onChange={() => toggleLine(line)}
                        />
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-xs">{line.id}</td>
                    <td className="p-3 font-mono text-xs">{a.bookingId ?? '—'}</td>
                    <td className="p-3">{a.role}</td>
                    <td className="p-3 font-mono text-xs">{a.recipientId}</td>
                    <td className="p-3 text-right tabular-nums">{a.splitPercent}%</td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatVnd(a.amount)}</td>
                    <td className="p-3">
                      <PayoutBadge status={a.payoutStatus} />
                      {a.payoutStatus === 'HOLDBACK' && (
                        <Link
                          to="/admin/commission/holdback"
                          className="block text-xs underline mt-1"
                          style={{ color: brand.destructive }}
                        >
                          Holdback
                        </Link>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="text-xs underline"
                        style={{ color: brand.primary }}
                        onClick={() => void openDrawer(line)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {drawerLine && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(15,23,42,0.4)' }}
          onClick={() => setDrawerLine(null)}
        >
          <div
            className="w-full max-w-md h-full overflow-y-auto p-6"
            style={{ background: brand.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4">Line breakdown</h3>
            <dl className="text-sm space-y-2">
              {[
                ['Entry', drawerLine.id],
                ['Snapshot', drawerLine.attributes.snapshotId ?? '—'],
                ['Booking', drawerLine.attributes.bookingId ?? '—'],
                ['Policy hash', snapshotHash ?? '…'],
                ['Role', drawerLine.attributes.role],
                ['Recipient', drawerLine.attributes.recipientId],
                ['Split', `${drawerLine.attributes.splitPercent}%`],
                ['Amount', formatVnd(drawerLine.attributes.amount)],
                ['Payout', drawerLine.attributes.payoutStatus],
                ['KYC eligible', drawerLine.attributes.payoutEligible ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: brand.border }}>
                  <dt style={{ color: brand.muted }}>{label}</dt>
                  <dd className="font-mono text-xs text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="mt-6 text-sm underline"
              style={{ color: brand.primary }}
              onClick={() => setDrawerLine(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </FinanceShell>
  );
}
