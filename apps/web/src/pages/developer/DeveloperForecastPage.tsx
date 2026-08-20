import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import { fetchAbsorptionForecast, type ForecastReportData } from '../../lib/api';
import { brand, formatPercent } from '../../theme/tokens';

const PROJECTS = [{ id: 'prj_sunrise', name: 'Sunrise Tower A' }] as const;

export function DeveloperForecastPage() {
  const [projectId, setProjectId] = useState<string>(PROJECTS[0].id);
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<ForecastReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAbsorptionForecast(projectId, months);
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải forecast');
    } finally {
      setLoading(false);
    }
  }, [projectId, months]);

  useEffect(() => {
    void load();
  }, [load]);

  const attrs = data?.attributes;
  const maxSold = Math.max(1, ...(attrs?.projections.map((p) => p.projectedSold) ?? [1]));

  return (
    <DeveloperShell
      title="Absorption forecast"
      subtitle="UC-AN-05 · SCR-DEV-005 · Stub projection"
      screenTag="Developer · Analytics preview"
    >
      <Link to="/developer" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Developer hub
      </Link>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <label className="text-sm">
          <span style={{ color: brand.muted }}>Dự án</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 block rounded-lg border px-3 py-2"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span style={{ color: brand.muted }}>Horizon (tháng)</span>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-1 block rounded-lg border px-3 py-2"
            style={{ borderColor: brand.border, background: brand.surface }}
          >
            {[3, 6, 9, 12].map((m) => (
              <option key={m} value={m}>
                {m} tháng
              </option>
            ))}
          </select>
        </label>

        <Link
          to="/developer/absorption"
          className="text-sm underline"
          style={{ color: brand.primary }}
        >
          Xem absorption hiện tại →
        </Link>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tính forecast…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}
          >
            <strong>Stub model</strong> — {attrs.disclaimer}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Tổng căn
              </p>
              <p className="text-2xl font-bold mt-1">{attrs.current.total}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Đã bán (hiện tại)
              </p>
              <p className="text-2xl font-bold mt-1">{attrs.current.sold}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Absorption hiện tại
              </p>
              <p className="text-2xl font-bold mt-1">{formatPercent(attrs.current.absorptionRate)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs" style={{ color: brand.muted }}>
                Tốc độ stub / tháng
              </p>
              <p className="text-2xl font-bold mt-1">{formatPercent(attrs.monthlySoldRate)}</p>
            </div>
          </div>

          <section>
            <h3 className="font-semibold mb-3">Projection chart (sold units)</h3>
            <div className="space-y-2">
              {attrs.projections.map((point) => (
                <div key={point.label} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-mono text-xs" style={{ color: brand.muted }}>
                    {point.label}
                  </span>
                  <span className="w-16 text-xs" style={{ color: brand.muted }}>
                    {point.month}
                  </span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: brand.background }}>
                    <div
                      className="h-full rounded-lg flex items-center px-2 text-xs font-semibold text-white"
                      style={{
                        width: `${Math.max(8, (point.projectedSold / maxSold) * 100)}%`,
                        background: brand.primary,
                      }}
                    >
                      {point.projectedSold} sold
                    </div>
                  </div>
                  <span className="w-20 text-right tabular-nums">{formatPercent(point.absorptionRate)}</span>
                </div>
              ))}
            </div>
          </section>

          <section
            className="rounded-xl overflow-hidden"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <table className="w-full text-sm">
              <thead style={{ background: brand.background }}>
                <tr>
                  <th className="text-left p-3 font-medium">Horizon</th>
                  <th className="text-left p-3 font-medium">Tháng</th>
                  <th className="text-left p-3 font-medium">Sold (proj.)</th>
                  <th className="text-left p-3 font-medium">Available (proj.)</th>
                  <th className="text-left p-3 font-medium">Absorption</th>
                </tr>
              </thead>
              <tbody>
                {attrs.projections.map((point) => (
                  <tr key={point.label} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="p-3 font-mono">{point.label}</td>
                    <td className="p-3">{point.month}</td>
                    <td className="p-3 font-semibold">{point.projectedSold}</td>
                    <td className="p-3">{point.projectedAvailable}</td>
                    <td className="p-3">{formatPercent(point.absorptionRate)}</td>
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
