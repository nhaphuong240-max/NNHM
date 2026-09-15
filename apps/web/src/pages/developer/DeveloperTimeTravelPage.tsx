import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProjectSelect } from '../../components/developer/ProjectSelect';
import { DeveloperShell } from '../../components/DeveloperShell';
import { useProjectIdSelection } from '../../hooks/useDeveloperProjects';
import {
  downloadUnitVersionsCsv,
  fetchGrUnits,
  fetchUnitSnapshotAt,
  fetchUnitVersions,
  type GrUnit,
  type UnitSnapshotData,
  type UnitVersionRow,
} from '../../lib/api';
import { brand, formatVnd } from '../../theme/tokens';

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function toSnapshotIso(dateValue: string) {
  return `${dateValue}T12:00:00.000Z`;
}

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

export function DeveloperTimeTravelPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUnitId = searchParams.get('unitId') ?? 'un_01';
  const initialAt = searchParams.get('at') ?? '2026-07-10';

  const { projectId, setProjectId } = useProjectIdSelection();
  const [units, setUnits] = useState<GrUnit[]>([]);
  const [unitId, setUnitId] = useState(initialUnitId);
  const [atDate, setAtDate] = useState(initialAt.slice(0, 10));
  const [versions, setVersions] = useState<UnitVersionRow[]>([]);
  const [snapshot, setSnapshot] = useState<UnitSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  const loadUnits = useCallback(async () => {
    if (!projectId) return;
    const res = await fetchGrUnits({ projectId, limit: 200 });
    setUnits(res.data);
    if (!res.data.some((u) => u.id === unitId) && res.data[0]) {
      setUnitId(res.data[0].id);
    }
  }, [projectId, unitId]);

  const loadVersions = useCallback(async () => {
    if (!unitId) return;
    const res = await fetchUnitVersions(unitId);
    setVersions(res.data);
  }, [unitId]);

  const runSnapshotQuery = useCallback(async () => {
    if (!unitId || !atDate) return;
    setQueryLoading(true);
    setError(null);
    try {
      const at = toSnapshotIso(atDate);
      const res = await fetchUnitSnapshotAt(unitId, at);
      setSnapshot(res.data);
      setSearchParams({ unitId, at: atDate });
    } catch (e) {
      setSnapshot(null);
      setError(e instanceof Error ? e.message : 'Không truy vấn được snapshot');
    } finally {
      setQueryLoading(false);
    }
  }, [unitId, atDate, setSearchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadUnits()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải bảng hàng');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadUnits]);

  useEffect(() => {
    if (!unitId) return;
    let active = true;
    loadVersions().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Không tải lịch sử version');
    });
    return () => {
      active = false;
    };
  }, [unitId, loadVersions]);

  useEffect(() => {
    void runSnapshotQuery();
  }, [runSnapshotQuery]);

  const handleExport = async () => {
    if (!unitId) return;
    setExporting(true);
    try {
      const blob = await downloadUnitVersionsCsv(unitId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `unit-${selectedUnit?.attributes.code ?? unitId}-versions.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export thất bại');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DeveloperShell
      title="Time-travel GR"
      subtitle="UC-GR-05 · SCR-DEV-011 · Lịch sử giá & tồn kho"
      screenTag="Developer · Golden Record history"
    >
      <Link to="/developer" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Developer hub
      </Link>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <label className="block text-sm">
          <span style={{ color: brand.muted }}>Dự án</span>
          <ProjectSelect
            value={projectId}
            onChange={setProjectId}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span style={{ color: brand.muted }}>Mã căn (Golden Record)</span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.attributes.code} · v{u.attributes.version}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span style={{ color: brand.muted }}>Thời điểm T (time-travel)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              value={atDate}
              onChange={(e) => setAtDate(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2"
              style={{ borderColor: brand.border, background: brand.surface }}
            />
            <button
              type="button"
              onClick={() => void runSnapshotQuery()}
              disabled={queryLoading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: brand.primary }}
            >
              {queryLoading ? '…' : 'Query'}
            </button>
          </div>
        </label>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải bảng hàng…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {snapshot && (
        <section
          className="rounded-xl p-4 mb-6"
          style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.primary }}>
            Snapshot tại {toDateInputValue(snapshot.attributes.asOf)}
          </p>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Mã căn
              </p>
              <p className="font-mono font-bold">{snapshot.attributes.code}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Version
              </p>
              <p className="font-bold">v{snapshot.attributes.version}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Giá GR
              </p>
              <p className="font-bold tabular-nums" style={{ color: brand.primary }}>
                {formatVnd(snapshot.attributes.basePrice)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: brand.muted }}>
                Trạng thái
              </p>
              <span
                className="inline-block text-xs font-bold px-2 py-0.5 rounded text-white mt-1"
                style={{ background: statusColor(snapshot.attributes.status) }}
              >
                {snapshot.attributes.status}
              </span>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: brand.muted }}>
            Matched event: {new Date(snapshot.attributes.matchedAt).toLocaleString('vi-VN')} ·{' '}
            {snapshot.attributes.reason ?? '—'} · source {snapshot.attributes.source}
          </p>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold">Version history (immutable audit)</h3>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || !unitId}
          className="rounded-lg px-3 py-1.5 text-sm font-medium border disabled:opacity-60"
          style={{ borderColor: brand.border, background: brand.surface }}
        >
          {exporting ? 'Đang export…' : 'Export CSV evidence'}
        </button>
      </section>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: brand.background }}>
            <tr>
              <th className="text-left p-3 font-medium">Ver</th>
              <th className="text-left p-3 font-medium">Giá GR</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Changed by</th>
              <th className="text-left p-3 font-medium">At</th>
              <th className="text-left p-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center" style={{ color: brand.muted }}>
                  Chưa có lịch sử PATCH — thử PATCH giá trên bảng hàng GR
                </td>
              </tr>
            ) : (
              versions.map((row) => (
                <tr key={`${row.version}-${row.attributes.changedAt}`} className="border-t" style={{ borderColor: brand.border }}>
                  <td className="p-3 font-mono font-semibold">v{row.version}</td>
                  <td className="p-3 font-bold tabular-nums" style={{ color: brand.primary }}>
                    {formatVnd(row.attributes.basePrice)}
                  </td>
                  <td className="p-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ background: statusColor(row.attributes.status) }}
                    >
                      {row.attributes.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{row.attributes.changedBy ?? '—'}</td>
                  <td className="p-3 text-xs">{new Date(row.attributes.changedAt).toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-xs" style={{ color: brand.muted }}>
                    {row.attributes.reason ?? row.attributes.action}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-3" style={{ color: brand.muted }}>
        Demo: chọn <strong>un_01 / A-12-05</strong> · ngày <strong>2026-07-10</strong> → giá 3.75 tỷ (v2). Hiện tại v3 = 3.85 tỷ.
      </p>
    </DeveloperShell>
  );
}
