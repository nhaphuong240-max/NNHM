import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicBrand } from '../../context/PublicBrandContext';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { FeaturedProjectsRail } from '../../components/public/FeaturedProjectsRail';
import { HeroProjectStage } from '../../components/public/HeroProjectStage';
import { HomeSearchDock, type SearchIntent } from '../../components/public/HomeSearchDock';
import { HomepageDistrictGrid } from '../../components/public/HomepageDistrictGrid';
import { HomepageEmptyPicks } from '../../components/public/HomepageEmptyPicks';
import { HomepageNewsSection } from '../../components/public/HomepageNewsSection';
import { HomepageToolsSection } from '../../components/public/HomepageToolsSection';
import { ListingCard } from '../../components/public/ListingCard';
import { MapDiscoveryBanner } from '../../components/public/MapDiscoveryBanner';
import { PostPropertyCta } from '../../components/public/PostPropertyCta';
import { PublicFooter } from '../../components/public/PublicFooter';
import { QuickFilterChips } from '../../components/public/QuickFilterChips';
import { SectionKicker } from '../../components/public/SectionKicker';
import { TrendingSearchChips } from '../../components/public/TrendingSearchChips';
import { TrustStrip } from '../../components/public/TrustStrip';
import { PublicTopBar } from '../../components/PublicTopBar';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { HeroSlide } from '../../lib/featured-projects';
import { fetchHomepagePack, type HomepagePack, type SearchHit } from '../../lib/api';
import { brand } from '../../theme/tokens';

function toHeroSlides(projects: HomepagePack['featuredProjects']): HeroSlide[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    city: p.city,
    district: p.district,
    unitCount: p.unitCount,
    verifiedCount: p.verifiedCount,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    thumbnailUrl: p.thumbnailUrl,
    developer: p.developer,
    tagline: p.tagline,
    art: p.art,
  }));
}

export function PublicHomePage() {
  const navigate = useNavigate();
  const publicBrand = usePublicBrand();
  const brandName = publicBrand?.displayName ?? 'Ngôi Nhà Hôm Nay';
  const [intent, setIntent] = useState<SearchIntent>('buy');
  const [q, setQ] = useState('');
  const [pack, setPack] = useState<HomepagePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  usePageMeta({
    title: `${brandName} — Tìm căn hộ, dự án, giữ chỗ minh bạch`,
    description:
      'Marketplace bất động sản Việt Nam: tìm nhà theo quận, so sánh căn Verified, liên hệ tư vấn và giữ chỗ online.',
  });

  useEffect(() => {
    let active = true;
    fetchHomepagePack()
      .then((res) => {
        if (active) setPack(res.data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải trang chủ');
      });
    return () => {
      active = false;
    };
  }, []);

  const heroSlides = useMemo(
    () => (pack ? toHeroSlides(pack.featuredProjects) : []),
    [pack],
  );

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  function goSearch(query: string) {
    const params = new URLSearchParams();
    params.set('intent', intent);
    if (query.trim()) params.set('q', query.trim());
    navigate(`/public/search?${params.toString()}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goSearch(q);
  }

  const sections = pack?.config.sections;
  const picks = pack?.picks ?? [];

  return (
    <div className="min-h-screen flex flex-col nnhn-paper">
      <PublicTopBar />

      <HeroProjectStage
        slides={heroSlides}
        index={heroIndex}
        onIndex={setHeroIndex}
        brandName={brandName}
      />
      <HomeSearchDock
        intent={intent}
        onIntent={setIntent}
        q={q}
        onQ={setQ}
        onSubmit={onSubmit}
        onCity={goSearch}
      />

      {sections?.trending !== false && pack?.config.trending && (
        <TrendingSearchChips items={pack.config.trending} />
      )}

      <TrustStrip
        stats={
          pack?.stats.hasLiveListings
            ? { total: pack.stats.totalListings, verified: pack.stats.verifiedListings }
            : null
        }
        fallback={pack?.config.trustFallback}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-14 w-full">
        {error && (
          <p className="text-sm rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: brand.destructive }}>
            {error}
          </p>
        )}

        {sections?.picks !== false && (
          <>
            <div className="flex items-end justify-between gap-4 mb-7">
              <div>
                <SectionKicker>Bảng hàng</SectionKicker>
                <h2 className="nnhn-display text-3xl mt-2" style={{ color: brand.ink }}>
                  Gợi ý hôm nay
                </h2>
                <p className="text-sm mt-2" style={{ color: brand.muted }}>
                  Listing đã duyệt · có ảnh & Verified
                </p>
              </div>
              <Link to="/public/search" className="text-sm font-semibold" style={{ color: brand.primary }}>
                Xem tất cả
              </Link>
            </div>

            {picks.length === 0 ? (
              <HomepageEmptyPicks />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {picks.map((hit) => (
                  <ListingCard
                    key={hit.listingId ?? hit.id}
                    hit={hit}
                    layout="grid"
                    onContact={() => setContactHit(hit)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {sections?.projects !== false && pack && (
          <FeaturedProjectsRail projects={pack.featuredProjects} />
        )}

        {sections?.quickChips !== false && pack && (
          <QuickFilterChips chips={pack.config.quickChips} />
        )}

        <section className="mt-16">
          <PostPropertyCta />
        </section>

        {sections?.map !== false && pack && <MapDiscoveryBanner banner={pack.config.mapBanner} />}

        {sections?.tools !== false && (
          <HomepageToolsSection samplePrice={picks[0]?.attributes.basePrice} />
        )}

        {sections?.districts !== false && pack && <HomepageDistrictGrid districts={pack.districts} />}

        {sections?.news !== false && pack && <HomepageNewsSection items={pack.config.newsItems} />}
      </main>

      <PublicFooter />

      {contactHit && (
        <ContactLeadModal
          hit={contactHit}
          onClose={() => setContactHit(null)}
          onSuccess={() => setContactHit(null)}
        />
      )}
    </div>
  );
}
