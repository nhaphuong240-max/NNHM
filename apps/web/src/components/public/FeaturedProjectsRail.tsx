import { Link } from 'react-router-dom';
import type { HomepageFeaturedProject } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media-cdn';
import { brand, formatPrice } from '../../theme/tokens';
import { SectionKicker } from './SectionKicker';

type Props = {
  projects: HomepageFeaturedProject[];
};

export function FeaturedProjectsRail({ projects }: Props) {
  if (projects.length === 0) return null;

  return (
    <section className="mt-16" data-testid="featured-projects-rail">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <SectionKicker>Dự án</SectionKicker>
          <h2 className="nnhn-display text-3xl mt-2" style={{ color: brand.ink }}>
            Dự án nổi bật
          </h2>
        </div>
        <Link to="/public/search?intent=project" className="text-sm font-semibold" style={{ color: brand.primary }}>
          Tất cả dự án
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/public/projects/${encodeURIComponent(p.id)}`}
            className="snap-start shrink-0 w-[min(100%,280px)] rounded-2xl overflow-hidden no-underline nnhn-card"
          >
            <div className="aspect-[4/3] relative" style={{ background: brand.background }}>
              {p.thumbnailUrl ? (
                <img
                  src={resolveMediaUrl(p.thumbnailUrl) ?? undefined}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-end p-4 text-white text-sm font-semibold"
                  style={{ background: `linear-gradient(135deg, ${brand.primaryDark}, ${brand.primary})` }}
                >
                  {p.name}
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs" style={{ color: brand.muted }}>
                {p.developer} · {p.district}, {p.city}
              </p>
              <h3 className="font-bold mt-1" style={{ color: brand.primaryDark }}>
                {p.name}
              </h3>
              <p className="text-xs mt-2 line-clamp-2" style={{ color: brand.muted }}>
                {p.tagline}
              </p>
              <p className="text-sm font-semibold mt-3 tabular-nums" style={{ color: brand.primary }}>
                {p.unitCount > 0
                  ? `${p.unitCount} căn · từ ${formatPrice(p.minPrice)}`
                  : 'Sắp mở bán — xem chi tiết'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
