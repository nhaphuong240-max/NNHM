import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicMap, type MapBuilding, type MapPin } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

export function PublicMapPage() {
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
      const res = await fetchPublicMap();
      setCenter(res.data.center);
      setPins(res.data.pins);
      setBuildings(res.data.buildings ?? []);
      setMode(res.data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải bản đồ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: brand.background }}>
      <header className="text-white px-4 py-4" style={{ background: brand.primary }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs opacity-80">UC-UX-06 · SCR-PUBLIC-003 · 3D map production</p>
            <h1 className="text-xl font-bold">Bản đồ dự án</h1>
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

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        {center && (
          <p className="text-sm" style={{ color: brand.muted }}>
            Trung tâm: {center.label} · {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
            {mode ? ` · ${mode}` : ''}
          </p>
        )}

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
                  perspective: '900px',
                }}
              >
                <h2 className="text-sm font-bold mb-4" style={{ color: brand.primaryDark }}>
                  3D towers (isometric pilot)
                </h2>
                <div
                  className="flex flex-wrap gap-8 items-end justify-center min-h-[220px]"
                  style={{ transform: 'rotateX(12deg)' }}
                >
                  {buildings.map((b) => (
                    <div key={b.id} className="flex flex-col items-center gap-2">
                      <div
                        className="relative rounded-t-md"
                        style={{
                          width: 56,
                          height: Math.min(180, Math.max(40, b.maxHeightM * 2)),
                          background: `linear-gradient(90deg, ${brand.primaryDark}, ${brand.primary})`,
                          boxShadow: '8px 8px 0 rgba(15,76,129,0.25)',
                        }}
                        title={`${b.label} · ${b.units} units · ${b.floors} floors`}
                      />
                      <div className="text-center">
                        <p className="text-xs font-bold">{b.label}</p>
                        <p className="text-xs" style={{ color: brand.muted }}>
                          {b.units} căn · F{b.floors}
                        </p>
                      </div>
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
                Chưa có pin trên bản đồ.
              </div>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <h2 className="text-sm font-bold mb-3" style={{ color: brand.primaryDark }}>
                  Geo pins ({pins.length})
                </h2>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
                >
                  {pins.map((pin) => (
                    <Link
                      key={pin.unitId}
                      to={`/public/units/${pin.unitId}`}
                      className="rounded-xl p-3 hover:shadow-md transition-shadow relative"
                      style={{
                        background: '#E8F1F8',
                        border: `2px solid ${brand.primary}`,
                        minHeight: '120px',
                      }}
                    >
                      <p className="font-semibold text-sm pr-4">{pin.code}</p>
                      <p className="text-xs mt-1 line-clamp-2">{pin.label}</p>
                      <p className="text-xs mt-2 font-mono" style={{ color: brand.muted }}>
                        {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                      </p>
                      <p className="text-sm font-bold mt-1" style={{ color: brand.primary }}>
                        {formatPrice(pin.basePrice)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
