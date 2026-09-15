import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProjectSelect } from '../../components/developer/ProjectSelect';
import { DeveloperShell } from '../../components/DeveloperShell';
import { useProjectIdSelection } from '../../hooks/useDeveloperProjects';
import {
  fetchGrUnits,
  fetchUnitAudit,
  patchGrUnit,
  type AuditEventRecord,
  type GrUnit,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

const STATUS_OPTIONS = ['ALL', 'AVAILABLE', 'RESERVED', 'SOLD', 'HOLD'] as const;

function statusColor(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return brand.success;
    case 'RESERVED':
      return brand.warning;
    case 'SOLD':
      return brand.muted;
    case 'HOLD':
      return brand.primary;
    default:
      return brand.border;
  }
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap"
      style={{ background: statusColor(status) }}
    >
      {status}
    </span>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="text-xs" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1" style={{ color: brand.primary }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function DeveloperUnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('unitId') ?? '';
  const { projectId, setProjectId } = useProjectIdSelection(searchParams.get('projectId'));
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [units, setUnits] = useState<GrUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editReason, setEditReason] = useState('Cập nhật giá bảng hàng');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [auditUnit, setAuditUnit] = useState<GrUnit | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGrUnits({
        projectId,
        limit: 500,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setUnits(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được bảng hàng');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const row = rowRefs.current[highlightId];
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, loading, units]);

  const kpis = useMemo(() => {
    const total = units.length;
    const available = units.filter((u) => u.attributes.status === 'AVAILABLE').length;
    const reserved = units.filter((u) => u.attributes.status === 'RESERVED').length;
    const sold = units.filter((u) => u.attributes.status === 'SOLD').length;
    const hold = units.filter((u) => u.attributes.status === 'HOLD').length;
    const absorption =
      total > 0 ? `${Math.round(((sold + reserved) / total) * 1000) / 10}%` : '—';
    return { total, available, reserved, sold, hold, absorption };
  }, [units]);

  function startEdit(unit: GrUnit) {
    setEditingId(unit.id);
    setEditPrice(String(unit.attributes.basePrice));
    setMessage(null);
  }

  async function savePrice(unit: GrUnit) {
    const price = Number(editPrice.replace(/\D/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      setError('Giá gốc không hợp lệ.');
      return;
    }

    setSavingId(unit.id);
    setError(null);
    setMessage(null);
    try {
      const res = await patchGrUnit(unit.id, {
        basePrice: price,
        expectedVersion: unit.attributes.version,
        reason: editReason.trim() || 'Price update',
      });
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? res.data : u)));
      setEditingId(null);
      setMessage(`Đã cập nhật ${unit.attributes.code} · v${res.data.attributes.version}`);
      if (auditUnit?.id === unit.id) {
        void openAudit(res.data);
      }
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) {
        setError('Xung đột phiên bản (409) — dữ liệu đã thay đổi. Đang tải lại…');
        await load();
        setEditingId(null);
      } else {
        setError(err.message);
      }
    } finally {
      setSavingId(null);
    }
  }

  async function openAudit(unit: GrUnit) {
    setAuditUnit(unit);
    setSearchParams({ unitId: unit.id });
    setAuditLoading(true);
    try {
      const res = await fetchUnitAudit(unit.id);
      setAuditEvents(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải audit');
    } finally {
      setAuditLoading(false);
    }
  }

  function closeAudit() {
    setAuditUnit(null);
    setAuditEvents([]);
    setSearchParams({});
  }

  return (
    <DeveloperShell
      title="Bảng hàng Golden Record"
      subtitle="UC-GR-01 · SCR-DEV-012 · PATCH optimistic lock"
      screenTag="Developer / Golden Record"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Project (ABAC)
            </label>
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
              className="block mt-1 h-10 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border, background: brand.surface }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'Tất cả' : s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            to={`/developer/units/import?projectId=${encodeURIComponent(projectId)}`}
            className="underline font-medium"
            style={{ color: brand.primary }}
          >
            Import CSV
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="underline"
            style={{ color: brand.primary }}
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Tổng căn" value={kpis.total} />
        <KpiCard label="Còn hàng" value={kpis.available} hint="AVAILABLE" />
        <KpiCard label="Giữ / Cọc" value={kpis.reserved} hint="RESERVED" />
        <KpiCard label="Đã bán" value={kpis.sold} hint="SOLD" />
        <KpiCard label="Absorption" value={kpis.absorption} hint={`HOLD: ${kpis.hold}`} />
      </div>
      <p className="text-xs mb-4" style={{ color: brand.muted }}>
        Chỉ admin CĐT được Sửa giá (PATCH /units/:id). Agent bị 403.{' '}
        SOP: <code>docs/gtm/SOP-CDT-import-gia.md</code>
      </p>

      {message && (
        <p
          className="mb-4 text-sm rounded-lg p-3"
          style={{ background: '#ECFDF5', color: brand.success, border: `1px solid ${brand.success}` }}
        >
          {message}
        </p>
      )}

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
            Đang tải grid…
          </p>
        ) : units.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: brand.muted }}>
            Không có unit phù hợp bộ lọc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: brand.background, color: brand.muted }}>
                  <th className="text-left px-4 py-3 font-medium">Mã căn</th>
                  <th className="text-left px-4 py-3 font-medium">Tầng</th>
                  <th className="text-right px-4 py-3 font-medium">Diện tích</th>
                  <th className="text-right px-4 py-3 font-medium">PN</th>
                  <th className="text-right px-4 py-3 font-medium">Giá gốc GR</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Ver</th>
                  <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const highlighted = unit.id === highlightId;
                  const editing = editingId === unit.id;

                  return (
                    <tr
                      key={unit.id}
                      ref={(el) => {
                        rowRefs.current[unit.id] = el;
                      }}
                      className="border-t"
                      style={{
                        borderColor: brand.border,
                        background: highlighted ? '#EFF6FF' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-medium">
                        {unit.attributes.code}
                        <span className="block text-xs font-normal" style={{ color: brand.muted }}>
                          {unit.id}
                        </span>
                      </td>
                      <td className="px-4 py-3">{unit.attributes.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{unit.attributes.area} m²</td>
                      <td className="px-4 py-3 text-right">{unit.attributes.bedrooms}</td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
                            className="w-full max-w-[160px] h-9 px-2 rounded border text-right font-mono text-xs"
                            style={{ borderColor: brand.primary }}
                          />
                        ) : (
                          <span className="font-mono">{formatVnd(unit.attributes.basePrice)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={unit.attributes.status} />
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        v{unit.attributes.version}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {editing ? (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="Lý do audit"
                              className="w-full max-w-[180px] h-8 px-2 rounded border text-xs"
                              style={{ borderColor: brand.border }}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={savingId === unit.id}
                                onClick={() => void savePrice(unit)}
                                className="text-xs px-2 py-1 rounded text-white font-semibold disabled:opacity-50"
                                style={{ background: brand.success }}
                              >
                                {savingId === unit.id ? '…' : 'Lưu'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs px-2 py-1 rounded border"
                                style={{ borderColor: brand.border }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(unit)}
                              className="text-xs underline"
                              style={{ color: brand.primary }}
                            >
                              Sửa giá
                            </button>
                            <button
                              type="button"
                              onClick={() => void openAudit(unit)}
                              className="text-xs underline"
                              style={{ color: brand.muted }}
                            >
                              Audit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {auditUnit && (
        <aside
          className="fixed inset-y-0 right-0 w-full max-w-md shadow-xl z-50 flex flex-col"
          style={{ background: brand.surface, borderLeft: `1px solid ${brand.border}` }}
        >
          <div
            className="px-5 py-4 flex items-start justify-between gap-3 border-b"
            style={{ borderColor: brand.border }}
          >
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Audit trail · BR-08
              </p>
              <h2 className="font-semibold text-lg">{auditUnit.attributes.code}</h2>
              <p className="text-sm" style={{ color: brand.muted }}>
                v{auditUnit.attributes.version} · {formatVnd(auditUnit.attributes.basePrice)}
              </p>
            </div>
            <button type="button" onClick={closeAudit} className="text-sm underline">
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {auditLoading ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Đang tải…
              </p>
            ) : auditEvents.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có sự kiện audit cho unit này.
              </p>
            ) : (
              auditEvents.map((ev) => {
                const payload = ev.attributes.payload as
                  | { before?: { basePrice?: string }; after?: { basePrice?: string; version?: number }; reason?: string }
                  | null
                  | undefined;
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg p-3 text-sm"
                    style={{ background: brand.background, border: `1px solid ${brand.border}` }}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{ev.attributes.action}</span>
                      <span className="text-xs" style={{ color: brand.muted }}>
                        {new Date(ev.attributes.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {payload?.reason && (
                      <p className="text-xs mt-1" style={{ color: brand.muted }}>
                        {payload.reason}
                      </p>
                    )}
                    {payload?.before?.basePrice && payload?.after?.basePrice && (
                      <p className="text-xs mt-1 font-mono">
                        {Number(payload.before.basePrice).toLocaleString('vi-VN')} →{' '}
                        {Number(payload.after.basePrice).toLocaleString('vi-VN')} · v
                        {payload.after.version}
                      </p>
                    )}
                    {ev.attributes.actorId && (
                      <p className="text-xs mt-1" style={{ color: brand.muted }}>
                        actor: {ev.attributes.actorId}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}
    </DeveloperShell>
  );
}
