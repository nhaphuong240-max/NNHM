import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { ListingThumbnail } from '../../components/public/ListingThumbnail';
import { VerifiedBadge } from '../../components/public/VerifiedBadge';
import { fetchSearchMap, type MapBuilding, type MapPin } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

export function PublicMapPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') ?? undefined;
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [buildings, setBuildings] = useState<MapBuilding[]>([]);
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSearchMap(projectId);
      setCenter(res.data.center);
      setPins(res.data.pins);
      setBuildings(res.data.buildings ?? []);
      setMode(res.data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải bản đồ');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <PublicTopBar />

      <header className="px-4 py-5" style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}` }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold" style={{ color: brand.ink }}>
            Bản đồ listing
          </h1>
          {center && (
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              {center.label} · {pins.length} căn{mode ? ` · ${mode}` : ''}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        {loading ? (
          <p style={{ color: brand.muted }}>Đang tải bản đồ…</p>
        ) : (
          <>
            {buildings.length > 0 && (
              <section
                className="rounded-xl p-6 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 40%, #f8fafc 100%)',
                  border: `1px solid ${brand.border}`,
                }}
              >
                <h2 className="text-sm font-bold mb-4" style={{ color: brand.primaryDark }}>
                  Tòa / block
                </h2>
                <div className="flex flex-wrap gap-8 items-end justify-center min-h-[180px]">
                  {buildings.map((b) => (
                    <div key={b.id} className="flex flex-col items-center gap-2">
                      <div
                        className="relative rounded-t-md"
                        style={{
                          width: 48,
                          height: Math.min(160, Math.max(36, b.maxHeightM * 2)),
                          background: `linear-gradient(90deg, ${brand.primaryDark}, ${brand.primary})`,
                        }}
                      />
                      <p className="text-xs font-bold text-center">{b.label}</p>
                      <p className="text-xs" style={{ color: brand.muted }}>
                        {b.units} căn
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pins.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center text-sm"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                Chưa có pin listing trên bản đồ.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pins.map((pin) => (
                  <Link
                    key={pin.unitId}
                    to={`/public/units/${pin.unitId}`}
                    className="rounded-xl overflow-hidden hover:shadow-md transition-shadow no-underline"
                    style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                  >
                    <div className="h-28">
                      <ListingThumbnail
                        url={pin.thumbnailUrl}
                        alt={pin.code}
                        className="h-28 w-full"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm" style={{ color: brand.ink }}>
                          {pin.code}
                        </p>
                        {pin.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-xs mt-1" style={{ color: brand.muted }}>
                        {pin.label}
                      </p>
                      <p className="text-sm font-bold mt-2" style={{ color: brand.primary }}>
                        {formatPrice(pin.basePrice)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
