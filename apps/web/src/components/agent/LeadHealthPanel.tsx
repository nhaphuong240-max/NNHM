import { useEffect, useState } from 'react';
import { fetchLeadHealthExplain, type LeadHealthExplain } from '../../lib/api';
import { brand } from '../../theme/tokens';

type Props = {
  leadId: string;
};

/** P2 FR-LEAD-007b — explainable health score, no auto-reject */
export function LeadHealthPanel({ leadId }: Props) {
  const [health, setHealth] = useState<LeadHealthExplain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeadHealthExplain(leadId)
      .then((res) => {
        if (active) setHealth(res.data);
      })
      .catch(() => {
        if (active) setHealth(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [leadId]);

  if (loading) {
    return (
      <p className="text-xs" style={{ color: brand.muted }}>
        Đang tính health score…
      </p>
    );
  }
  if (!health) return null;

  return (
    <section
      className="rounded-xl p-5 space-y-3"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <p className="font-semibold">Health score (P2)</p>
      <p className="text-sm">
        <span className="font-bold text-lg">{health.healthScore}</span>
        <span className="text-xs ml-2" style={{ color: brand.muted }}>
          intent {health.intentScore} · {health.tier}
        </span>
      </p>
      <p className="text-xs rounded-lg p-2" style={{ background: '#ECFDF5', color: brand.success }}>
        {health.disclaimer}
      </p>
      <ul className="space-y-2 text-xs">
        {health.factors.map((f) => (
          <li
            key={f.key}
            className="rounded-lg p-2"
            style={{ background: brand.background, border: `1px solid ${brand.border}` }}
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium">{f.label}</span>
              <span className="tabular-nums font-bold">
                {f.score}/{f.maxScore}
              </span>
            </div>
            <p style={{ color: brand.muted }}>{f.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
