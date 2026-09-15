import { brand } from '../../theme/tokens';

type TrustItem = { value: string; label: string };

type Props = {
  stats?: { total: number; verified: number } | null;
  fallback?: { headline?: string; items: TrustItem[] };
};

export function TrustStrip({ stats, fallback }: Props) {
  const hasLive = stats && stats.total > 0;

  const items: TrustItem[] = hasLive
    ? [
        { value: `${stats!.verified}+`, label: 'căn Verified' },
        { value: String(stats!.total), label: 'listing bảng hàng' },
        { value: 'GR', label: 'Giá Golden Record' },
      ]
    : fallback?.items ?? [
        { value: 'GR', label: 'Giá minh bạch' },
        { value: '30s', label: 'Giữ chỗ online' },
        { value: 'PDPA', label: 'Consent chuẩn' },
      ];

  return (
    <div
      className="px-4 py-6"
      style={{ borderBottom: `1px solid ${brand.border}` }}
      data-testid="trust-strip"
    >
      {fallback?.headline && !hasLive && (
        <p className="text-center text-xs font-semibold mb-3" style={{ color: brand.muted }}>
          {fallback.headline}
        </p>
      )}
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
