import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { JsonLd } from '../../components/public/JsonLd';
import { ListingCard } from '../../components/public/ListingCard';
import { PublicFooter } from '../../components/public/PublicFooter';
import { TrustStrip } from '../../components/public/TrustStrip';
import { PublicTopBar } from '../../components/PublicTopBar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { findDistrictBySlug } from '../../lib/districts';
import { fetchCmsArea, searchUnits, type SearchHit } from '../../lib/api';
import { brand } from '../../theme/tokens';
import { EmiCalculator } from '../../components/public/EmiCalculator';

type DistrictView = {
  slug: string;
  label: string;
  city: string;
  seoTitle: string;
  seoDescription: string;
};

export function PublicDistrictPage() {
  const { districtSlug = '' } = useParams<{ districtSlug: string }>();
  const [district, setDistrict] = useState<DistrictView | null>(null);
  const [areaLoading, setAreaLoading] = useState(true);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ngoinhahomnay.vn';

  useEffect(() => {
    let active = true;
    setAreaLoading(true);
    fetchCmsArea(districtSlug)
      .then((res) => {
        if (!active) return;
        const a = res.data.area;
        setDistrict({
          slug: districtSlug,
          label: a.label,
          city: a.city,
          seoTitle: a.seoTitle ?? `Căn hộ bán tại ${a.label}, ${a.city}`,
          seoDescription:
            a.seoDescription ??
            `Danh sách căn hộ Verified tại ${a.label}, ${a.city} — giá Golden Record minh bạch.`,
        });
      })
      .catch(() => {
        if (!active) return;
        const fallback = findDistrictBySlug(districtSlug);
        setDistrict(fallback ?? null);
      })
      .finally(() => {
        if (active) setAreaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [districtSlug]);

  usePageMeta(
    district
      ? {
          title: `${district.seoTitle} | Ngôi Nhà Hôm Nay`,
          description: district.seoDescription,
          canonical: `${siteOrigin}/mua/${district.slug}`,
        }
      : !areaLoading
        ? { title: 'Không tìm thấy khu vực | Ngôi Nhà Hôm Nay' }
        : { title: 'Đang tải… | Ngôi Nhà Hôm Nay' },
  );

  useEffect(() => {
    if (!district) return;
    let active = true;
    setLoading(true);
    searchUnits({ district: district.label, city: district.city, limit: 50 })
      .then((res) => {
        if (active) setHits(res.data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Lỗi tải listing');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [district]);

  const jsonLd = useMemo(() => {
    if (!district) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: district.seoTitle,
      description: district.seoDescription,
      numberOfItems: hits.length,
      itemListElement: hits.slice(0, 20).map((hit, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteOrigin}/public/units/${hit.id}`,
        name: hit.attributes.title,
      })),
    };
  }, [district, hits, siteOrigin]);

  if (areaLoading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: brand.background }}>
        <PublicTopBar />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-16">
          <p className="text-sm" style={{ color: brand.muted }}>
            Đang tải khu vực…
          </p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!district) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: brand.background }}>
        <PublicTopBar />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold">Không tìm thấy khu vực</h1>
          <Link to="/public/search" className="text-sm mt-4 inline-block" style={{ color: brand.primary }}>
            ← Quay lại tìm kiếm
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col nnhn-paper">
      {jsonLd && <JsonLd data={jsonLd} />}
      <PublicTopBar />
      <TrustStrip />

      <header className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <p className="nnhn-kicker">{district.city}</p>
          <h1 className="nnhn-display text-3xl lg:text-5xl mt-3 max-w-3xl" style={{ color: brand.ink }}>
            {district.seoTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: brand.muted }}>
            {district.seoDescription}
          </p>
          <Link
            to={`/public/search?district=${encodeURIComponent(district.label)}`}
            className="inline-block mt-6 rounded-full px-5 py-2.5 text-sm font-bold no-underline text-white"
            style={{ background: brand.primary }}
          >
            Lọc SERP {district.label}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải listing…</p>}
        {error && (
          <p className="text-sm rounded-xl p-4" style={{ background: brand.surface, color: brand.warning }}>
            {error}
          </p>
        )}

        {!loading && !error && hits.length === 0 && (
          <p className="text-sm rounded-xl p-6" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            Chưa có căn tại {district.label}. Thử{' '}
            <Link to="/public/search" style={{ color: brand.primary }}>tìm kiếm toàn bộ</Link>.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hits.map((hit) => (
            <ListingCard
              key={hit.listingId ?? hit.id}
              hit={hit}
              layout="grid"
              onContact={() => setContactHit(hit)}
            />
          ))}
        </div>

        <section className="mt-12">
          <EmiCalculator compact initialPrice={hits[0]?.attributes.basePrice} />
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
