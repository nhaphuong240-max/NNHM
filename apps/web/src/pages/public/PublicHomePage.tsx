import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicBrand } from '../../context/PublicBrandContext';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { EmiCalculator } from '../../components/public/EmiCalculator';
import { ListingCard } from '../../components/public/ListingCard';
import { PostPropertyCta } from '../../components/public/PostPropertyCta';
import { PublicFooter } from '../../components/public/PublicFooter';
import { TrustStrip } from '../../components/public/TrustStrip';
import { PublicTopBar } from '../../components/PublicTopBar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { brandPrimary, brandPrimaryDark } from '../../lib/apply-brand-theme';
import { NEWS_PLACEHOLDERS, districtPath, DISTRICTS } from '../../lib/districts';
import { fetchSearchStats, searchUnits, type SearchHit } from '../../lib/api';
import { brand } from '../../theme/tokens';

const INTENTS = [
  { id: 'buy', label: 'Mua' },
  { id: 'rent', label: 'Thuê' },
  { id: 'project', label: 'Dự án' },
] as const;

const CITIES = [
  { label: 'Hà Nội', q: 'Hà Nội' },
  { label: 'TP.HCM', q: 'HCM' },
  { label: 'Đà Nẵng', q: 'Đà Nẵng' },
] as const;

export function PublicHomePage() {
  const navigate = useNavigate();
  const publicBrand = usePublicBrand();
  const heroBg = brandPrimary(publicBrand);
  const heroDark = brandPrimaryDark(publicBrand);
  const brandName = publicBrand?.displayName ?? 'Ngôi Nhà Hôm Nay';
  const [intent, setIntent] = useState<(typeof INTENTS)[number]['id']>('buy');
  const [q, setQ] = useState('');
  const [picks, setPicks] = useState<SearchHit[]>([]);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);
  const [stats, setStats] = useState<{ total: number; verified: number } | null>(null);

  usePageMeta({
    title: `${brandName} — Tìm căn hộ, dự án, giữ chỗ minh bạch`,
    description:
      'Marketplace bất động sản Việt Nam: tìm nhà theo quận, so sánh căn Verified, liên hệ tư vấn và giữ chỗ online.',
  });

  useEffect(() => {
    let active = true;
    Promise.all([searchUnits({ limit: 6 }), fetchSearchStats()])
      .then(([res, statRes]) => {
        if (!active) return;
        setPicks(res.data.slice(0, 6));
        setStats({ total: statRes.data.totalListings, verified: statRes.data.verifiedListings });
      })
      .catch((e) => {
        if (active) setPicksError(e instanceof Error ? e.message : 'Không tải được gợi ý');
      });
    return () => {
      active = false;
    };
  }, []);

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
    <div className="min-h-screen flex flex-col" style={{ background: brand.background }}>
      <PublicTopBar />

      <section className="px-4 py-12 lg:py-16" style={{ background: heroBg, color: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            {brandName}
          </h1>
          <p className="mt-3 max-w-xl text-sm opacity-85">
            Giá Golden Record · so sánh căn · giữ chỗ. Bắt đầu bằng khu vực hoặc dự án.
          </p>
          {stats && stats.total > 0 && (
            <p className="mt-2 text-sm font-semibold" style={{ color: brand.hover }}>
              {stats.verified}+ căn Verified · {stats.total} listing trên bảng hàng
            </p>
          )}

          <div className="mt-8 max-w-3xl">
            <div className="flex gap-1 mb-0">
              {INTENTS.map((tab) => {
                const active = intent === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className="rounded-t-xl px-4 py-2 text-sm font-semibold"
                    style={{
                      background: active ? '#fff' : 'rgba(255,255,255,0.16)',
                      color: active ? brand.primaryDark : '#fff',
                    }}
                    onClick={() => setIntent(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <form
              onSubmit={onSubmit}
              className="flex flex-col sm:flex-row overflow-hidden rounded-b-xl rounded-tr-xl"
              style={{ background: '#fff' }}
            >
              <label className="sr-only" htmlFor="home-search">
                Tìm khu vực, dự án
              </label>
              <input
                id="home-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Khu vực, dự án, chủ đầu tư"
                className="flex-1 px-4 py-3.5 text-sm outline-none"
                style={{ color: brand.ink }}
              />
              <button
                type="submit"
                className="px-6 py-3.5 text-sm font-bold text-white"
                style={{ background: heroDark }}
              >
                Tìm kiếm
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITIES.map((city) => (
                <button
                  key={city.label}
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.16)' }}
                  onClick={() => goSearch(city.q)}
                >
                  {city.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: brand.ink }}>
              Gợi ý hôm nay
            </h2>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              Listing đã duyệt trên bảng hàng · có ảnh & Verified
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
          <p className="text-sm rounded-xl p-6" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            Chưa có căn hiển thị. Thử Tìm kiếm hoặc đăng nhập cổng đối tác.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {picks.map((hit) => (
            <ListingCard
              key={hit.listingId ?? hit.id}
              hit={hit}
              layout="grid"
              onContact={() => setContactHit(hit)}
            />
          ))}
        </div>

        <section className="mt-14">
          <PostPropertyCta />
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold mb-2" style={{ color: brand.ink }}>
            Công cụ mua nhà
          </h2>
          <p className="text-sm mb-5" style={{ color: brand.muted }}>
            Ước tính trả góp trước khi liên hệ tư vấn — lãi suất và thời hạn điều chỉnh được.
          </p>
          <EmiCalculator compact initialPrice={picks[0]?.attributes.basePrice} />
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 className="text-xl font-bold" style={{ color: brand.ink }}>
              Mua theo quận
            </h2>
            <Link to="/public/search" className="text-sm font-semibold" style={{ color: brand.primary }}>
              SERP đầy đủ
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {DISTRICTS.map((d) => (
              <Link
                key={d.slug}
                to={districtPath(d.slug)}
                className="rounded-full px-4 py-2 text-sm font-medium no-underline"
                style={{ background: brand.surface, border: `1px solid ${brand.border}`, color: brand.primaryDark }}
              >
                {d.label}, {d.city}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-bold mb-5" style={{ color: brand.ink }}>
            Tin & gợi ý
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {NEWS_PLACEHOLDERS.map((item) => (
              <article
                key={item.id}
                className="rounded-xl p-5"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <time className="text-xs" style={{ color: brand.muted }}>
                  {new Date(item.date).toLocaleDateString('vi-VN')}
                </time>
                <h3 className="font-bold mt-2 leading-snug">{item.title}</h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: brand.muted }}>
                  {item.excerpt}
                </p>
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
