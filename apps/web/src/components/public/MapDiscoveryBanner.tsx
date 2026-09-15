import { Link } from 'react-router-dom';
import type { HomepageConfigPayload } from '../../lib/api';
import { brand } from '../../theme/tokens';

type Props = {
  banner: HomepageConfigPayload['mapBanner'];
};

export function MapDiscoveryBanner({ banner }: Props) {
  if (!banner.enabled) return null;

  return (
    <section className="mt-16" data-testid="map-discovery-banner">
      <Link
        to="/public/map"
        className="block rounded-2xl p-6 sm:p-8 no-underline overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.primary} 55%, ${brand.clay} 100%)`,
          color: '#F4EFE6',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Bản đồ</p>
        <h2 className="nnhn-display text-2xl sm:text-3xl mt-2 max-w-lg">{banner.title}</h2>
        <p className="text-sm mt-2 max-w-md opacity-90">{banner.subtitle}</p>
        <span
          className="inline-block mt-5 rounded-full px-5 py-2.5 text-sm font-bold"
          style={{ background: '#fff', color: brand.primaryDark }}
        >
          Mở bản đồ căn hộ →
        </span>
      </Link>
    </section>
  );
}
