import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContactLeadModal } from '../../components/public/ContactLeadModal';
import { ListingCard } from '../../components/public/ListingCard';
import { PublicTopBar } from '../../components/PublicTopBar';
import { fetchProjectDetail, type ProjectDetailResponse, type SearchHit } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

export function PublicProjectPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactHit, setContactHit] = useState<SearchHit | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProjectDetail(projectId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải được dự án');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const attrs = data?.data.attributes;
  const listings = data?.data.listings ?? [];

  return (
    <div className="min-h-screen nnhn-paper pb-8">
      <PublicTopBar />

      <header className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {loading && <p className="text-sm" style={{ color: brand.muted }}>Đang tải…</p>}
          {error && <p className="text-sm" style={{ color: brand.warning }}>{error}</p>}
          {attrs && (
            <>
              <p className="nnhn-kicker">{attrs.code}</p>
              <h1 className="nnhn-display text-3xl lg:text-5xl mt-2" style={{ color: brand.ink }}>
                {attrs.name}
              </h1>
              <p className="mt-3 text-sm" style={{ color: brand.muted }}>
                {[attrs.district, attrs.city].filter(Boolean).join(', ')}
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold" style={{ color: brand.primaryDark }}>
                <span>
                  {attrs.unitCount} căn · {attrs.verifiedCount} Verified
                </span>
                {attrs.minPrice > 0 && (
                  <span>
                    {formatPrice(attrs.minPrice)}
                    {attrs.maxPrice > attrs.minPrice ? ` – ${formatPrice(attrs.maxPrice)}` : ''}
                  </span>
                )}
              </div>
              <Link
                to={`/public/map?projectId=${encodeURIComponent(projectId)}`}
                className="inline-block mt-5 text-sm font-semibold"
                style={{ color: brand.clay }}
              >
                Xem trên bản đồ →
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!loading && listings.length === 0 && !error && (
          <p className="text-sm rounded-xl p-6" style={{ background: brand.surface, border: `1px solid ${brand.border}` }}>
            Chưa có căn published trong dự án này.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((hit) => (
            <ListingCard
              key={hit.listingId ?? hit.id}
              hit={hit}
              layout="grid"
              onContact={() => setContactHit(hit)}
            />
          ))}
        </div>
      </main>

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
