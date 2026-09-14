import { useEffect, useState } from 'react';
import { fetchLocalityInsight, type LocalityInsight } from '../../lib/api';
import { brand } from '../../theme/tokens';

type Props = {
  slug?: string;
  district?: string;
};

/** P2 FR-MI-002 — grounded price/m² insight with source + date */
export function LocalityInsightPanel({ slug }: Props) {
  const [insight, setInsight] = useState<LocalityInsight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) {
      setInsight(null);
      return;
    }
    let active = true;
    setLoading(true);
    fetchLocalityInsight(slug)
      .then((res) => {
        if (active) setInsight(res.data);
      })
      .catch(() => {
        if (active) setInsight(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (!slug) return null;
  if (loading) {
    return (
      <p className="text-xs mt-2" style={{ color: brand.muted }}>
        Đang tải insight giá khu vực…
      </p>
    );
  }
  if (!insight || insight.sampleSize === 0) return null;

  return (
    <aside
      className="rounded-lg p-3 mt-3 text-xs"
      style={{ background: '#EFF6FF', border: `1px solid ${brand.border}` }}
    >
      <p className="font-semibold text-sm mb-1">Insight giá khu vực</p>
      <p>{insight.narrative}</p>
      <p className="mt-2" style={{ color: brand.muted }}>
        Nguồn: {insight.source} · n={insight.sampleSize}
      </p>
    </aside>
  );
}
