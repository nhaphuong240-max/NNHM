import { Link } from 'react-router-dom';
import type { HomepageTrendingItem } from '../../lib/api';
import { buildHomeSearchUrl } from '../../lib/homepage-search';
import { brand } from '../../theme/tokens';

type Props = {
  items: HomepageTrendingItem[];
  label?: string;
};

export function TrendingSearchChips({ items, label = 'Xu hướng tìm kiếm' }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-4" data-testid="trending-chips">
      <p className="text-xs font-semibold mb-2" style={{ color: brand.muted }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={`${item.label}-${item.district ?? item.q ?? ''}`}
            to={buildHomeSearchUrl(item)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold no-underline transition-colors hover:opacity-90"
            style={{
              background: brand.surface,
              color: brand.primaryDark,
              border: `1px solid ${brand.border}`,
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
