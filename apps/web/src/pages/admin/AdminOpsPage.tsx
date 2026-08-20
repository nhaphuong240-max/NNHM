import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from '../../components/AdminShell';
import { fetchOpsConsole, fetchOpsReadiness, type OpsReadinessSnapshot, type OpsWidget } from '../../lib/api';
import { brand } from '../../theme/tokens';

const RUNBOOK_NOTE: Record<OpsWidget['id'], string> = {
  stuckPayments: 'docs/runbooks/ops-console.md#stuck-payment',
  lockTtl: 'docs/runbooks/ops-console.md#lock-ttl',
  driftBlock: 'docs/runbooks/ops-console.md#drift-block',
  reconcileMismatch: 'docs/runbooks/ops-console.md#reconcile-mismatch',
};

function tone(severity: OpsWidget['severity']) {
  if (severity === 'alert') return { bg: '#FEF2F2', border: '#FECACA', count: brand.destructive };
  if (severity === 'warn') return { bg: '#FFF7ED', border: '#FED7AA', count: brand.warning };
  return { bg: brand.surface, border: brand.border, count: brand.success };
}

function WidgetCard({ widget }: { widget: OpsWidget }) {
  const colors = tone(widget.severity);
  return (
    <article
      id={widget.runbookAnchor}
      className="rounded-2xl p-5 space-y-3"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#334155' }}>
            {widget.title}
          </h2>
          <p className="text-xs mt-1" style={{ color: brand.muted }}>
            {widget.hint}
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums" style={{ color: colors.count }}>
          {widget.count}
        </p>
      </div>
      {widget.metrics ? (
        <p className="text-xs" style={{ color: brand.muted }}>
          {Object.entries(widget.metrics)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' · ')}
        </p>
      ) : null}
      {widget.items.length > 0 ? (
        <ul className="text-sm space-y-1">
          {widget.items.map((item) => (
            <li key={item.id} className="font-mono text-xs">
              {item.id} · {item.label}
              {item.detail ? ` · ${item.detail}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: brand.muted }}>
          Queue trống.
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={widget.deepLink} className="underline font-semibold" style={{ color: brand.primary }}>
          Mở queue
        </Link>
        <span style={{ color: brand.muted }}>Runbook: {RUNBOOK_NOTE[widget.id]}</span>
      </div>
    </article>
  );
}

export function AdminOpsPage() {
  const [widgets, setWidgets] = useState<OpsWidget[]>([]);
  const [readiness, setReadiness] = useState<OpsReadinessSnapshot | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetchOpsConsole();
    setWidgets(res.data.widgets);
    setHealthy(res.data.healthy);
    try {
      const ready = await fetchOpsReadiness();
      setReadiness(ready.data);
    } catch {
      setReadiness(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được ops console');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <AdminShell
      title="Ops console"
      subtitle="OPS-S3-01 / OPS-S6-01 · queues + G-OPS-4 readiness"
      screenTag="Admin / Ops Portal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm" style={{ color: brand.muted }}>
          {healthy === null
            ? 'Đang đọc queue…'
            : healthy
              ? '4 queue sạch — sẵn sàng G-OPS-1 (chữ ký người: docs/uat/UAT-OPS-pilot-human.md).'
              : 'Có hàng đợi cần xử lý trước khi ký G-OPS-1.'}
        </p>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          onClick={() => {
            setLoading(true);
            void load().finally(() => setLoading(false));
          }}
        >
          Refresh
        </button>
      </div>
      {loading && <p style={{ color: brand.muted }}>Đang tải 4 widget…</p>}
      {error && (
        <p className="rounded-lg p-3 text-sm mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {readiness && (
        <section
          className="rounded-xl p-4 mb-6 text-sm space-y-2"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
        >
          <h2 className="font-semibold">G-OPS-4 readiness (OPS-S6-01)</h2>
          <p style={{ color: brand.muted }}>
            Grafana:{' '}
            <a href={readiness.grafana.stagingUrl} className="underline" target="_blank" rel="noreferrer">
              {readiness.grafana.stagingUrl}
            </a>
            {readiness.grafana.alertsEnabled ? ' · alerts ON' : ' · alerts OFF'}
          </p>
          <p style={{ color: brand.muted }}>
            On-call: {readiness.onCall.roster} · {readiness.onCall.rosterDoc}
          </p>
          <p style={{ color: brand.muted }}>
            Incident drill:{' '}
            {readiness.incidentDrill.complete ? 'evidence ✓' : 'chưa có evidence'} ·{' '}
            {readiness.incidentDrill.script}
          </p>
        </section>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {widgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>
    </AdminShell>
  );
}
