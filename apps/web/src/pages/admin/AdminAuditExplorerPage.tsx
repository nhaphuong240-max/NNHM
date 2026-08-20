import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import {
  downloadAuditExport,
  fetchAuditEvents,
  type AuditEventRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const ENTITY_TYPES = ['', 'unit', 'listing', 'booking', 'payment_intent', 'lead', 'commission'] as const;

const DATE_PRESETS = [
  { id: '7', label: '7 ngày', days: 7 },
  { id: '30', label: '30 ngày', days: 30 },
  { id: 'all', label: 'Tất cả', days: 0 },
] as const;

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function isoDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function actionColor(action: string) {
  if (action.includes('REJECT') || action === 'DELETE') return brand.destructive;
  if (action.includes('APPROVE') || action === 'CREATE') return brand.success;
  if (action === 'PATCH' || action === 'SUBMIT_REVIEW') return brand.warning;
  return brand.primary;
}

function maskPii(value: unknown, enabled: boolean): unknown {
  if (!enabled) return value;
  if (typeof value === 'string') {
    if (/^\+?\d{9,}$/.test(value)) return '***PHONE***';
    if (value.includes('@')) return '***EMAIL***';
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => maskPii(v, enabled));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskPii(v, enabled)]),
    );
  }
  return value;
}

function payloadSummary(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return '—';
  if (typeof payload.reason === 'string') return payload.reason;
  if (payload.before && payload.after) return 'before/after diff';
  if (typeof payload.message === 'string') return payload.message;
  return Object.keys(payload).slice(0, 3).join(', ') || '—';
}

export function AdminAuditExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [entityType, setEntityType] = useState(searchParams.get('entityType') ?? '');
  const [entityId, setEntityId] = useState(searchParams.get('entityId') ?? '');
  const [bookingId, setBookingId] = useState(searchParams.get('bookingId') ?? '');
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [datePreset, setDatePreset] = useState<(typeof DATE_PRESETS)[number]['id']>('30');
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditEventRecord | null>(null);
  const [maskPiiEnabled, setMaskPiiEnabled] = useState(true);

  const dateFrom = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset);
    if (!preset || preset.days === 0) return undefined;
    return isoDateDaysAgo(preset.days);
  }, [datePreset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditEvents({
        entityType: entityType || undefined,
        entityId: entityId.trim() || undefined,
        bookingId: bookingId.trim() || undefined,
        action: action.trim() || undefined,
        actorId: actorId.trim() || undefined,
        dateFrom,
        limit: 100,
      });
      setEvents(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được audit log');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, bookingId, action, actorId, dateFrom]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (entityType) params.entityType = entityType;
    if (entityId.trim()) params.entityId = entityId.trim();
    if (bookingId.trim()) params.bookingId = bookingId.trim();
    setSearchParams(params);
  }, [entityType, entityId, bookingId, setSearchParams]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const blob = await downloadAuditExport({
        entityType: entityType || undefined,
        entityId: entityId.trim() || undefined,
        bookingId: bookingId.trim() || undefined,
        action: action.trim() || undefined,
        actorId: actorId.trim() || undefined,
        dateFrom,
        limit: 5000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export thất bại');
    } finally {
      setExporting(false);
    }
  }

  function filterSameEntity(ev: AuditEventRecord) {
    setEntityType(ev.attributes.entityType);
    setEntityId(ev.attributes.entityId);
    setSelected(null);
  }

  const chainEvents = useMemo(() => {
    if (!selected) return [];
    return events.filter(
      (e) =>
        e.attributes.entityType === selected.attributes.entityType &&
        e.attributes.entityId === selected.attributes.entityId,
    );
  }, [events, selected]);

  return (
    <AdminShell
      title="Audit Trail Explorer"
      subtitle="UC-TR-01 · OP-WIN-03 timeline export · BR-24"
      screenTag="Admin / SCR-ADMIN-005"
    >
      <div
        className="rounded-xl p-4 mb-4 space-y-3"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Entity type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="block mt-1 h-9 px-3 rounded-lg border text-sm min-w-[140px]"
              style={{ borderColor: brand.border }}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t || 'all'} value={t}>
                  {t || 'Tất cả'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Entity ID
            </label>
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="un_01, bk_…"
              className="block mt-1 h-9 px-3 rounded-lg border text-sm min-w-[160px] font-mono"
              style={{ borderColor: brand.border }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Booking ID (OP-WIN-03)
            </label>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="bk_…"
              className="block mt-1 h-9 px-3 rounded-lg border text-sm min-w-[160px] font-mono"
              style={{ borderColor: brand.border }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Action
            </label>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="PATCH, APPROVE…"
              className="block mt-1 h-9 px-3 rounded-lg border text-sm min-w-[120px]"
              style={{ borderColor: brand.border }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Actor
            </label>
            <input
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="usr_…"
              className="block mt-1 h-9 px-3 rounded-lg border text-sm min-w-[140px] font-mono"
              style={{ borderColor: brand.border }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Khoảng thời gian
            </label>
            <select
              value={datePreset}
              onChange={(e) =>
                setDatePreset(e.target.value as (typeof DATE_PRESETS)[number]['id'])
              }
              className="block mt-1 h-9 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border }}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={maskPiiEnabled}
              onChange={(e) => setMaskPiiEnabled(e.target.checked)}
            />
            Ẩn PII trong payload (Legal unmask)
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm underline"
            style={{ color: brand.primary }}
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primaryDark }}
          >
            {exporting ? 'Đang export…' : 'Export CSV'}
          </button>
          <span className="text-sm" style={{ color: brand.muted }}>
            {events.length} sự kiện
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEF2F2', color: brand.destructive }}>
          {error}
        </p>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        {loading ? (
          <p className="p-6 text-sm" style={{ color: brand.muted }}>
            Đang tải event stream…
          </p>
        ) : events.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: brand.muted }}>
            Không có sự kiện phù hợp bộ lọc.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: brand.border }}>
            {events.map((ev) => {
              const a = ev.attributes;
              return (
                <li
                  key={ev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{ background: actionColor(a.action) }}
                      >
                        {a.action}
                      </span>
                      <span className="font-mono text-sm font-medium">
                        {a.entityType}/{a.entityId}
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate" style={{ color: brand.muted }}>
                      {a.actorId ?? 'system'} · {payloadSummary(a.payload)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs" style={{ color: brand.muted }}>
                      {formatTs(a.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(ev)}
                      className="text-sm underline"
                      style={{ color: brand.primary }}
                    >
                      Chi tiết
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <aside
          className="fixed inset-y-0 right-0 w-full max-w-lg shadow-xl z-50 flex flex-col"
          style={{ background: brand.surface, borderLeft: `1px solid ${brand.border}` }}
        >
          <div
            className="px-5 py-4 flex items-start justify-between gap-3 border-b"
            style={{ borderColor: brand.border }}
          >
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Event #{selected.id}
              </p>
              <h2 className="font-semibold text-lg">
                {selected.attributes.action} · {selected.attributes.entityType}
              </h2>
              <p className="text-sm font-mono" style={{ color: brand.muted }}>
                {selected.attributes.entityId}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-sm underline">
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <dt style={{ color: brand.muted }}>Tenant</dt>
              <dd className="font-mono">{selected.attributes.tenantId}</dd>
              <dt style={{ color: brand.muted }}>Actor</dt>
              <dd className="font-mono">{selected.attributes.actorId ?? '—'}</dd>
              <dt style={{ color: brand.muted }}>Thời gian</dt>
              <dd>{formatTs(selected.attributes.createdAt)}</dd>
            </dl>

            {chainEvents.length > 1 && (
              <div>
                <p className="font-semibold mb-2">Correlation chain ({chainEvents.length})</p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {chainEvents.map((e) => (
                    <li key={e.id} className="text-xs font-mono" style={{ color: brand.muted }}>
                      {formatTs(e.attributes.createdAt)} · {e.attributes.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="font-semibold mb-2">Payload JSON</p>
              <pre
                className="text-xs rounded-lg p-3 overflow-x-auto"
                style={{ background: brand.background, border: `1px solid ${brand.border}` }}
              >
                {JSON.stringify(
                  maskPii(selected.attributes.payload ?? {}, maskPiiEnabled),
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => filterSameEntity(selected)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white"
                style={{ background: brand.primary }}
              >
                Lọc cùng entity
              </button>
              {selected.attributes.entityType === 'unit' && (
                <Link
                  to={`/developer/units?unitId=${selected.attributes.entityId}`}
                  className="rounded-lg px-3 py-2 text-sm border"
                  style={{ borderColor: brand.border }}
                >
                  Mở GR grid
                </Link>
              )}
              {selected.attributes.entityType === 'listing' && (
                <Link
                  to="/admin/moderation"
                  className="rounded-lg px-3 py-2 text-sm border"
                  style={{ borderColor: brand.border }}
                >
                  Moderation
                </Link>
              )}
            </div>
          </div>
        </aside>
      )}
    </AdminShell>
  );
}
