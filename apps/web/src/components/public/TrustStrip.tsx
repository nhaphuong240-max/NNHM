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

  const items = [
    { value: `${stats.verified}+`, label: 'căn Verified' },
    { value: String(stats.total), label: 'listing bảng hàng' },
    { value: 'GR', label: 'Giá Golden Record' },
  ];

  return (
    <div
      className="px-4 py-6"
      style={{ borderBottom: `1px solid ${brand.border}` }}
      data-testid="trust-strip"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <p className="nnhn-display text-2xl sm:text-3xl" style={{ color: brand.primaryDark }}>
              {item.value}
            </p>
            <p className="text-xs sm:text-sm mt-1" style={{ color: brand.muted }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
