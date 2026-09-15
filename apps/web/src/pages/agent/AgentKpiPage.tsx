import { useEffect, useState } from 'react';
import { AgentShell } from '../../components/AgentShell';
import { fetchCrmKpiWeekly, type CrmKpiPack } from '../../lib/api';
import { brand } from '../../theme/tokens';

function pct(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function KpiTile({
  label,
  value,
  target,
  ok,
}: {
  label: string;
  value: string | number;
  target?: string;
  ok?: boolean | null;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: brand.surface,
        border: `1px solid ${ok === true ? brand.success : ok === false ? brand.clay : brand.border}`,
      }}
    >
      <p className="text-xs" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: brand.primary }}>
        {value}
      </p>
      {target && (
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          Mục tiêu: {target}
        </p>
      )}
    </div>
  );
}

/** P0 §0.2(10) — KPI pack SRS §16 from real DB. */
export function AgentKpiPage() {
  const [kpi, setKpi] = useState<CrmKpiPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCrmKpiWeekly()
      .then((res) => setKpi(res.data.attributes))
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải KPI'))
      .finally(() => setLoading(false));
  }, []);

  const t = kpi?.targets;

  return (
    <AgentShell
      title="KPI Demand OS"
      subtitle="SRS §16 · dữ liệu thật · không mock"
      screenTag="SCR-AGENT-KPI"
    >
      {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải KPI…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {kpi && (
        <div className="space-y-8">
          {kpi.beachheadReady !== undefined && (
            <div
              className="rounded-2xl p-4 text-sm font-semibold"
              style={{
                background: kpi.beachheadReady ? '#ECFDF5' : '#FEF3C7',
                color: kpi.beachheadReady ? brand.success : brand.warning,
                border: `1px solid ${brand.border}`,
              }}
            >
              Beachhead gate: {kpi.beachheadReady ? 'PASS' : 'CHƯA ĐẠT'}
              {kpi.gatePassRate !== null && kpi.gatePassRate !== undefined && (
                <span className="font-normal ml-2">
                  ({Math.round(kpi.gatePassRate * 100)}% KPI đạt ngưỡng)
                </span>
              )}
            </div>
          )}

          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: brand.primaryDark }}>
              North Star
            </h2>
            <KpiTile
              label="Qualified viewing / tuần"
              value={kpi.northStarQualifiedViewingsPerWeek}
              target="Beachhead KPI chính"
            />
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: brand.primaryDark }}>
              Conversion & chất lượng
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiTile
                label="Zero-result rate"
                value={pct(kpi.zeroResultRate)}
                target={t ? `≤ ${pct(t.zeroResultRateMax, 0)}` : undefined}
                ok={
                  kpi.zeroResultRate !== null && t
                    ? kpi.zeroResultRate <= t.zeroResultRateMax
                    : null
                }
              />
              <KpiTile
                label="HOT first-touch rate"
                value={pct(kpi.hotFirstTouchRate)}
                target={t ? `P95 ≤ ${t.hotFirstTouchP95Minutes} phút` : undefined}
                ok={
                  kpi.hotFirstTouchRate !== null ? kpi.hotFirstTouchRate >= 0.8 : null
                }
              />
              <KpiTile
                label="Viewing show-up rate"
                value={pct(kpi.viewingShowUpRate)}
                target={t ? `≥ ${pct(t.viewingShowUpMin, 0)}` : undefined}
                ok={
                  kpi.viewingShowUpRate !== null && t
                    ? kpi.viewingShowUpRate >= t.viewingShowUpMin
                    : null
                }
              />
              <KpiTile
                label="Booking ↔ lead link"
                value={pct(kpi.bookingLeadLinkRate)}
                target={t ? '100%' : undefined}
                ok={
                  kpi.bookingLeadLinkRate !== null && t
                    ? kpi.bookingLeadLinkRate >= t.bookingLeadLinkMin
                    : null
                }
              />
              <KpiTile
                label="Listing freshness"
                value={pct(kpi.listingFreshnessRate)}
                target={t ? `≥ ${pct(t.listingFreshnessMin, 0)}` : undefined}
                ok={
                  kpi.listingFreshnessRate !== null && t
                    ? kpi.listingFreshnessRate >= t.listingFreshnessMin
                    : null
                }
              />
              <KpiTile label="Search submitted (all time)" value={kpi.searchSubmittedTotal} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: brand.primaryDark }}>
              Deal protection & tranh chấp
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <KpiTile label="Đăng ký ACTIVE" value={kpi.activeRegistrations} />
              <KpiTile label="Dispute OPEN" value={kpi.openDisputes} />
              <KpiTile label="Dispute CLOSED (7d)" value={kpi.closedDisputes7d} />
            </div>
          </section>

          {kpi.notes && (
            <p className="text-xs" style={{ color: brand.muted }}>
              Ghi chú: {kpi.notes.searchP95} · {kpi.notes.detailToContact}
            </p>
          )}
        </div>
      )}
    </AgentShell>
  );
}
