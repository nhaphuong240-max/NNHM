import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchRecommendations, type RecommendationHit } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

function statusColor(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return brand.success;
    case 'RESERVED':
      return brand.warning;
    case 'SOLD':
      return brand.muted;
    default:
      return brand.muted;
  }
}

export function PublicRecommendationsPage() {
  const [searchParams] = useSearchParams();
  const initialSeed = searchParams.get('unitId') ?? searchParams.get('seedUnitId') ?? '';

  const [seedUnitId, setSeedUnitId] = useState(initialSeed);
  const [bedrooms, setBedrooms] = useState('2');
  const [maxPrice, setMaxPrice] = useState('4500000000');
  const [hits, setHits] = useState<RecommendationHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRecommendations({
        seedUnitId: seedUnitId.trim() || undefined,
        bedrooms: bedrooms.trim() ? Number.parseInt(bedrooms, 10) : undefined,
        maxPrice: maxPrice.trim() ? Number.parseInt(maxPrice.replace(/\D/g, ''), 10) : undefined,
        limit: 8,
      });
      setHits(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải gợi ý');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [seedUnitId, bedrooms, maxPrice]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="text-white px-4 py-4" style={{ background: brand.primary }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs opacity-80">UC-AI-06 · SCR-PUBLIC-004 · FR-AI-06</p>
            <h1 className="text-xl font-bold">Gợi ý căn phù hợp</h1>
            <p className="text-sm opacity-80 mt-0.5">Buyer-product matching · rank by feature score</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/public/search" className="underline opacity-90">
              Tìm kiếm
            </Link>
            <Link to="/" className="underline opacity-90">
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        <form
          onSubmit={onSubmit}
          className="rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <label className="text-sm">
            Căn tham chiếu
            <input
              value={seedUnitId}
              onChange={(e) => setSeedUnitId(e.target.value)}
              placeholder="un_01"
              className="mt-1 w-full h-10 px-3 rounded-lg border font-mono text-sm"
              style={{ borderColor: brand.border }}
            />
          </label>
          <label className="text-sm">
            Phòng ngủ
            <input
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border }}
            />
          </label>
          <label className="text-sm">
            Ngân sách tối đa (VND)
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border text-sm tabular-nums"
              style={{ borderColor: brand.border }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg h-10 px-4 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.primary }}
          >
            Cập nhật gợi ý
          </button>
        </form>

        {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang xếp hạng…</p>}
        {error && (
          <p className="rounded-lg p-3 text-sm" style={{ background: '#FEE2E2', color: brand.destructive }}>
            {error}
          </p>
        )}

        {!loading && hits.length === 0 && !error && (
          <p className="text-sm rounded-xl p-6 text-center" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            Chưa có gợi ý — thử bỏ seed hoặc nới ngân sách.
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {hits.map((hit) => (
            <article
              key={hit.id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{hit.attributes.title}</p>
                  <p className="text-xs mt-1" style={{ color: brand.muted }}>
                    {hit.attributes.projectName} · {hit.attributes.code}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded text-white shrink-0"
                  style={{ background: brand.primary }}
                >
                  {hit.matchScore}% match
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: brand.primary }}>
                {formatPrice(hit.attributes.basePrice)}
              </p>
              <p className="text-xs" style={{ color: brand.muted }}>
                {hit.attributes.bedrooms}PN · {hit.attributes.area}m² ·{' '}
                <span style={{ color: statusColor(hit.attributes.unitStatus) }}>
                  {hit.attributes.unitStatus}
                </span>
              </p>
              <div className="flex flex-wrap gap-1">
                {hit.reasons.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: '#EFF6FF', color: brand.primary }}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <Link
                to={`/public/units/${hit.id}`}
                className="mt-auto text-center rounded-lg py-2 text-sm font-semibold text-white"
                style={{ background: brand.primaryDark }}
              >
                Xem chi tiết
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
