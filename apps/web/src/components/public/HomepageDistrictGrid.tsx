import { Link } from 'react-router-dom';
import type { HomepageDistrictChip } from '../../lib/api';
import { districtPath } from '../../lib/districts';
import { brand } from '../../theme/tokens';
import { SectionKicker } from './SectionKicker';

type Props = {
  districts: HomepageDistrictChip[];
};

export function HomepageDistrictGrid({ districts }: Props) {
  if (districts.length === 0) return null;

  return (
    <section className="mt-16" data-testid="homepage-districts">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <SectionKicker>SEO quận</SectionKicker>
          <h2 className="nnhn-display text-3xl mt-2" style={{ color: brand.ink }}>
            Mua theo quận
          </h2>
        </div>
        <Link to="/public/search" className="text-sm font-semibold" style={{ color: brand.primary }}>
          SERP đầy đủ
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {districts.map((d) => (
          <Link
            key={d.id}
            to={districtPath(d.slug)}
            className="nnhn-card px-4 py-4 text-sm font-medium no-underline hover:border-[var(--brand-primary)]"
            style={{ color: brand.primaryDark }}
          >
            <span className="block nnhn-kicker mb-1" style={{ color: brand.clay }}>
              {d.city}
            </span>
            {d.label}
            {d.listingCount > 0 && (
              <span className="block text-xs mt-1 font-normal" style={{ color: brand.muted }}>
                {d.listingCount} căn
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
