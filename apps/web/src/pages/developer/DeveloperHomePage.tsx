import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectSelect } from '../../components/developer/ProjectSelect';
import { DeveloperShell } from '../../components/DeveloperShell';
import { useDeveloperProjects, useProjectIdSelection } from '../../hooks/useDeveloperProjects';
import { fetchDeveloperDashboard, type DeveloperDashboardData } from '../../lib/api';
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

function QuickLink({ to, label, desc, soon }: { to: string; label: string; desc: string; soon?: boolean }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-1 rounded-xl p-4 hover:shadow-sm transition-shadow relative"
      style={{
        background: brand.surface,
        border: `1px solid ${brand.border}`,
        opacity: soon ? 0.7 : 1,
      }}
    >
      <p className="font-semibold text-sm" style={{ color: brand.primaryDark }}>
        {label}
      </p>
      <p className="text-xs" style={{ color: brand.muted }}>
        {desc}
      </p>
      {soon && (
        <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
          S2
        </span>
      )}
    </Link>
  );
}

export function DeveloperHomePage() {
  const { projects } = useDeveloperProjects();
  const { projectId, setProjectId } = useProjectIdSelection();
  const projectName = projects.find((p) => p.id === projectId)?.attributes.name;
  const [data, setData] = useState<DeveloperDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    const res = await fetchDeveloperDashboard(projectId);
    setData(res.data);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được portal');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const inv = data?.attributes.inventory;

  return (
    <DeveloperShell
      title="Portal Chủ đầu tư"
      subtitle="UC-UX-04 · SCR-DEV-001 · Golden Record hub"
      screenTag="Developer Portal · Chủ đầu tư"
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm" style={{ color: brand.muted }}>
          Dự án
        </label>
        <ProjectSelect value={projectId} onChange={setProjectId} className="rounded-lg border px-3 py-2 text-sm" />
        <Link
          to={`/developer/units?projectId=${encodeURIComponent(projectId)}`}
          className="text-sm font-medium underline"
          style={{ color: brand.primary }}
        >
          Mở bảng hàng GR →
        </Link>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải tồn kho…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {inv && data && (
        <div className="space-y-8">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Tổng căn" value={inv.total} hint={projectName} />
            <KpiCard label="Còn hàng" value={inv.available} hint={`${formatPercent(inv.available / Math.max(inv.total, 1))} inventory`} />
            <KpiCard label="Giữ / Cọc" value={inv.reserved} />
            <KpiCard
              label="Absorption"
              value={formatPercent(inv.absorptionRate)}
              hint={`${inv.sold} đã bán`}
            />
          </section>

          <section>
            <h3 className="font-semibold mb-3">Module nghiệp vụ</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickLink to="/developer/projects" label="Dự án" desc="FR-GR-01 · Thêm / sửa / xóa dự án" />
              <QuickLink to="/developer/units" label="Bảng hàng GR" desc="UC-GR-01 · Quản lý unit gốc" />
              <QuickLink to="/developer/product-graph" label="Product Graph" desc="UC-GR-04 · Building → Floor → Unit" />
              <QuickLink to="/developer/commission" label="Hoa hồng" desc="UC-COM-01 · Chính sách split" />
              <QuickLink to="/developer/distribution" label="Phân phối" desc="UC-MKT-01 · Marketplace policy" />
              <QuickLink to="/developer/documents" label="Document Vault" desc="UC-TR-02 · Upload & access log" />
              <QuickLink to="/developer/units/import" label="Import Excel" desc="UC-GR-06 · SCR-DEV-008" />
              <QuickLink to="/developer/time-travel" label="Time-travel" desc="UC-GR-05 · SCR-DEV-011 · lịch sử giá" />
              <QuickLink to="/developer/forecast" label="Forecast" desc="UC-AN-05 · SCR-DEV-005 · stub projection" />
              <QuickLink to="/developer/intelligence" label="Data Intelligence" desc="T5-S5 · Heatmap · pricing report" />
              <QuickLink to="/developer/absorption" label="Absorption report" desc="UC-AN-03 · Inventory KPI" />
              <QuickLink to="/developer/attribution" label="Attribution" desc="UC-AN-04 · Campaign ROI · SCR-DEV-003" />
              <QuickLink to="/developer/leaderboard" label="Leaderboard" desc="UC-MKT-03 · SCR-DEV-009" />
              <QuickLink to="/developer/webhooks" label="Webhooks" desc="UC-NW-05 · SCR-DEV-013" />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Bảng hàng nhanh — Golden Record</h3>
              <Link to="/developer/units" className="text-sm underline" style={{ color: brand.primary }}>
                Xem đầy đủ
              </Link>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <table className="w-full text-sm">
                <thead style={{ background: brand.background }}>
                  <tr>
                    <th className="text-left p-3 font-medium">Mã căn</th>
                    <th className="text-left p-3 font-medium">Tầng</th>
                    <th className="text-left p-3 font-medium">Diện tích</th>
                    <th className="text-left p-3 font-medium">Giá GR</th>
                    <th className="text-left p-3 font-medium">Trạng thái</th>
                    <th className="text-left p-3 font-medium">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attributes.previewUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center" style={{ color: brand.muted }}>
                        Chưa có unit trong dự án
                      </td>
                    </tr>
                  ) : (
                    data.attributes.previewUnits.map((u) => (
                      <tr key={u.id} className="border-t" style={{ borderColor: brand.border }}>
                        <td className="p-3 font-mono font-semibold">{u.code}</td>
                        <td className="p-3">{u.floor ?? '—'}</td>
                        <td className="p-3">{u.area}m²</td>
                        <td className="p-3 font-bold tabular-nums" style={{ color: brand.primary }}>
                          {formatVnd(u.basePrice)}
                        </td>
                        <td className="p-3">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded text-white"
                            style={{ background: statusColor(u.status) }}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs" style={{ color: brand.muted }}>
                          v{u.version}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2" style={{ color: brand.muted }}>
              Listings published: {data.attributes.listings.published} · Commission policies:{' '}
              {data.attributes.commission.policies}
            </p>
          </section>
        </div>
      )}
    </DeveloperShell>
  );
}
