import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchBookingReplay, fetchBookings, type BookingReplayData } from '../../lib/api';
import { brand } from '../../theme/tokens';

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function AdminBookingReplayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('bookingId') ?? 'bk_settle01';

  const [bookingId, setBookingId] = useState(initialId);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [data, setData] = useState<BookingReplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchBookings({ limit: 8 }).then((res) => setRecentIds(res.data.map((b) => b.id)));
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBookingReplay(id.trim());
      setData(res.data);
      setBookingId(id.trim());
      setSearchParams({ bookingId: id.trim() });
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Replay thất bại');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (initialId) void load(initialId);
  }, [initialId, load]);

  return (
    <AdminShell
      title="Booking replay"
      subtitle="UC-BK-04 · SCR-ADMIN-006 · Dispute evidence reconstruction"
      screenTag="Admin / Ops"
    >
      <Link to="/admin/disputes" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Dispute Center
      </Link>

      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm flex-1 min-w-[220px]">
          Booking ID
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border font-mono text-sm"
            style={{ borderColor: brand.border }}
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(bookingId)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: brand.primary }}
        >
          Replay
        </button>
        <div className="w-full flex flex-wrap gap-2 text-xs">
          {recentIds.map((id) => (
            <button
              key={id}
              type="button"
              className="font-mono underline"
              style={{ color: brand.primary }}
              onClick={() => void load(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang reconstruct…</p>}
      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Trạng thái hiện tại
              </p>
              <p className="text-xl font-bold mt-1">{data.booking.attributes.status}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Domain events
              </p>
              <p className="text-xl font-bold mt-1 tabular-nums">{data.domainEvents.length}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Audit link
              </p>
              <Link to={data.evidence.auditQuery} className="text-sm underline mt-1 inline-block" style={{ color: brand.primary }}>
                Mở audit explorer
              </Link>
            </div>
          </div>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-3">Reconstructed states</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: brand.muted }}>
                  <th className="pb-2">Thời điểm</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.reconstructedStates.map((row) => (
                  <tr key={`${row.at}-${row.eventType}`} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="py-2 text-xs">{formatTs(row.at)}</td>
                    <td className="py-2 font-mono text-xs">{row.eventType}</td>
                    <td className="py-2 text-xs">{row.category}</td>
                    <td className="py-2 font-semibold">{row.inferredStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-3">Human timeline</h3>
            <ul className="space-y-2 text-sm">
              {data.timeline.map((entry) => (
                <li key={`${entry.timestamp}-${entry.event}`} className="border-l-2 pl-3" style={{ borderColor: brand.primary }}>
                  <p className="text-xs" style={{ color: brand.muted }}>
                    {formatTs(entry.timestamp)} · {entry.actor}
                  </p>
                  <p className="font-medium">{entry.description}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs mt-4" style={{ color: brand.muted }}>
              {data.evidence.exportHint}
            </p>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
