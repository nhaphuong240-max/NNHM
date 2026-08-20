import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  fetchTrustDisputes,
  mediateTrustDispute,
  openTrustDispute,
  resolveTrustDispute,
  type TrustDisputeRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function StatusBadge({ status }: { status: TrustDisputeRecord['attributes']['status'] }) {
  const colors = {
    OPEN: brand.destructive,
    IN_MEDIATION: brand.warning,
    RESOLVED: brand.success,
  };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: colors[status] }}>
      {status}
    </span>
  );
}

export function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<TrustDisputeRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | TrustDisputeRecord['attributes']['status']>('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [bookingId, setBookingId] = useState('bk_settle01');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTrustDisputes(filter === 'ALL' ? undefined : filter);
      setDisputes(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải disputes');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOpen(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy('open');
    setError(null);
    try {
      await openTrustDispute({
        bookingId: bookingId.trim() || undefined,
        type: 'PAYMENT',
        reason: reason.trim(),
      });
      setReason('');
      setMessage('Đã mở dispute mới.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mở dispute thất bại');
    } finally {
      setBusy(null);
    }
  }

  async function handleMediate(id: string) {
    setBusy(id);
    try {
      await mediateTrustDispute(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mediate thất bại');
    } finally {
      setBusy(null);
    }
  }

  async function handleResolve(id: string) {
    if (!resolution.trim()) {
      setError('Nhập resolution note trước khi resolve.');
      return;
    }
    setBusy(id);
    try {
      await resolveTrustDispute(id, resolution.trim());
      setResolution('');
      setMessage(`Đã resolve ${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolve thất bại');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Dispute Center"
      subtitle="UC-TR-03 · SCR-ADMIN-008 · Mediate · attach evidence"
      screenTag="Admin / Trust"
    >
      <Link to="/admin" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Dashboard
      </Link>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['ALL', 'OPEN', 'IN_MEDIATION', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className="rounded-full px-3 py-1 text-xs border"
            style={{
              borderColor: filter === s ? brand.primary : brand.border,
              background: filter === s ? '#EFF6FF' : brand.surface,
              color: filter === s ? brand.primary : brand.muted,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}

      <form
        onSubmit={handleOpen}
        className="rounded-xl p-4 mb-6 grid md:grid-cols-3 gap-3"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm">
          Booking ID
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border font-mono text-xs"
            style={{ borderColor: brand.border }}
          />
        </label>
        <label className="text-sm md:col-span-2">
          Lý do mở dispute *
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <button
          type="submit"
          disabled={busy === 'open'}
          className="md:col-span-3 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: brand.primary }}
        >
          Mở dispute
        </button>
      </form>

      {loading ? (
        <p style={{ color: brand.muted }}>Đang tải…</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <article
              key={d.id}
              className="rounded-xl p-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm">{d.id}</p>
                  <p className="text-sm mt-1">{d.attributes.reason}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {d.attributes.type}
                    {d.attributes.bookingId ? ` · booking ${d.attributes.bookingId}` : ''}
                  </p>
                </div>
                <StatusBadge status={d.attributes.status} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {d.attributes.bookingId && (
                  <Link
                    to={`/admin/bookings/replay?bookingId=${encodeURIComponent(d.attributes.bookingId)}`}
                    className="text-xs underline"
                    style={{ color: brand.primary }}
                  >
                    Replay evidence →
                  </Link>
                )}
                {d.attributes.status === 'OPEN' && (
                  <button
                    type="button"
                    disabled={busy === d.id}
                    className="text-xs rounded border px-2 py-1"
                    style={{ borderColor: brand.border }}
                    onClick={() => void handleMediate(d.id)}
                  >
                    Bắt đầu mediation
                  </button>
                )}
                {d.attributes.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    disabled={busy === d.id}
                    className="text-xs rounded border px-2 py-1"
                    style={{ borderColor: brand.success, color: brand.success }}
                    onClick={() => void handleResolve(d.id)}
                  >
                    Resolve
                  </button>
                )}
              </div>
              {d.attributes.resolutionNote && (
                <p className="text-xs mt-2" style={{ color: brand.success }}>
                  Resolution: {d.attributes.resolutionNote}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <label className="block mt-6 text-sm max-w-xl">
        Resolution note (dùng khi bấm Resolve trên case)
        <input
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="mt-1 w-full h-9 px-3 rounded-lg border text-sm"
          style={{ borderColor: brand.border }}
          placeholder="Buyer refunded · case closed"
        />
      </label>
    </AdminShell>
  );
}
