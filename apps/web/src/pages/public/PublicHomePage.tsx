import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicBrand } from '../../context/PublicBrandContext';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { EmiCalculator } from '../../components/public/EmiCalculator';
import { HeroProjectStage } from '../../components/public/HeroProjectStage';
import { HomeSearchDock, type SearchIntent } from '../../components/public/HomeSearchDock';
import { ListingCard } from '../../components/public/ListingCard';
import { PostPropertyCta } from '../../components/public/PostPropertyCta';
import { PublicFooter } from '../../components/public/PublicFooter';
import { SectionKicker } from '../../components/public/SectionKicker';
import { TrustStrip } from '../../components/public/TrustStrip';
import { PublicTopBar } from '../../components/PublicTopBar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { NEWS_PLACEHOLDERS, districtPath, DISTRICTS } from '../../lib/districts';
import { FEATURED_PROJECT_IDS, slideFromProject, type HeroSlide } from '../../lib/featured-projects';
import { fetchProjectDetail, searchUnits, type SearchHit } from '../../lib/api';
import { brand } from '../../theme/tokens';

export function PublicHomePage() {
  const navigate = useNavigate();
  const publicBrand = usePublicBrand();
  const brandName = publicBrand?.displayName ?? 'Ngôi Nhà Hôm Nay';
  const [intent, setIntent] = useState<SearchIntent>('buy');
  const [q, setQ] = useState('');
  const [picks, setPicks] = useState<SearchHit[]>([]);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  usePageMeta({
    title: `${brandName} — Tìm căn hộ, dự án, giữ chỗ minh bạch`,
    description:
      'Marketplace bất động sản Việt Nam: tìm nhà theo quận, so sánh căn Verified, liên hệ tư vấn và giữ chỗ online.',
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      searchUnits({ limit: 6 }),
      Promise.all(
        FEATURED_PROJECT_IDS.map((id) => fetchProjectDetail(id).then(slideFromProject).catch(() => null)),
      ),
    ])
      .then(([res, featured]) => {
        if (!active) return;
        setPicks(res.data.slice(0, 6));
        setSlides(featured.filter((s): s is HeroSlide => s !== null && s.unitCount > 0));
      })
      .catch((e) => {
        if (active) setPicksError(e instanceof Error ? e.message : 'Không tải được gợi ý');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [slides.length]);

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

  return (
    <div className="min-h-screen flex flex-col nnhn-paper">
      <PublicTopBar />

      <HeroProjectStage
        slides={slides}
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

      <TrustStrip />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-14 w-full">
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

        {picksError && (
          <p className="text-sm rounded-xl p-4" style={{ background: brand.surface, color: brand.warning }}>
            {picksError}
          </p>
        )}

        {!picksError && picks.length === 0 && (
          <p className="text-sm rounded-xl p-6 nnhn-card">
            Chưa có căn hiển thị. Thử Tìm kiếm hoặc đăng nhập cổng đối tác.
          </p>
        )}

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

        <section className="mt-16">
          <PostPropertyCta />
        </section>

        <section className="mt-16 grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start">
          <div>
            <SectionKicker>Công cụ</SectionKicker>
            <h2 className="nnhn-display text-3xl mt-2" style={{ color: brand.ink }}>
              Công cụ mua nhà
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: brand.muted }}>
              Ước tính trả góp trước khi liên hệ tư vấn — lãi suất và thời hạn điều chỉnh được.
            </p>
          </div>
          <div className="nnhn-card p-5 sm:p-6">
            <EmiCalculator compact initialPrice={picks[0]?.attributes.basePrice} />
          </div>
        </section>

        <section className="mt-16">
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
            {DISTRICTS.map((d) => (
              <Link
                key={d.slug}
                to={districtPath(d.slug)}
                className="nnhn-card px-4 py-4 text-sm font-medium no-underline hover:border-[var(--brand-primary)]"
                style={{ color: brand.primaryDark }}
              >
                <span className="block nnhn-kicker mb-1" style={{ color: brand.clay }}>
                  {d.city}
                </span>
                {d.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionKicker>Góc nhìn</SectionKicker>
          <h2 className="nnhn-display text-3xl mt-2 mb-7" style={{ color: brand.ink }}>
            Tin & gợi ý
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {NEWS_PLACEHOLDERS.map((item, i) => (
              <article
                key={item.id}
                className="rounded-[1.5rem] p-6"
                style={{
                  background: i % 2 === 0 ? brand.surface : brand.primaryDark,
                  color: i % 2 === 0 ? brand.ink : '#F4EFE6',
                  border: i % 2 === 0 ? `1px solid ${brand.border}` : 'none',
                }}
              >
                <time className="text-xs opacity-70">{new Date(item.date).toLocaleDateString('vi-VN')}</time>
                <h3 className="nnhn-display text-xl mt-3 leading-snug">{item.title}</h3>
                <p className="text-sm mt-3 leading-relaxed opacity-80">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
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
