import { Link } from 'react-router-dom';
import type { HomepageTrendingItem } from '../../lib/api';
import { buildHomeSearchUrl } from '../../lib/homepage-search';
import { brand } from '../../theme/tokens';
import { SectionKicker } from './SectionKicker';

type Props = {
  chips: HomepageTrendingItem[];
};

export function QuickFilterChips({ chips }: Props) {
  if (chips.length === 0) return null;

  return (
    <section className="mt-16" data-testid="quick-filter-chips">
      <SectionKicker>Mua nhanh</SectionKicker>
      <h2 className="nnhn-display text-3xl mt-2 mb-4" style={{ color: brand.ink }}>
        Lọc theo PN & ngân sách
      </h2>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            to={buildHomeSearchUrl(chip)}
            className="rounded-full px-4 py-2 text-sm font-semibold no-underline"
            style={{ background: brand.primary, color: '#fff' }}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
