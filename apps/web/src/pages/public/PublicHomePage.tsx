import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { searchUnits, type SearchHit } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

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
  const [intent, setIntent] = useState<(typeof INTENTS)[number]['id']>('buy');
  const [q, setQ] = useState('');
  const [picks, setPicks] = useState<SearchHit[]>([]);
  const [picksError, setPicksError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    searchUnits({})
      .then((res) => {
        if (active) setPicks(res.data.slice(0, 6));
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
    <div className="min-h-screen" style={{ background: brand.background }}>
      <PublicTopBar />

      <section className="px-4 py-12 lg:py-16" style={{ background: brand.primary, color: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Ngôi Nhà Hôm Nay
          </h1>
          <p className="mt-3 max-w-xl text-sm opacity-85">
            Giá Golden Record · so sánh căn · giữ chỗ. Bắt đầu bằng khu vực hoặc dự án.
          </p>

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
                style={{ background: brand.primaryDark }}
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

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: brand.ink }}>
              Gợi ý hôm nay
            </h2>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              Listing đã duyệt trên bảng hàng
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
            <article
              key={hit.listingId ?? hit.id}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="h-36" style={{ background: brand.hover }} />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brand.muted }}>
                  {hit.attributes.projectName}
                </p>
                <h3 className="font-bold leading-snug">{hit.attributes.title}</h3>
                <p className="text-sm" style={{ color: brand.muted }}>
                  {hit.attributes.bedrooms} PN · {hit.attributes.area}m²
                  {hit.attributes.verified ? ' · Verified' : ''}
                </p>
                <p className="text-lg font-extrabold mt-auto" style={{ color: brand.primary }}>
                  {formatPrice(hit.attributes.basePrice)}
                </p>
                <Link
                  to={`/public/units/${hit.id}`}
                  className="mt-2 rounded-xl py-2.5 text-center text-sm font-bold text-white no-underline"
                  style={{ background: brand.primary }}
                >
                  Liên hệ
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
