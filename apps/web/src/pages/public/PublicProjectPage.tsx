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
    <div className="min-h-screen pb-8" style={{ background: brand.background }}>
      <PublicTopBar />

      <header className="px-4 py-8" style={{ background: brand.primary, color: '#fff' }}>
        <div className="max-w-6xl mx-auto">
          {loading && <p className="text-sm opacity-80">Đang tải…</p>}
          {error && <p className="text-sm">{error}</p>}
          {attrs && (
            <>
              <p className="text-xs uppercase tracking-widest opacity-75">{attrs.code}</p>
              <h1 className="text-2xl lg:text-4xl font-extrabold mt-1">{attrs.name}</h1>
              <p className="mt-2 text-sm opacity-90">
                {[attrs.district, attrs.city].filter(Boolean).join(', ')}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
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
                className="inline-block mt-4 text-sm underline opacity-90"
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
