import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  cancelBookingWithRefund,
  fetchBooking,
  fetchBookingEvents,
  fetchBookingTimeline,
  type BookingDetail,
  type BookingDomainEvent,
  type BookingTimelineEntry,
  type TimelineFilter,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const FILTERS: { id: TimelineFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'state', label: 'Trạng thái' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'system', label: 'Hệ thống' },
];

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function statusColor(status: string) {
  switch (status) {
    case 'DEPOSITED':
      return brand.success;
    case 'RESERVED':
      return brand.warning;
    case 'CANCELLED':
    case 'EXPIRED':
    case 'REFUNDED':
      return brand.muted;
    default:
      return brand.primary;
  }
}

export function AgentBookingTimelinePage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [view, setView] = useState<'timeline' | 'events'>('timeline');
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [timeline, setTimeline] = useState<BookingTimelineEntry[]>([]);
  const [events, setEvents] = useState<BookingDomainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [initiateRefund, setInitiateRefund] = useState(true);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const canCancel = booking?.meta.allowedTransitions.includes('CANCEL') ?? false;

  async function reloadTimeline() {
    const [detail, tl, ev] = await Promise.all([
      fetchBooking(bookingId),
      fetchBookingTimeline(bookingId, filter),
      fetchBookingEvents(bookingId, filter),
    ]);
    setBooking(detail);
    setTimeline(tl.data);
    setEvents(ev.data);
  }

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchBooking(bookingId),
      fetchBookingTimeline(bookingId, filter),
      fetchBookingEvents(bookingId, filter),
    ])
      .then(([detail, tl, ev]) => {
        if (!active) return;
        setBooking(detail);
        setTimeline(tl.data);
        setEvents(ev.data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được timeline');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, filter]);

  return (
    <AgentShell
      title={`Booking ${bookingId}`}
      subtitle="Domain event timeline — dispute evidence (OP-WIN-03)"
      screenTag="UC-BK-03 · SCR-AGENT-003 · S3-03"
    >
      <div className="space-y-6">
        {loading && (
          <p className="text-sm" style={{ color: brand.muted }}>
            Đang tải timeline…
          </p>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">
            {error}
            <p className="mt-2 text-xs">
              Tạo booking trước:{' '}
              <code className="bg-red-100 px-1 rounded">POST /bookings</code> hoặc chạy{' '}
              <code className="bg-red-100 px-1 rounded">./scripts/uat-pilot.sh</code>
            </p>
          </div>
        )}

        {booking && (
          <div
            className="rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: brand.muted }}>
                Trạng thái hiện tại
              </p>
              <p className="text-lg font-bold" style={{ color: statusColor(booking.data.attributes.status) }}>
                {booking.data.attributes.status}
              </p>
              <p className="text-sm mt-1" style={{ color: brand.muted }}>
                Unit {booking.data.attributes.unitId}
                {booking.data.attributes.leadId ? ` · Lead ${booking.data.attributes.leadId}` : ''}
              </p>
            </div>
            <div className="text-sm" style={{ color: brand.muted }}>
              <p>Hết hạn: {formatTs(booking.data.attributes.expiresAt)}</p>
              <p>Allowed: {booking.meta.allowedTransitions.join(', ') || '—'}</p>
              {booking.data.attributes.leadId && (
                <Link
                  to={`/agent/leads/${encodeURIComponent(booking.data.attributes.leadId)}`}
                  className="underline mt-1 inline-block"
                  style={{ color: brand.primary }}
                >
                  Lead detail →
                </Link>
              )}
            </div>
          </div>
        )}

        {canCancel && (
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#FEF2F2', border: `1px solid ${brand.destructive}` }}
          >
            <h3 className="font-semibold text-sm" style={{ color: brand.destructive }}>
              Hủy booking (UC-BK-04 / UC-PAY-03)
            </h3>
            <Link
              to={`/agent/bookings/cancel?bookingId=${encodeURIComponent(bookingId ?? '')}`}
              className="text-sm underline"
              style={{ color: brand.primary }}
            >
              Mở trang hủy đầy đủ (SCR-AGENT-004) →
            </Link>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Lý do hủy (tùy chọn)…"
              className="w-full h-9 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border, background: brand.surface }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={initiateRefund}
                onChange={(e) => setInitiateRefund(e.target.checked)}
              />
              Khởi tạo hoàn tiền nếu đã cọc
            </label>
            {cancelMessage && (
              <p className="text-sm" style={{ color: brand.success }}>
                {cancelMessage}
              </p>
            )}
            <button
              type="button"
              disabled={cancelBusy}
              onClick={() => {
                setCancelBusy(true);
                setError(null);
                void cancelBookingWithRefund(bookingId, {
                  reason: cancelReason.trim() || undefined,
                  initiateRefund,
                })
                  .then((result) => {
                    if (result.refund) {
                      setCancelMessage(
                        `Đã hủy · refund ${result.refund.id} (${result.refund.attributes.status})`,
                      );
                    } else {
                      setCancelMessage(`Đã hủy · ${result.data.attributes.status}`);
                    }
                    return reloadTimeline();
                  })
                  .catch((e) => {
                    setError(e instanceof Error ? e.message : 'Hủy booking thất bại');
                  })
                  .finally(() => setCancelBusy(false));
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.destructive }}
            >
              {cancelBusy ? 'Đang hủy…' : 'Xác nhận hủy booking'}
            </button>
          </section>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className="rounded-full px-3 py-1.5 text-sm font-medium"
              style={{
                background: filter === f.id ? brand.primary : brand.surface,
                color: filter === f.id ? '#fff' : brand.primaryDark,
                border: `1px solid ${brand.border}`,
              }}
            >
              {f.label}
            </button>
          ))}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setView('timeline')}
            className="text-sm underline"
            style={{ color: view === 'timeline' ? brand.primary : brand.muted }}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setView('events')}
            className="text-sm underline"
            style={{ color: view === 'events' ? brand.primary : brand.muted }}
          >
            Raw events
          </button>
          <Link
            to="/finance/reconciliation"
            className="text-sm underline"
            style={{ color: brand.muted }}
          >
            Ledger reconcile →
          </Link>
        </div>

        {view === 'timeline' ? (
          <ol className="relative border-s-2 space-y-6 ps-6" style={{ borderColor: brand.border }}>
            {timeline.map((entry, idx) => (
              <li key={`${entry.timestamp}-${entry.event}-${idx}`} className="relative">
                <span
                  className="absolute -start-[1.6rem] top-1 h-3 w-3 rounded-full ring-4 ring-white"
                  style={{ background: brand.primary }}
                />
                <div
                  className="rounded-xl p-4"
                  style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs" style={{ color: brand.muted }}>
                    <span>{formatTs(entry.timestamp)}</span>
                    <span className="uppercase tracking-wide">{entry.category}</span>
                  </div>
                  <p className="font-semibold mt-1">{entry.event}</p>
                  <p className="text-sm mt-1">{entry.description}</p>
                  <p className="text-xs mt-2" style={{ color: brand.muted }}>
                    Actor: {entry.actor}
                    {entry.payloadSummary ? ` · ${entry.payloadSummary}` : ''}
                    {entry.correlationId ? ` · corr ${entry.correlationId}` : ''}
                  </p>
                </div>
              </li>
            ))}
            {!loading && timeline.length === 0 && (
              <li className="text-sm" style={{ color: brand.muted }}>
                Chưa có sự kiện — tạo booking hoặc thanh toán để populate timeline.
              </li>
            )}
          </ol>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${brand.border}` }}
          >
            <table className="w-full text-sm">
              <thead style={{ background: brand.surface }}>
                <tr>
                  <th className="text-left p-3">occurredAt</th>
                  <th className="text-left p-3">type</th>
                  <th className="text-left p-3">category</th>
                  <th className="text-left p-3">payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.eventId} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3 align-top whitespace-nowrap">{formatTs(ev.occurredAt)}</td>
                    <td className="p-3 align-top font-mono text-xs">{ev.type}</td>
                    <td className="p-3 align-top">{ev.category}</td>
                    <td className="p-3 align-top">
                      <pre className="text-xs overflow-x-auto max-w-md">
                        {JSON.stringify(ev.payload, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && events.length === 0 && (
              <p className="p-4 text-sm" style={{ color: brand.muted }}>
                Không có domain events.
              </p>
            )}
          </div>
        )}

        <p className="text-xs" style={{ color: brand.muted }}>
          OP-WIN-03: export audit CSV tại{' '}
          <code>GET /audit/events/export.csv?entityType=booking&amp;entityId={bookingId}</code>
        </p>
      </div>
    </AgentShell>
  );
}
