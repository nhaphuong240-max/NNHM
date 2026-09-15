import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import { useDeveloperProjects, useProjectIdSelection } from '../../hooks/useDeveloperProjects';
import { fetchAbsorptionReport, type AbsorptionReportData } from '../../lib/api';
import { brand, formatPercent, formatVnd } from '../../theme/tokens';

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

export function DeveloperAbsorptionPage() {
  const { projects } = useDeveloperProjects();
  const { projectId, setProjectId } = useProjectIdSelection();
  const [data, setData] = useState<AbsorptionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAbsorptionReport(projectId);
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải absorption');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const attrs = data?.attributes;
  const inv = attrs?.inventory;
  const maxStatus = Math.max(1, ...Object.values(attrs?.statusBreakdown ?? { x: 1 }));

  return (
    <DeveloperShell title="Absorption report" subtitle="UC-AN-03 · Tồn kho & tỷ lệ bán">
      <Link to="/developer" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Developer hub
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProjectId(p.id)}
            className="rounded-full px-3 py-1 text-sm border"
            style={{
              borderColor: projectId === p.id ? brand.primary : brand.border,
              background: projectId === p.id ? '#EFF6FF' : brand.surface,
              color: projectId === p.id ? brand.primary : brand.muted,
            }}
          >
            {p.attributes.name}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {inv && attrs && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Tổng căn
              </p>
              <p className="text-2xl font-bold tabular-nums">{inv.total}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Còn hàng
              </p>
              <p className="text-2xl font-bold tabular-nums">{inv.available}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Đã bán
              </p>
              <p className="text-2xl font-bold tabular-nums">{inv.sold}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: '#FEF3C7', border: `1px solid ${brand.warning}` }}
            >
              <p className="text-xs" style={{ color: brand.muted }}>
                Absorption
              </p>
              <p className="text-2xl font-bold tabular-nums">{formatPercent(inv.absorptionRate)}</p>
            </div>
          </div>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-4">Phân bổ trạng thái</h3>
            <div className="space-y-2">
              {Object.entries(attrs.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 font-medium">{status}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((count / maxStatus) * 100))}%`,
                        background: statusColor(status),
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono tabular-nums">{count}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs" style={{ color: brand.muted }}>
              <span>GR available: {formatVnd(attrs.inventoryValue.availableBasePrice)}</span>
              <span>GR sold: {formatVnd(attrs.inventoryValue.soldBasePrice)}</span>
            </div>
          </section>

          <section
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${brand.border}` }}
          >
            <table className="w-full text-sm">
              <thead style={{ background: brand.surface }}>
                <tr>
                  <th className="text-left p-3">Mã căn</th>
                  <th className="text-left p-3">Diện tích</th>
                  <th className="text-left p-3">Giá GR</th>
                  <th className="text-left p-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {attrs.previewUnits.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3 font-mono">{u.code}</td>
                    <td className="p-3">{u.area} m²</td>
                    <td className="p-3 tabular-nums">{formatVnd(u.basePrice)}</td>
                    <td className="p-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{ background: statusColor(u.status) }}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </DeveloperShell>
  );
}
