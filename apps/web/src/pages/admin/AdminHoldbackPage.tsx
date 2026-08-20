import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchCommissionDisputes,
  fetchCommissionSnapshot,
  fetchCommissionSnapshots,
  openCommissionHoldback,
  resolveCommissionHoldback,
  type CommissionSnapshotRecord,
  type DisputeRecord,
  type EntryRecord,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

function DisputeStatusBadge({ status }: { status: DisputeRecord['attributes']['status'] }) {
  const open = status === 'OPEN';
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded text-white"
      style={{ background: open ? brand.destructive : brand.success }}
    >
      {status}
    </span>
  );
}

export function AdminHoldbackPage() {
  const [openDisputes, setOpenDisputes] = useState<DisputeRecord[]>([]);
  const [snapshots, setSnapshots] = useState<CommissionSnapshotRecord[]>([]);
  const [heldEntries, setHeldEntries] = useState<EntryRecord[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [reason, setReason] = useState('');
  const [holdbackPercent, setHoldbackPercent] = useState('100');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [disputeRes, snapRes] = await Promise.all([
        fetchCommissionDisputes('OPEN'),
        fetchCommissionSnapshots(),
      ]);
      setOpenDisputes(disputeRes.data);
      setSnapshots(snapRes.data);

      const holdbackSnaps = snapRes.data.filter((s) => s.attributes.status === 'HOLDBACK');
      if (holdbackSnaps.length > 0) {
        const detail = await fetchCommissionSnapshot(holdbackSnaps[0].id);
        setHeldEntries(detail.entries.filter((e) => e.attributes.payoutStatus === 'HOLDBACK'));
      } else {
        setHeldEntries([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải holdback console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const holdbackCandidates = useMemo(
    () => snapshots.filter((s) => s.attributes.status === 'CALCULATED'),
    [snapshots],
  );

  async function handleOpenHoldback(e: FormEvent) {
    e.preventDefault();
    if (!selectedSnapshotId || !reason.trim()) {
      setError('Chọn snapshot và nhập lý do holdback.');
      return;
    }
    const pct = Number(holdbackPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError('holdbackPercent phải từ 1–100.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await openCommissionHoldback(selectedSnapshotId, {
        reason: reason.trim(),
        holdbackPercent: pct,
      });
      setMessage(`Đã mở holdback trên snapshot ${selectedSnapshotId}`);
      setReason('');
      setSelectedSnapshotId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mở holdback thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(dispute: DisputeRecord) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await resolveCommissionHoldback(dispute.attributes.snapshotId, dispute.id);
      setMessage(`Đã release holdback · dispute ${dispute.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Commission Holdback"
      subtitle="UC-COM-04 · SCR-ADMIN-007 · Ops giữ HH khi tranh chấp"
      screenTag="Admin / Commission"
    >
      <Link to="/admin" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Dashboard
      </Link>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
          <p className="text-xs uppercase" style={{ color: brand.muted }}>
            Dispute OPEN
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: brand.destructive }}>
            {openDisputes.length}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
          <p className="text-xs uppercase" style={{ color: brand.muted }}>
            Snapshot có thể holdback
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{holdbackCandidates.length}</p>
        </div>
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

      <div className="grid lg:grid-cols-2 gap-8">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold">Mở holdback mới</h2>
          <form onSubmit={handleOpenHoldback} className="space-y-4 text-sm">
            <label className="block">
              Snapshot (status CALCULATED)
              <select
                required
                value={selectedSnapshotId}
                onChange={(e) => setSelectedSnapshotId(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border"
                style={{ borderColor: brand.border }}
              >
                <option value="">— Chọn —</option>
                {holdbackCandidates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.attributes.bookingId} · {formatVnd(s.attributes.totalCommission)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Lý do *
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Split dispute, fraud review…"
                className="mt-1 w-full h-10 px-3 rounded-lg border"
                style={{ borderColor: brand.border }}
              />
            </label>
            <label className="block">
              Holdback %
              <input
                type="number"
                min={1}
                max={100}
                value={holdbackPercent}
                onChange={(e) => setHoldbackPercent(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border tabular-nums"
                style={{ borderColor: brand.border }}
              />
            </label>
            <button
              type="submit"
              disabled={busy || holdbackCandidates.length === 0}
              className="rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50"
              style={{ background: brand.destructive }}
            >
              {busy ? 'Đang xử lý…' : 'Giữ HH (holdback)'}
            </button>
          </form>
          <p className="text-xs" style={{ color: brand.muted }}>
            Demo: snapshot seed <code className="font-mono">cs_settle01</code> · booking{' '}
            <code className="font-mono">bk_settle01</code>
          </p>
        </section>

        <section
          className="rounded-xl p-5"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Dispute đang mở</h2>
            <Link to="/admin/audit" className="text-xs underline" style={{ color: brand.primary }}>
              Audit trail →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Đang tải…
            </p>
          ) : openDisputes.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>
              Không có dispute OPEN. Mở holdback từ form bên trái hoặc Developer commission page.
            </p>
          ) : (
            <div className="space-y-3">
              {openDisputes.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs">{d.id}</span>
                    <DisputeStatusBadge status={d.attributes.status} />
                  </div>
                  <p>
                    Snapshot <span className="font-mono">{d.attributes.snapshotId}</span>
                    {d.attributes.bookingId && (
                      <>
                        {' '}
                        · Booking <span className="font-mono">{d.attributes.bookingId}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1">{d.attributes.reason}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {d.attributes.holdbackPercent}% ·{' '}
                    {new Date(d.attributes.openedAt).toLocaleString('vi-VN')}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleResolve(d)}
                    className="mt-2 text-xs font-semibold underline disabled:opacity-50"
                    style={{ color: brand.success }}
                  >
                    Release (resolve)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section
        className="rounded-xl p-5 mt-8"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <h2 className="font-semibold mb-4">Dòng HH đang HELD</h2>
        {heldEntries.length === 0 ? (
          <p className="text-sm" style={{ color: brand.muted }}>
            Chưa có entry HOLDBACK. Sau khi mở holdback, lines chuyển payout_status HOLDBACK.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: brand.muted }}>
                <th className="pb-2">Entry</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Recipient</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {heldEntries.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: brand.border }}>
                  <td className="py-2 font-mono text-xs">{e.id}</td>
                  <td className="py-2">{e.attributes.role}</td>
                  <td className="py-2 font-mono text-xs">{e.attributes.recipientId}</td>
                  <td className="py-2 text-right tabular-nums">{formatVnd(e.attributes.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
