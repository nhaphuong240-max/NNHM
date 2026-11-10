import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import { fetchAnchorDashboard, type AnchorDashboardData } from '../../lib/api';
import { brand, layout, semantic } from '../../theme/tokens';

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="wereal-card p-4">
      <p className="text-xs uppercase tracking-wide" style={{ color: brand.muted }}>
        {label}
      </p>
      <p className="wereal-kpi-value mt-1">{value}</p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: brand.muted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function DeveloperAnchorPage() {
  const [data, setData] = useState<AnchorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAnchorDashboard();
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải anchor dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trust = data?.trustScores?.[0]?.score ?? 0;
  const pilotClass = data?.profile?.pilotClass ?? 'SYNTHETIC';

  return (
    <DeveloperShell
      title="Anchor Network Dashboard"
      subtitle="Trust score · GMV · onboarding · T5-S1 / T7-S6"
      screenTag="SCR-DEV-001 · Anchor"
    >
      <Link to="/developer" className="text-sm underline mb-4 inline-block" style={{ color: brand.primary }}>
        ← Developer hub
      </Link>

      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data && !loading && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                background: pilotClass === 'LIVE' ? semantic.verified.bg : semantic.pending.bg,
                color: pilotClass === 'LIVE' ? semantic.verified.text : semantic.pending.text,
              }}
            >
              {pilotClass}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
              {data.profile.displayName}
            </span>
          </div>

          <div className={`${layout.kpiGrid} mb-6`}>
            <Kpi label="Trust score" value={trust} hint={`min ${data.profile.trustScoreMin}`} />
            <Kpi label="GMV deposited" value={data.gmv.depositedBookings} />
            <Kpi label="Total bookings" value={data.gmv.totalBookings} />
            <Kpi
              label="Onboarding"
              value={data.onboardingChecklist?.ready ? 'Ready' : 'In progress'}
            />
          </div>

          {data.onboardingChecklist && (
            <section className="wereal-card p-4 mb-4">
              <h2 className="font-semibold mb-3">Onboarding checklist</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.onboardingChecklist.steps).map(([key, done]) => (
                  <li key={key} className="flex justify-between gap-4">
                    <span>{key}</span>
                    <span style={{ color: done ? brand.success : brand.warning }}>
                      {done ? '✓' : '○'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="wereal-card p-4">
            <h2 className="font-semibold mb-2">OP-WIN readiness</h2>
            <p className="text-sm" style={{ color: brand.muted }}>
              GR trust: {data.opWinChecklist.grTrustScore ? 'PASS' : 'OPEN'} · GMV live:{' '}
              {data.opWinChecklist.gmvLive ? 'PASS' : 'OPEN'}
            </p>
          </section>
        </>
      )}
    </DeveloperShell>
  );
}
