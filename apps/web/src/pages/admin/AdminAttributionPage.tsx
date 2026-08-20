import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchAttributionReport, type AttributionReportData } from '../../lib/api';
import { brand } from '../../theme/tokens';

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function pct(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function AdminAttributionPage() {
  const [data, setData] = useState<AttributionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAttributionReport();
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải attribution');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attrs = data?.attributes;
  const maxSource = Math.max(1, ...(attrs?.bySource.map((r) => r.leads) ?? [1]));
  const maxCampaign = Math.max(1, ...(attrs?.byCampaign.map((r) => r.leads) ?? [1]));

  return (
    <AdminShell
      title="Báo cáo Attribution"
      subtitle="UC-AN-04 · SCR-ADMIN-AN-004 · utm_campaign / campaign_id trên Lead"
      screenTag="Admin / Analytics"
    >
      <Link to="/admin" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Dashboard
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải attribution…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="space-y-8">
          <p className="text-xs" style={{ color: brand.muted }}>
            Kỳ: {formatTs(attrs.period.from)} → {formatTs(attrs.period.to)} (mặc định 30 ngày)
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Tổng lead
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums">{attrs.totalLeads}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Lead có attribution
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums">{attrs.attributedLeads}</p>
              <p className="text-xs mt-1" style={{ color: brand.muted }}>
                utm_campaign hoặc campaign_id
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ background: '#EFF6FF', border: `1px solid ${brand.primary}` }}
            >
              <p className="text-xs uppercase" style={{ color: brand.muted }}>
                Tỷ lệ attribution
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: brand.primary }}>
                {pct(attrs.attributionRate)}
              </p>
            </div>
          </div>

          {attrs.bySource.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold mb-4">Theo nguồn (source)</h3>
              <div className="space-y-3">
                {attrs.bySource.map((row) => (
                  <div key={row.source} className="text-sm">
                    <div className="flex justify-between mb-1 gap-2">
                      <span className="font-mono text-xs">{row.source}</span>
                      <span className="tabular-nums shrink-0">
                        {row.leads} · {pct(row.share)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, Math.round((row.leads / maxSource) * 100))}%`,
                          background: brand.primary,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {attrs.byCampaign.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold mb-4">Theo campaign</h3>
              <div className="space-y-3">
                {attrs.byCampaign.map((row) => (
                  <div key={row.campaignKey} className="text-sm">
                    <div className="flex justify-between mb-1 gap-2">
                      <span>
                        <span className="font-mono text-xs">{row.campaignKey}</span>
                        {row.utmCampaign && row.campaignId && row.utmCampaign !== row.campaignId && (
                          <span className="text-xs ml-2" style={{ color: brand.muted }}>
                            utm: {row.utmCampaign}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {row.leads} · {pct(row.share)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(8, Math.round((row.leads / maxCampaign) * 100))}%`,
                          background: '#0F766E',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-4">Source × Campaign (top 25)</h3>
            {attrs.bySourceCampaign.length === 0 ? (
              <p className="text-sm" style={{ color: brand.muted }}>
                Chưa có lead có utm_campaign / campaign_id trong kỳ. Thử URL public:{' '}
                <code className="text-xs">?utm_campaign=q7_launch</code>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ color: brand.muted }}>
                    <th className="pb-2">Source</th>
                    <th className="pb-2">UTM campaign</th>
                    <th className="pb-2">Campaign ID</th>
                    <th className="pb-2 text-right">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {attrs.bySourceCampaign.map((row, idx) => (
                    <tr
                      key={`${row.source}-${row.campaignId ?? row.utmCampaign ?? idx}`}
                      className="border-t"
                      style={{ borderColor: brand.border }}
                    >
                      <td className="py-2 font-mono text-xs">{row.source}</td>
                      <td className="py-2 font-mono text-xs">{row.utmCampaign ?? '—'}</td>
                      <td className="py-2 font-mono text-xs">{row.campaignId ?? '—'}</td>
                      <td className="py-2 tabular-nums text-right">{row.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
