import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSearchMap, type MapPin } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';
import { SearchLeafletMap } from './SearchLeafletMap';

type Props = {
  unitIds?: string[];
  className?: string;
};

/** Phase A FR-SRCH-007 — Leaflet map + search-on-move + GR pins. */
export function SearchMapPanel({ unitIds, className = '' }: Props) {
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOnMove, setSearchOnMove] = useState(false);

  const loadMap = useCallback(
    async (bbox?: { north: number; south: number; east: number; west: number }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSearchMap(undefined, bbox);
        setCenter(res.data.center);
        setMode(res.data.mode);
        const all = res.data.pins;
        const idSet = unitIds?.length ? new Set(unitIds) : null;
        setPins(idSet ? all.filter((p) => idSet.has(p.unitId)) : all);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải bản đồ');
      } finally {
        setLoading(false);
      }
    },
    [unitIds?.join(',')],
  );

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const handleBboxChange = useCallback(
    (bbox: { north: number; south: number; east: number; west: number }) => {
      if (!searchOnMove) return;
      void loadMap(bbox);
    },
    [searchOnMove, loadMap],
  );

  return (
    <aside className={`shrink-0 ${className}`} aria-label="Bản đồ kết quả tìm kiếm">
      <div
        className="nnhn-card overflow-hidden sticky top-20"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div
          className="p-3 flex items-center justify-between gap-2 border-b"
          style={{ borderColor: brand.border }}
        >
          <div>
            <h2 className="font-semibold text-sm">Bản đồ</h2>
            {center && (
              <p className="text-xs mt-0.5" style={{ color: brand.muted }}>
                {center.label} · {pins.length} pin{mode ? ` · ${mode}` : ''}
              </p>
            )}
          </div>
          <Link to="/public/map" className="text-xs font-semibold" style={{ color: brand.primary }}>
            Mở rộng
          </Link>
        </div>

        <label className="flex items-center gap-2 px-3 py-2 text-xs border-b" style={{ borderColor: brand.border }}>
          <input
            type="checkbox"
            checked={searchOnMove}
            onChange={(e) => setSearchOnMove(e.target.checked)}
          />
          Tìm khi di chuyển bản đồ
        </label>

        {error && <p className="text-xs text-red-600 p-3">{error}</p>}

        {loading && !center ? (
          <p className="text-sm p-6" style={{ color: brand.muted }}>
            Đang tải bản đồ…
          </p>
        ) : center && pins.length === 0 ? (
          <p className="text-sm p-6 text-center" style={{ color: brand.muted }}>
            Không có pin GR trong vùng hiện tại.
          </p>
        ) : center ? (
          <>
            <SearchLeafletMap
              center={center}
              pins={pins}
              onBboxChange={searchOnMove ? handleBboxChange : undefined}
            />
            <ul className="max-h-40 overflow-y-auto divide-y text-xs" style={{ borderColor: brand.border }}>
              {pins.slice(0, 6).map((pin) => (
                <li key={pin.unitId}>
                  <Link
                    to={`/public/units/${pin.unitId}`}
                    className="flex justify-between gap-2 px-3 py-2 no-underline hover:bg-black/5"
                    style={{ color: brand.ink }}
                  >
                    <span className="font-semibold">{pin.code}</span>
                    <span style={{ color: brand.primary }}>{formatPrice(pin.basePrice)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </aside>
  );
}
