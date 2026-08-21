import { useEffect, useState } from 'react';
import { fetchSearchStats } from '../../lib/api';
import { brand } from '../../theme/tokens';

export function TrustStrip() {
  const [stats, setStats] = useState<{ total: number; verified: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetchSearchStats()
      .then((res) => {
        if (active) {
          setStats({
            total: res.data.totalListings,
            verified: res.data.verifiedListings,
          });
        }
      })
      .catch(() => {
        /* optional strip — hide on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!stats || stats.total === 0) return null;

  return (
    <div
      className="border-y px-4 py-3 text-sm"
      style={{ background: brand.surface, borderColor: brand.border, color: brand.ink }}
      data-testid="trust-strip"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center">
        <span>
          <strong style={{ color: brand.primary }}>{stats.verified}+</strong> căn Verified
        </span>
        <span className="hidden sm:inline" style={{ color: brand.border }}>
          ·
        </span>
        <span>
          <strong>{stats.total}</strong> listing trên bảng hàng
        </span>
        <span className="hidden sm:inline" style={{ color: brand.border }}>
          ·
        </span>
        <span style={{ color: brand.muted }}>Giá Golden Record · Anti-drift</span>
      </div>
    </div>
  );
}
