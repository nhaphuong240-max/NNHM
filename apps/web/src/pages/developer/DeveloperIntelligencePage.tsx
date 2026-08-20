import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  fetchIntelligenceBilling,
  fetchIntelligenceHeatmap,
  fetchIntelligenceMarketBrief,
  fetchIntelligencePricingReport,
} from '../../lib/api';
import { brand, layout } from '../../theme/tokens';

const PROJECTS = [
  { id: 'prj_sunrise', name: 'Sunrise Tower A' },
  { id: 'prj_thanglong_01', name: 'Thăng Long Central' },
] as const;

type HeatmapPoint = {
  code?: string;
  status?: string;
  basePrice?: number;
  intensity?: number;
};

export function DeveloperIntelligencePage() {
  const [projectId, setProjectId] = useState<string>(PROJECTS[0].id);
  const [tab, setTab] = useState<'overview' | 'billing'>('overview');
  const [districts, setDistricts] = useState<HeatmapPoint[]>([]);
  const [pricingBand, setPricingBand] = useState<string>('—');
  const [csvPreview, setCsvPreview] = useState<string>('');
  const [briefSummary, setBriefSummary] = useState<string>('—');
  const [billing, setBilling] = useState<{ mrr: number; tier: string; items: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, p, b, bill] = await Promise.all([
        fetchIntelligenceHeatmap(projectId),
        fetchIntelligencePricingReport(projectId),
        fetchIntelligenceMarketBrief(),
        fetchIntelligenceBilling(),
      ]);
      setDistricts((h as { data?: HeatmapPoint[] }).data ?? []);
      const pData = (p as { data?: { avgPriceBand?: string; csv?: string } }).data;
      setPricingBand(pData?.avgPriceBand ?? '—');
      setCsvPreview((pData?.csv ?? '').split('\n').slice(0, 6).join('\n'));
      setBriefSummary((b as { data?: { summary?: string } }).data?.summary ?? '—');
      setBilling({
        mrr: bill.data.estimatedMrrVnd,
        tier: bill.data.billingTier,
        items: bill.data.lineItems.filter((l) => l.enabled).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải data intelligence');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DeveloperShell
      title="Data Intelligence"
      subtitle="Production · heatmap · pricing · billing · T5-S5 / T6-S2"
      screenTag="SCR-DEV-005+"
    >
      <Link to="/developer" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Developer hub
      </Link>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="text-sm px-3 py-1 rounded border"
          style={{ background: tab === 'overview' ? brand.secondary : brand.surface }}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className="text-sm px-3 py-1 rounded border"
          style={{ background: tab === 'billing' ? brand.secondary : brand.surface }}
          onClick={() => setTab('billing')}
        >
          Billing
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <label className="text-sm">
          <span style={{ color: brand.muted }}>Dự án</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
          >
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} className="text-sm px-3 py-1 rounded border">
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && tab === 'billing' && billing && (
        <div className={`${layout.kpiGrid} mb-4`}>
          <div className="wereal-card p-4">
            <p className="text-xs" style={{ color: brand.muted }}>
              MRR ước tính
            </p>
            <p className="wereal-kpi-value">{billing.mrr.toLocaleString('vi-VN')} ₫</p>
          </div>
          <div className="wereal-card p-4">
            <p className="text-xs" style={{ color: brand.muted }}>
              Tier
            </p>
            <p className="wereal-kpi-value text-lg">{billing.tier}</p>
          </div>
          <div className="wereal-card p-4">
            <p className="text-xs" style={{ color: brand.muted }}>
              Products active
            </p>
            <p className="wereal-kpi-value">{billing.items}</p>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="wereal-card p-4">
            <h2 className="font-semibold mb-3">Absorption heatmap</h2>
            <div className="space-y-2">
              {districts.slice(0, 8).map((d, i) => (
                <div key={d.code ?? i} className="flex items-center gap-2 text-sm">
                  <span className="w-20 truncate">{d.code ?? 'unit'}</span>
                  <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.round((d.intensity ?? 0.3) * 100)}%`,
                        background: brand.primary,
                      }}
                    />
                  </div>
                  <span style={{ color: brand.muted }}>{d.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wereal-card p-4">
            <h2 className="font-semibold mb-2">Pricing report</h2>
            <p className="text-sm mb-2">
              Band: <strong>{pricingBand}</strong>
            </p>
            <pre className="text-xs overflow-auto max-h-40 bg-slate-50 p-2 rounded whitespace-pre-wrap">
              {csvPreview || '—'}
            </pre>
          </section>

          <section className="wereal-card p-4 md:col-span-2">
            <h2 className="font-semibold mb-2">Market brief</h2>
            <p>{briefSummary}</p>
          </section>
        </div>
      )}
    </DeveloperShell>
  );
}
