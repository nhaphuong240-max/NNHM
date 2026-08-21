import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SearchHit } from '../../lib/api';
import { DISTRICT_FILTERS } from '../../lib/districts';
import { brand, formatPrice } from '../../theme/tokens';
import { ListingThumbnail } from './ListingThumbnail';
import { VerifiedBadge } from './VerifiedBadge';

export { DISTRICT_FILTERS };

type Props = {
  hit: SearchHit;
  onContact: () => void;
  compareSlot?: ReactNode;
  layout?: 'serp' | 'grid';
};

export function ListingCard({ hit, onContact, compareSlot, layout = 'serp' }: Props) {
  const { attributes: a } = hit;
  const location = [a.district, a.city].filter(Boolean).join(', ');

  if (layout === 'grid') {
    return (
      <article
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <Link to={`/public/units/${hit.id}`} className="block">
          <div className="h-36">
            <ListingThumbnail url={a.thumbnailUrl} alt={a.title} className="h-36 w-full" />
          </div>
        </Link>
        <div className="p-4 flex-1 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.muted }}>
            {a.projectId ? (
              <Link to={`/public/projects/${a.projectId}`} className="no-underline hover:underline" style={{ color: brand.primary }}>
                {a.projectName}
              </Link>
            ) : (
              a.projectName
            )}
            {location ? ` · ${location}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold leading-snug">{a.title}</h3>
            {a.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm" style={{ color: brand.muted }}>
            {a.bedrooms} PN · {a.area}m²
          </p>
          <p className="text-lg font-extrabold mt-auto" style={{ color: brand.primary }}>
            {formatPrice(a.basePrice)}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="flex-1 rounded-xl py-2.5 text-center text-sm font-bold text-white"
              style={{ background: brand.primary }}
              onClick={onContact}
            >
              Liên hệ
            </button>
            <Link
              to={`/auth/login?portal=agent&unitId=${hit.id}`}
              className="flex-1 rounded-xl py-2.5 text-center text-sm font-bold no-underline"
              style={{ background: brand.hover, color: brand.primaryDark }}
            >
              Giữ chỗ
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="rounded-xl transition-shadow hover:shadow-md overflow-hidden"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
    >
      <div className="grid sm:grid-cols-[200px_1fr] gap-4 p-4">
        <Link to={`/public/units/${hit.id}`} className="block">
          <ListingThumbnail url={a.thumbnailUrl} alt={a.title} />
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/public/units/${hit.id}`} className="font-semibold text-lg no-underline" style={{ color: brand.ink }}>
              {a.title}
            </Link>
            {a.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm" style={{ color: brand.muted }}>
            {a.projectId ? (
              <Link to={`/public/projects/${a.projectId}`} className="no-underline hover:underline" style={{ color: brand.primary }}>
                {a.projectName}
              </Link>
            ) : (
              a.projectName
            )}
            {' · '}{a.code} · {a.bedrooms} PN · {a.area}m²
            {location ? ` · ${location}` : ''}
          </p>
          <p className="text-xl font-bold" style={{ color: brand.primary }}>
            {formatPrice(a.basePrice)}
          </p>
          <div className="flex flex-wrap gap-2 mt-auto pt-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ background: brand.primary }}
              onClick={onContact}
            >
              Liên hệ
            </button>
            <Link
              to={`/auth/login?portal=agent&unitId=${hit.id}`}
              className="rounded-lg px-4 py-2 text-sm font-bold no-underline"
              style={{ background: brand.hover, color: brand.primaryDark }}
            >
              Giữ chỗ
            </Link>
            {compareSlot}
          </div>
        </div>
      </div>
    </article>
  );
}
