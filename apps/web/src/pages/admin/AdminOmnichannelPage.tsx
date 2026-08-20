import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchOmnichannelDashboard, type OmnichannelDashboardData } from '../../lib/api';
import { brand, formatPercent } from '../../theme/tokens';

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: accent ?? '#334155' }}>
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

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    PROCESSED: { bg: '#DCFCE7', text: brand.success },
    FAILED: { bg: '#FEE2E2', text: brand.destructive },
    DUPLICATE: { bg: '#FEF3C7', text: brand.warning },
    PROCESSING: { bg: '#EFF6FF', text: brand.primary },
    SENT: { bg: '#DCFCE7', text: brand.success },
    QUEUED: { bg: '#F1F5F9', text: brand.muted },
  };
  const c = colors[status] ?? { bg: brand.background, text: brand.muted };
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

function ChannelPanel({
  title,
  emoji,
  stats,
  connectedLabel,
  connectedCount,
  bindings,
  extra,
  configureHref,
}: {
  title: string;
  emoji: string;
  stats: {
    processed: number;
    failed: number;
    duplicate: number;
    processing: number;
    last24h: number;
    last7d: number;
    successRate: number;
  };
  connectedLabel: string;
  connectedCount: number;
  bindings: { id: string; label: string; sub: string }[];
  extra?: React.ReactNode;
  configureHref: string;
}) {
  return (
    <section
      className="rounded-xl p-5 space-y-4"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {emoji} {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: brand.muted }}>
            {connectedCount} {connectedLabel} · success {formatPercent(stats.successRate)}
          </p>
        </div>
        <Link to={configureHref} className="text-xs underline shrink-0" style={{ color: brand.primary }}>
          Cấu hình →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div>
          <p className="text-xs" style={{ color: brand.muted }}>
            Synced
          </p>
          <p className="font-bold tabular-nums">{stats.processed}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: brand.muted }}>
            Failed
          </p>
          <p className="font-bold tabular-nums" style={{ color: brand.destructive }}>
            {stats.failed}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: brand.muted }}>
            Dedup
          </p>
          <p className="font-bold tabular-nums">{stats.duplicate}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: brand.muted }}>
            24h / 7d
          </p>
          <p className="font-bold tabular-nums">
            {stats.last24h} / {stats.last7d}
          </p>
        </div>
      </div>

      {extra}

      {bindings.length > 0 && (
        <ul className="space-y-1 text-xs font-mono">
          {bindings.map((b) => (
            <li key={b.id} className="flex justify-between gap-2">
              <span>{b.label}</span>
              <span style={{ color: brand.muted }}>{b.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function AdminOmnichannelPage() {
  const [data, setData] = useState<OmnichannelDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchOmnichannelDashboard();
    setData(res.data);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được omnichannel');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const attrs = data?.attributes;
  const attrTotal =
    (attrs?.crmAttribution.metaLeads ?? 0) +
    (attrs?.crmAttribution.zaloLeads ?? 0) +
    (attrs?.crmAttribution.otherLeads ?? 0);

  return (
    <AdminShell
      title="Unified Omnichannel"
      subtitle="UC-CRM-05 · BR-05 dedup + route · Meta + Zalo gom một hub"
      screenTag="Admin / SCR-ADMIN-010"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin" className="underline" style={{ color: brand.primary }}>
          ← Dashboard
        </Link>
        <Link to="/agent/pipeline" className="underline" style={{ color: brand.muted }}>
          Agent pipeline
        </Link>
      </div>

      {loading && <p style={{ color: brand.muted }}>Đang tải stats…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {attrs && (
        <div className="space-y-8">
          <section
            className="rounded-xl p-5"
            style={{
              background: attrs.summary.opWin07Pass ? '#ECFDF5' : '#FEF3C7',
              border: `1px solid ${attrs.summary.opWin07Pass ? brand.success : brand.warning}`,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: brand.muted }}>
                  OP-WIN-07 · UC-CRM-05 ingest SLA
                </p>
                <h2 className="text-lg font-bold mt-1">
                  p95 ingest{' '}
                  {attrs.summary.latency.p95Ms !== null
                    ? `${attrs.summary.latency.p95Ms}ms`
                    : '—'}
                  <span className="text-sm font-normal ml-2" style={{ color: brand.muted }}>
                    / target &lt; {attrs.summary.latency.slaTargetMs / 1000}s
                  </span>
                </h2>
              </div>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: attrs.summary.opWin07Pass ? brand.success : brand.warning,
                  color: '#fff',
                }}
              >
                {attrs.summary.opWin07Pass ? 'SLA PASS' : 'SLA WATCH'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
              <div>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Samples (7d)
                </p>
                <p className="font-bold tabular-nums">{attrs.summary.latency.sampleCount}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: brand.muted }}>
                  p50
                </p>
                <p className="font-bold tabular-nums">
                  {attrs.summary.latency.p50Ms ?? '—'}ms
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Meta p95
                </p>
                <p className="font-bold tabular-nums">{attrs.meta.latency?.p95Ms ?? '—'}ms</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: brand.muted }}>
                  Zalo p95
                </p>
                <p className="font-bold tabular-nums">{attrs.zalo.latency?.p95Ms ?? '—'}ms</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4" style={{ color: brand.primary }}>
              Tổng hợp kênh
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Leads synced" value={attrs.summary.totalSynced} hint="Meta + Zalo PROCESSED" />
              <KpiCard
                label="Success rate"
                value={formatPercent(attrs.summary.successRate)}
                hint="Synced / (synced + failed)"
                accent={brand.success}
              />
              <KpiCard
                label="CRM từ kênh"
                value={attrs.summary.crmLeadsFromChannels}
                hint="META_LEAD + ZALO_OA"
              />
              <KpiCard
                label="Hoạt động 24h"
                value={attrs.summary.last24h}
                hint={`7 ngày: ${attrs.summary.last7d}`}
              />
            </div>
            <p className="text-xs mt-3" style={{ color: brand.muted }}>
              Duplicate bị chặn BR-05: {attrs.summary.totalDuplicate} · Failed: {attrs.summary.totalFailed}
            </p>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChannelPanel
              title="Meta Lead Ads"
              emoji="📘"
              stats={attrs.meta}
              connectedLabel="page"
              connectedCount={attrs.meta.pagesConnected}
              bindings={attrs.meta.pages.map((p) => ({
                id: p.id,
                label: p.pageName,
                sub: p.pageId,
              }))}
              configureHref="/admin/integrations/meta"
            />
            <ChannelPanel
              title="Zalo OA / ZNS"
              emoji="💬"
              stats={attrs.zalo}
              connectedLabel="OA"
              connectedCount={attrs.zalo.oasConnected}
              bindings={attrs.zalo.oas.map((o) => ({
                id: o.id,
                label: o.oaName,
                sub: o.hasToken ? `${o.oaId} · token ✓` : o.oaId,
              }))}
              configureHref="/admin/integrations/zalo"
              extra={
                <div className="flex gap-4 text-sm pt-1 border-t" style={{ borderColor: brand.border }}>
                  <span>
                    ZNS sent: <strong>{attrs.zalo.znsSent}</strong>
                  </span>
                  <span style={{ color: brand.destructive }}>
                    ZNS failed: <strong>{attrs.zalo.znsFailed}</strong>
                  </span>
                </div>
              }
            />
          </div>

          <section
            className="rounded-xl p-5"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h3 className="font-semibold mb-4">CRM attribution (nguồn lead)</h3>
            <div className="space-y-2">
              {(
                [
                  ['META_LEAD', attrs.crmAttribution.metaLeads, '#1877F2'],
                  ['ZALO_OA', attrs.crmAttribution.zaloLeads, '#0068FF'],
                  ['Khác', attrs.crmAttribution.otherLeads, brand.muted],
                ] as const
              ).map(([label, count, color]) => {
                const width = attrTotal > 0 ? Math.max(4, Math.round((count / attrTotal) * 100)) : 0;
                return (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0" style={{ color: brand.muted }}>
                      {label}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: brand.border }}>
                      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                    </div>
                    <span className="w-8 text-right font-mono tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6">
            <section
              className="lg:col-span-2 rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold mb-4">Unified sync feed</h3>
              {attrs.recentSync.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Chưa có webhook event. Dùng simulate tại trang Meta/Zalo.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: brand.muted }}>
                        <th className="pb-2 pr-3">Thời gian</th>
                        <th className="pb-2 pr-3">Kênh</th>
                        <th className="pb-2 pr-3">External ID</th>
                        <th className="pb-2 pr-3">Status</th>
                        <th className="pb-2 pr-3">SLA ms</th>
                        <th className="pb-2">CRM lead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attrs.recentSync.map((row) => (
                        <tr key={row.id} className="border-t" style={{ borderColor: brand.border }}>
                          <td className="py-2 pr-3 whitespace-nowrap text-xs">{formatTs(row.createdAt)}</td>
                          <td className="py-2 pr-3 font-medium">{row.channel}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{row.externalId}</td>
                          <td className="py-2 pr-3">{statusBadge(row.status)}</td>
                          <td className="py-2 pr-3 font-mono text-xs tabular-nums">
                            {row.slaMs ?? row.ingestMs ?? '—'}
                          </td>
                          <td className="py-2">
                            {row.leadId ? (
                              <Link
                                to={`/agent/leads/${encodeURIComponent(row.leadId)}`}
                                className="font-mono text-xs underline"
                                style={{ color: brand.primary }}
                              >
                                {row.leadId}
                              </Link>
                            ) : (
                              <span style={{ color: brand.muted }}>—</span>
                            )}
                            {row.lastError && (
                              <p className="text-[10px] mt-0.5 truncate max-w-[12rem]" style={{ color: brand.destructive }}>
                                {row.lastError}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              className="rounded-xl p-5"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <h3 className="font-semibold mb-4">ZNS gần đây</h3>
              {attrs.recentZns.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Chưa có ZNS outbound.
                </p>
              ) : (
                <ul className="space-y-3 text-xs">
                  {attrs.recentZns.map((z) => (
                    <li key={z.id} className="border-b pb-2" style={{ borderColor: brand.border }}>
                      <div className="flex justify-between gap-2">
                        <span className="font-mono">{z.templateId}</span>
                        {statusBadge(z.status)}
                      </div>
                      <p className="mt-1" style={{ color: brand.muted }}>
                        {z.phone} · {formatTs(z.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="grid sm:grid-cols-2 gap-3">
            <Link
              to="/admin/integrations/meta"
              className="rounded-xl p-4 text-center font-semibold text-white"
              style={{ background: '#1877F2' }}
            >
              Meta simulate / TC-21 →
            </Link>
            <Link
              to="/admin/integrations/zalo"
              className="rounded-xl p-4 text-center font-semibold text-white"
              style={{ background: '#0068FF' }}
            >
              Zalo simulate / ZNS →
            </Link>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
