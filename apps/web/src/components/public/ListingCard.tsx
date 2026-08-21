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
      <article className="nnhn-card overflow-hidden flex flex-col group">
        <Link to={`/public/units/${hit.id}`} className="block relative">
          <div className="h-44 overflow-hidden">
            <ListingThumbnail
              url={a.thumbnailUrl}
              alt={a.title}
              className="h-44 w-full transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
          <span
            className="absolute bottom-3 left-3 nnhn-display text-lg px-2.5 py-1 rounded-md"
            style={{ background: brand.surface, color: brand.primaryDark }}
          >
            {formatPrice(a.basePrice)}
          </span>
        </Link>
        <div className="p-4 flex-1 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.muted }}>
            {a.projectId ? (
              <Link
                to={`/public/projects/${a.projectId}`}
                className="no-underline hover:underline"
                style={{ color: brand.primary }}
              >
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
          <div className="flex gap-2 mt-auto pt-2">
            <button
              type="button"
              className="flex-1 rounded-full py-2.5 text-center text-sm font-bold text-white"
              style={{ background: brand.primary }}
              onClick={onContact}
            >
              Liên hệ
            </button>
            <Link
              to={`/auth/login?portal=agent&unitId=${hit.id}`}
              className="flex-1 rounded-full py-2.5 text-center text-sm font-bold no-underline"
              style={{ background: brand.claySoft, color: brand.clay }}
            >
              Giữ chỗ
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="nnhn-card overflow-hidden">
      <div className="grid sm:grid-cols-[220px_1fr] gap-4 p-3 sm:p-4">
        <Link to={`/public/units/${hit.id}`} className="block relative">
          <ListingThumbnail url={a.thumbnailUrl} alt={a.title} className="aspect-video sm:aspect-[4/3] rounded-xl" />
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/public/units/${hit.id}`}
              className="font-semibold text-lg no-underline"
              style={{ color: brand.ink }}
            >
              {a.title}
            </Link>
            {a.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm" style={{ color: brand.muted }}>
            {a.projectId ? (
              <Link
                to={`/public/projects/${a.projectId}`}
                className="no-underline hover:underline"
                style={{ color: brand.primary }}
              >
                {a.projectName}
              </Link>
            ) : (
              a.projectName
            )}
            {' · '}
            {a.code} · {a.bedrooms} PN · {a.area}m²
            {location ? ` · ${location}` : ''}
          </p>
          <p className="nnhn-display text-2xl" style={{ color: brand.primaryDark }}>
            {formatPrice(a.basePrice)}
          </p>
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: brand.primary }}
              onClick={onContact}
            >
              Liên hệ
            </button>
            <Link
              to={`/auth/login?portal=agent&unitId=${hit.id}`}
              className="rounded-full px-4 py-2 text-sm font-bold no-underline"
              style={{ background: brand.claySoft, color: brand.clay }}
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
