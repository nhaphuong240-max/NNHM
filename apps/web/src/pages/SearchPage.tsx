import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ContactLeadModal } from '../components/public/ContactLeadModal';
import { LocalityInsightPanel } from '../components/public/LocalityInsightPanel';
import { SearchMapPanel } from '../components/public/SearchMapPanel';
import { DISTRICT_FILTERS, ListingCard } from '../components/public/ListingCard';
import { PublicTopBar } from '../components/PublicTopBar';
import { useCompareBasket } from '../hooks/useCompareBasket';
import {
  fetchSearchStats,
  savePublicSearch,
  parseNlSearch,
  searchUnits,
  trackAnalyticsEvent,
  type SearchHit,
} from '../lib/api';
import { DISTRICTS } from '../lib/districts';
import { intentToApiTransactionType } from '../lib/search-intent';
import { getVisitorId } from '../lib/visitor';
import { brand } from '../theme/tokens';

const PRICE_BUCKETS = [
  { label: 'Tất cả', min: undefined, max: undefined },
  { label: 'Dưới 3 tỷ', min: undefined, max: 3_000_000_000 },
  { label: '3 – 4.5 tỷ', min: 3_000_000_000, max: 4_500_000_000 },
  { label: '4.5 – 6 tỷ', min: 4_500_000_000, max: 6_000_000_000 },
  { label: 'Trên 6 tỷ', min: 6_000_000_000, max: undefined },
] as const;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() || undefined;
  const intent = params.get('intent') || 'buy';
  const districtParam = params.get('district') || undefined;
  const { ids: compareIds, add: addCompare, count: compareCount, max: compareMax } = useCompareBasket();
  const [compareMsg, setCompareMsg] = useState<string | null>(null);
  const [bedrooms, setBedrooms] = useState<number | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [district, setDistrict] = useState<string | undefined>(districtParam);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);
  const [leadToast, setLeadToast] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; verified: number } | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ label: string; params: Record<string, unknown> }[]>(
    [],
  );
  const [sort, setSort] = useState<'newest' | 'price' | 'verified_first'>('newest');
  const [nlQuery, setNlQuery] = useState('');
  const [nlChips, setNlChips] = useState<string[]>([]);
  const [nlBusy, setNlBusy] = useState(false);

  const districtSlug = district
    ? DISTRICTS.find((d) => d.label === district)?.slug
    : undefined;

  useEffect(() => {
    setDistrict(districtParam);
  }, [districtParam]);

  useEffect(() => {
    fetchSearchStats()
      .then((res) => setStats({ total: res.data.totalListings, verified: res.data.verifiedListings }))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const city = district
      ? DISTRICT_FILTERS.find((d) => d.label === district)?.city
      : undefined;
    const transactionType = intentToApiTransactionType(intent);
    searchUnits({ q, district, city, bedrooms, minPrice, maxPrice, limit: 50, transactionType, sort })
      .then((res) => {
        if (active) {
          setHits(res.data);
          setSuggestions(res.meta.suggestions ?? []);
          void trackAnalyticsEvent({
            name: 'search_submitted',
            visitorId: getVisitorId(),
            payload: {
              resultCount: res.meta.count,
              zeroResult: res.meta.zeroResult ?? false,
              intent,
              transactionType,
            },
          });
        }
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
  }, [q, district, bedrooms, minPrice, maxPrice, intent, sort]);

  function applyDistrict(next: string | undefined) {
    setDistrict(next);
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set('district', next);
    else nextParams.delete('district');
    setParams(nextParams, { replace: true });
  }

  const intentLabel = intent === 'rent' ? 'Thuê' : intent === 'project' ? 'Dự án' : 'Mua';

  return (
    <div className="min-h-screen nnhn-paper">
      <PublicTopBar />
      <header className="px-4 py-8" style={{ borderBottom: `1px solid ${brand.border}` }}>
        <div className="max-w-6xl mx-auto">
          <p className="nnhn-kicker">{intentLabel}</p>
          <h1 className="nnhn-display text-4xl mt-2" style={{ color: brand.ink }}>
            Tìm căn hộ
          </h1>
          <p className="text-sm mt-1" style={{ color: brand.muted }}>
            {q ? `Kết quả cho “${q}”` : 'Giá Golden Record · so sánh · giữ chỗ'}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="Tìm bằng tiếng Việt — vd: 2PN Quận 7 dưới 4 tỷ"
              className="flex-1 rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: brand.border }}
            />
            <button
              type="button"
              disabled={nlBusy || !nlQuery.trim()}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: brand.primaryDark }}
              onClick={() => {
                setNlBusy(true);
                void parseNlSearch(nlQuery)
                  .then((res) => {
                    const p = res.data;
                    setNlChips(p.understood ?? []);
                    if (p.district) applyDistrict(p.district);
                    if (p.bedrooms) setBedrooms(p.bedrooms);
                    if (p.minPrice !== undefined) setMinPrice(p.minPrice);
                    if (p.maxPrice !== undefined) setMaxPrice(p.maxPrice);
                    if (p.sort === 'newest' || p.sort === 'price' || p.sort === 'verified_first') {
                      setSort(p.sort);
                    }
                  })
                  .finally(() => setNlBusy(false));
              }}
            >
              {nlBusy ? 'Đang hiểu…' : 'NL search'}
            </button>
          </div>
          {nlChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {nlChips.map((c) => (
                <span
                  key={c}
                  className="text-xs rounded-full px-3 py-1"
                  style={{ background: brand.accentSoft, color: brand.primaryDark }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {stats && stats.total > 0 && (
            <p className="text-xs mt-2 font-medium" style={{ color: brand.primary }}>
              {stats.verified} căn Verified · {stats.total} listing trên bảng hàng
            </p>
          )}
          <button
            type="button"
            className="mt-4 rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: brand.primary, color: '#fff' }}
            onClick={() => {
              void savePublicSearch({
                visitorId: getVisitorId(),
                intent,
                q: q ?? '',
                filters: { district, bedrooms, minPrice, maxPrice },
                alertFrequency: 'daily',
                marketingConsent: true,
              })
                .then(() => setSavedMsg('Đã lưu tìm kiếm. Xem tại Đã lưu.'))
                .catch((e) => setSavedMsg(e instanceof Error ? e.message : 'Không lưu được'));
            }}
          >
            Lưu tìm kiếm này
          </button>
          {savedMsg && (
            <p className="text-xs mt-2">
              {savedMsg}{' '}
              <Link to="/public/saved" style={{ color: brand.primary }}>
                Mở Đã lưu
              </Link>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0">
          <div
            className="nnhn-card p-4 space-y-4 sticky top-20"
            style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
          >
            <h2 className="font-semibold text-sm">Bộ lọc</h2>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
                Quận / khu vực
              </p>
              <label className="flex items-center gap-2 text-sm mb-1">
                <input
                  type="radio"
                  name="district"
                  checked={district === undefined}
                  onChange={() => applyDistrict(undefined)}
                />
                Tất cả
              </label>
              {DISTRICT_FILTERS.map((d) => (
                <label key={d.label} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    type="radio"
                    name="district"
                    checked={district === d.label}
                    onChange={() => applyDistrict(d.label)}
                  />
                  {d.label}
                </label>
              ))}
              <LocalityInsightPanel slug={districtSlug} />
            </div>
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
              {PRICE_BUCKETS.map((bucket) => {
                const active = minPrice === bucket.min && maxPrice === bucket.max;
                return (
                  <label key={bucket.label} className="flex items-center gap-2 text-sm mb-1">
                    <input
                      type="radio"
                      name="price"
                      checked={active}
                      onChange={() => {
                        setMinPrice(bucket.min);
                        setMaxPrice(bucket.max);
                      }}
                    />
                    {bucket.label}
                  </label>
                );
              })}
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: brand.muted }}>
                Sắp xếp
              </p>
              <select
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="newest">Mới nhất</option>
                <option value="price">Giá thấp → cao</option>
                <option value="verified_first">Verified trước</option>
              </select>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col xl:flex-row gap-4 min-w-0">
        <section className="flex-1 space-y-4 min-w-0">
          <div className="flex justify-between text-sm gap-3" style={{ color: brand.muted }}>
            <span>
              {loading ? 'Đang tải…' : `${hits.length} căn · Verified Listing`}
            </span>
            <Link
              to={compareCount > 0 ? `/public/compare?ids=${compareIds.join(',')}` : '/public/compare'}
              className="font-medium"
              style={{ color: brand.primary }}
            >
              So sánh{compareCount > 0 ? ` (${compareCount})` : ''}
            </Link>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
          )}
          {compareMsg && (
            <div className="rounded-lg p-3 text-sm" style={{ background: '#EFF6FF', color: brand.primary }}>
              {compareMsg}
            </div>
          )}
          {leadToast && (
            <div className="rounded-lg p-3 text-sm" style={{ background: brand.hover, color: brand.primaryDark }}>
              {leadToast}
            </div>
          )}

          {!loading && hits.length === 0 && !error && (
            <div
              className="rounded-xl p-8 text-center text-sm space-y-4"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <p>Không có căn phù hợp với bộ lọc hiện tại.</p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className="rounded-full px-4 py-2 text-xs font-medium"
                      style={{ background: brand.accentSoft, color: brand.primaryDark }}
                      onClick={() => {
                        if (s.params.district === undefined) setDistrict(undefined);
                        if (s.params.bedrooms === undefined) setBedrooms(undefined);
                        if (s.params.minPrice !== undefined) setMinPrice(s.params.minPrice as number);
                        else if (s.params.minPrice === undefined && s.label.includes('giá')) setMinPrice(undefined);
                        if (s.params.maxPrice !== undefined) setMaxPrice(s.params.maxPrice as number);
                        else if (s.params.maxPrice === undefined && s.label.includes('giá')) setMaxPrice(undefined);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hits.map((hit) => (
            <ListingCard
              key={hit.listingId ?? hit.id}
              hit={hit}
              onContact={() => setContactHit(hit)}
              compareSlot={
                <>
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
                        setCompareMsg(
                          `Đã thêm ${hit.attributes.code} vào so sánh (${result.ids.length}/${compareMax})`,
                        );
                      } else if (result.full) {
                        setCompareMsg(`Tối đa ${compareMax} căn — mở trang so sánh để gỡ bớt.`);
                      } else {
                        setCompareMsg(`${hit.attributes.code} đã có trong danh sách so sánh.`);
                      }
                    }}
                  >
                    {compareIds.includes(hit.id) ? '✓ So sánh' : '+ So sánh'}
                  </button>
                  {compareCount >= 2 && (
                    <Link
                      to={`/public/compare?ids=${compareIds.join(',')}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: brand.primaryDark }}
                    >
                      Bảng so sánh
                    </Link>
                  )}
                </>
              }
            />
          ))}
        </section>
        <SearchMapPanel unitIds={hits.map((h) => h.id)} className="xl:w-[380px] w-full" />
        </div>
      </main>

      {contactHit && (
        <ContactLeadModal
          hit={contactHit}
          onClose={() => setContactHit(null)}
          onSuccess={(leadId) => {
            setContactHit(null);
            setLeadToast(`Đã gửi yêu cầu tư vấn (#${leadId.slice(-6)}). Sale sẽ liên hệ sớm.`);
          }}
        />
      )}
    </div>
  );
}
