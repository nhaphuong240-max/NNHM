import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  fetchProductGraph,
  type ProductGraphBuildingNode,
  type ProductGraphData,
  type ProductGraphKpi,
  type ProductGraphUnitNode,
} from '../../lib/api';
import { brand, formatPercent, formatVnd } from '../../theme/tokens';

const PROJECTS = [{ id: 'prj_sunrise', name: 'Sunrise Tower A' }] as const;
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

function absorptionColor(rate: number) {
  if (rate >= 0.5) return brand.warning;
  if (rate >= 0.25) return brand.primary;
  return brand.success;
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="text-xs" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: brand.primary }}>
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

function StatsRow({ stats, compact }: { stats: ProductGraphKpi; compact?: boolean }) {
  const items = [
    { label: 'Tổng', value: stats.total },
    { label: 'Còn', value: stats.available },
    { label: 'Giữ', value: stats.reserved },
    { label: 'Bán', value: stats.sold },
  ];
  return (
    <div className={`flex flex-wrap gap-3 ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: brand.muted }}>
      {items.map((item) => (
        <span key={item.label}>
          {item.label}: <strong className="tabular-nums">{item.value}</strong>
        </span>
      ))}
      <span>
        Absorption: <strong>{formatPercent(stats.absorptionRate)}</strong>
      </span>
    </div>
  );
}

function UnitChip({ unit }: { unit: ProductGraphUnitNode }) {
  return (
    <Link
      to={`/developer/units?unitId=${encodeURIComponent(unit.id)}`}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:shadow-sm transition-shadow"
      style={{ background: brand.background, border: `1px solid ${brand.border}` }}
    >
      <span className="font-mono font-semibold">{unit.code}</span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
        style={{ background: statusColor(unit.status) }}
      >
        {unit.status}
      </span>
      <span className="text-xs tabular-nums" style={{ color: brand.muted }}>
        {formatVnd(unit.basePrice)}
      </span>
    </Link>
  );
}

function BuildingCard({
  building,
  expanded,
  onToggle,
  selectedFloorId,
  onSelectFloor,
}: {
  building: ProductGraphBuildingNode;
  expanded: boolean;
  onToggle: () => void;
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string) => void;
}) {
  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50/80"
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: absorptionColor(building.absorptionRate) }}
            />
            <h3 className="font-bold" style={{ color: brand.primaryDark }}>
              {building.label}
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100">{building.code}</span>
          </div>
          <div className="mt-2">
            <StatsRow stats={building.stats} compact />
          </div>
        </div>
        <span className="text-lg leading-none" style={{ color: brand.muted }}>
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 space-y-3" style={{ borderColor: brand.border }}>
          {building.floors.map((floor) => {
            const selected = selectedFloorId === floor.id;
            return (
              <div
                key={floor.id}
                className="rounded-lg p-3"
                style={{
                  background: selected ? '#EFF6FF' : brand.background,
                  border: `1px solid ${selected ? brand.primary : brand.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectFloor(floor.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{floor.label}</span>
                    <span className="text-xs" style={{ color: brand.muted }}>
                      {floor.stats.total} căn
                    </span>
                  </div>
                  <div className="mt-1">
                    <StatsRow stats={floor.stats} compact />
                  </div>
                </button>
                {selected && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {floor.units.map((unit) => (
                      <UnitChip key={unit.id} unit={unit} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function DeveloperProductGraphPage() {
  const [projectId, setProjectId] = useState<string>(PROJECTS[0].id);
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [graph, setGraph] = useState<ProductGraphData | null>(null);
  const [unitCount, setUnitCount] = useState(0);
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProductGraph(projectId, {
        building: buildingFilter === 'ALL' ? undefined : buildingFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setGraph(res.data);
      setUnitCount(res.meta.unitCount);
      setExpandedBuildings(
        Object.fromEntries(res.data.buildings.map((b) => [b.id, true])),
      );
      setSelectedFloorId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được Product Graph');
    } finally {
      setLoading(false);
    }
  }, [buildingFilter, projectId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildingOptions = useMemo(() => {
    if (!graph) return ['ALL'];
    return ['ALL', ...graph.buildings.map((b) => b.code)];
  }, [graph]);

  const breadcrumb = useMemo(() => {
    if (!graph || !selectedFloorId) {
      return graph ? [graph.project.name] : [];
    }
    for (const building of graph.buildings) {
      const floor = building.floors.find((f) => f.id === selectedFloorId);
      if (floor) return [graph.project.name, building.label, floor.label];
    }
    return [graph.project.name];
  }, [graph, selectedFloorId]);

  return (
    <DeveloperShell
      title="Product Graph"
      subtitle="UC-GR-04 · SCR-DEV-010 · Project → Building → Floor → Unit"
      screenTag="Developer Portal · Golden Record"
    >
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <label className="text-sm block">
          <span style={{ color: brand.muted }}>Dự án</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 block rounded-lg border px-3 py-2 text-sm min-w-[180px]"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm block">
          <span style={{ color: brand.muted }}>Block</span>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="mt-1 block rounded-lg border px-3 py-2 text-sm min-w-[120px]"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {buildingOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'ALL' ? 'Tất cả' : `Block ${b}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm block">
          <span style={{ color: brand.muted }}>Trạng thái</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className="mt-1 block rounded-lg border px-3 py-2 text-sm min-w-[140px]"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="text-sm underline pb-2" onClick={() => void load()}>
          Làm mới
        </button>
        <Link
          to={`/developer/units?projectId=${encodeURIComponent(projectId)}`}
          className="text-sm font-medium underline pb-2"
          style={{ color: brand.primary }}
        >
          Bảng hàng GR →
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {loading && <p style={{ color: brand.muted }}>Đang dựng graph từ Golden Record…</p>}

      {graph && !loading && (
        <div className="space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Tổng căn (graph)" value={unitCount} hint={graph.project.code} />
            <KpiCard label="Còn hàng" value={graph.project.stats.available} />
            <KpiCard label="Blocks" value={graph.buildings.length} />
            <KpiCard
              label="Absorption dự án"
              value={formatPercent(graph.project.stats.absorptionRate)}
              hint={`${graph.project.stats.sold} đã bán`}
            />
          </section>

          <div
            className="rounded-xl p-4 flex flex-wrap items-center gap-2 text-sm"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <span style={{ color: brand.muted }}>Breadcrumb:</span>
            {breadcrumb.map((part, i) => (
              <span key={`${part}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: brand.muted }}>›</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-semibold' : ''}>{part}</span>
              </span>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-semibold">Cấu trúc inventory</h2>
              {graph.buildings.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Không có unit phù hợp bộ lọc
                </p>
              ) : (
                graph.buildings.map((building) => (
                  <BuildingCard
                    key={building.id}
                    building={building}
                    expanded={expandedBuildings[building.id] ?? false}
                    onToggle={() =>
                      setExpandedBuildings((prev) => ({
                        ...prev,
                        [building.id]: !prev[building.id],
                      }))
                    }
                    selectedFloorId={selectedFloorId}
                    onSelectFloor={(floorId) =>
                      setSelectedFloorId((prev) => (prev === floorId ? null : floorId))
                    }
                  />
                ))
              )}
            </div>

            <aside
              className="rounded-xl p-4 space-y-4 h-fit"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold">Graph meta</h3>
              <StatsRow stats={graph.project.stats} />
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <dt style={{ color: brand.muted }}>Nodes</dt>
                  <dd className="font-mono tabular-nums">{graph.nodes.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: brand.muted }}>Edges</dt>
                  <dd className="font-mono tabular-nums">{graph.edges.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: brand.muted }}>Project ID</dt>
                  <dd className="font-mono text-xs">{graph.project.id}</dd>
                </div>
              </dl>
              <p className="text-xs" style={{ color: brand.muted }}>
                Chấm màu block theo absorption. Click căn → deep link SCR-DEV-012 (
                <code className="font-mono">/developer/units?unitId=</code>).
              </p>
            </aside>
          </div>
        </div>
      )}
    </DeveloperShell>
  );
}
