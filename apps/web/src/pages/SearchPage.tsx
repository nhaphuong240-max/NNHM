import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompareBasket } from '../hooks/useCompareBasket';
import { searchUnits, type SearchHit } from '../lib/api';
import { brand, formatPrice } from '../theme/tokens';

export function SearchPage() {
  const { ids: compareIds, add: addCompare, count: compareCount, max: compareMax } = useCompareBasket();
  const [compareMsg, setCompareMsg] = useState<string | null>(null);
  const [bedrooms, setBedrooms] = useState<number | undefined>(2);
  const [minPrice, setMinPrice] = useState<number | undefined>(3_000_000_000);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(4_500_000_000);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchUnits({ bedrooms, minPrice, maxPrice })
      .then((res) => {
        if (active) setHits(res.data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Lỗi tải kết quả');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bedrooms, minPrice, maxPrice]);

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="text-white px-4 py-5" style={{ background: brand.primaryDark }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: brand.accent }}>
              WEREAL
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">Tìm căn hộ</h1>
            <p className="text-sm opacity-75 mt-1">Giá Golden Record · so sánh · giữ chỗ</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
          <Link to="/" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Trang chủ
          </Link>
          <Link to="/public/recommendations" className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
            Gợi ý AI
          </Link>
          <Link
            to={compareCount > 0 ? `/public/compare?ids=${compareIds.join(',')}` : '/public/compare'}
            className="rounded-full px-3 py-1.5 relative"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            So sánh{compareCount > 0 ? ` (${compareCount})` : ''}
          </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0">
          <div
            className="rounded-xl p-4 space-y-4 sticky top-4"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold text-sm">Bộ lọc</h2>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
                Phòng ngủ
              </p>
              {[1, 2, 3].map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    type="radio"
                    name="bedrooms"
                    checked={bedrooms === n}
                    onChange={() => setBedrooms(n)}
                  />
                  {n} PN
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="radio"
                  name="bedrooms"
                  checked={bedrooms === undefined}
                  onChange={() => setBedrooms(undefined)}
                />
                Tất cả
              </label>
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
                Giá (VND)
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="price"
                  checked={minPrice === 3_000_000_000 && maxPrice === 4_500_000_000}
                  onChange={() => {
                    setMinPrice(3_000_000_000);
                    setMaxPrice(4_500_000_000);
                  }}
                />
                3 – 4.5 tỷ
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="radio"
                  name="price"
                  checked={minPrice === undefined && maxPrice === undefined}
                  onChange={() => {
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                  }}
                />
                Tất cả
              </label>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-4">
          <div className="flex justify-between text-sm" style={{ color: brand.muted }}>
            <span>
              {loading ? 'Đang tải…' : `${hits.length} căn · Verified Listing`}
            </span>
            <span>API: GET /search/units</span>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
          )}
          {compareMsg && (
            <div className="rounded-lg p-3 text-sm" style={{ background: '#EFF6FF', color: brand.primary }}>
              {compareMsg}
            </div>
          )}

          {!loading && hits.length === 0 && !error && (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              Chưa có listing PUBLISHED. Chạy demo S2: PATCH unit → POST listing → approve.
            </div>
          )}

          {hits.map((hit) => (
            <article
              key={hit.listingId ?? hit.id}
              className="rounded-xl transition-shadow hover:shadow-md"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <Link to={`/public/units/${hit.id}`} className="grid sm:grid-cols-[180px_1fr] gap-4 p-4">
              <div
                className="aspect-video rounded-lg flex items-center justify-center text-4xl"
                style={{ background: '#E8F1F8' }}
              >
                🏠
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-lg">{hit.attributes.title}</h3>
                  {hit.attributes.verified && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: '#DCFCE7', color: brand.success }}
                    >
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: brand.muted }}>
                  {hit.attributes.projectName} · {hit.attributes.code} · {hit.attributes.bedrooms}PN ·{' '}
                  {hit.attributes.area}m²
                </p>
                <p className="text-xl font-bold mt-2" style={{ color: brand.primary }}>
                  {formatPrice(hit.attributes.basePrice)}
                </p>
                <p className="text-xs mt-2 underline" style={{ color: brand.primary }}>
                  Xem chi tiết & đăng ký tư vấn →
                </p>
              </div>
              </Link>
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={compareIds.includes(hit.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{
                    borderColor: compareIds.includes(hit.id) ? brand.success : brand.primary,
                    color: compareIds.includes(hit.id) ? brand.success : brand.primary,
                  }}
                  onClick={() => {
                    const result = addCompare(hit.id);
                    if (result.added) {
                      setCompareMsg(`Đã thêm ${hit.attributes.code} vào so sánh (${result.ids.length}/${compareMax})`);
                    } else if (result.full) {
                      setCompareMsg(`Tối đa ${compareMax} căn — mở trang so sánh để gỡ bớt.`);
                    } else {
                      setCompareMsg(`${hit.attributes.code} đã có trong danh sách so sánh.`);
                    }
                  }}
                >
                  {compareIds.includes(hit.id) ? '✓ Đã thêm so sánh' : '+ Thêm so sánh'}
                </button>
                {compareCount >= 2 && (
                  <Link
                    to={`/public/compare?ids=${compareIds.join(',')}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: brand.primaryDark }}
                  >
                    Mở bảng so sánh
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
