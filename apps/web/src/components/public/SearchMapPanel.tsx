import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSearchMap, type MapPin } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

type Bounds = { north: number; south: number; east: number; west: number };

function expandBounds(pins: MapPin[]): Bounds {
  if (pins.length === 0) {
    return { north: 10.74, south: 10.72, east: 106.73, west: 106.71 };
  }
  let north = pins[0].lat;
  let south = pins[0].lat;
  let east = pins[0].lng;
  let west = pins[0].lng;
  for (const p of pins) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  const padLat = Math.max(0.002, (north - south) * 0.15);
  const padLng = Math.max(0.002, (east - west) * 0.15);
  return {
    north: north + padLat,
    south: south - padLat,
    east: east + padLng,
    west: west - padLng,
  };
}

function pinPosition(pin: MapPin, bounds: Bounds) {
  const x = ((pin.lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - pin.lat) / (bounds.north - bounds.south)) * 100;
  return { left: `${x}%`, top: `${y}%` };
}

function osmStaticUrl(center: { lat: number; lng: number }, pins: MapPin[]) {
  const markers = pins
    .slice(0, 8)
    .map((p) => `${p.lat},${p.lng},red-pushpin`)
    .join('|');
  const size = '640x480';
  const zoom = pins.length <= 1 ? 16 : 14;
  const base = `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}&maptype=mapnik`;
  return markers ? `${base}&markers=${encodeURIComponent(markers)}` : base;
}

type Props = {
  unitIds?: string[];
  className?: string;
};

/** P0 §0.2(2) — split map panel with Golden Record coords (OSM tiles). */
export function SearchMapPanel({ unitIds, className = '' }: Props) {
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchSearchMap()
      .then((res) => {
        if (!active) return;
        setCenter(res.data.center);
        setMode(res.data.mode);
        const all = res.data.pins;
        const idSet = unitIds?.length ? new Set(unitIds) : null;
        setPins(idSet ? all.filter((p) => idSet.has(p.unitId)) : all);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải bản đồ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [unitIds?.join(',')]);

  const bounds = useMemo(() => expandBounds(pins), [pins]);
  const mapUrl = center ? osmStaticUrl(center, pins) : null;

  return (
    <aside
      className={`shrink-0 ${className}`}
      aria-label="Bản đồ kết quả tìm kiếm"
    >
      <div
        className="nnhn-card overflow-hidden sticky top-20"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div className="p-3 flex items-center justify-between gap-2 border-b" style={{ borderColor: brand.border }}>
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

        {error && <p className="text-xs text-red-600 p-3">{error}</p>}

        {loading ? (
          <p className="text-sm p-6" style={{ color: brand.muted }}>
            Đang tải bản đồ…
          </p>
        ) : pins.length === 0 ? (
          <p className="text-sm p-6 text-center" style={{ color: brand.muted }}>
            Không có pin cho bộ lọc hiện tại.
          </p>
        ) : (
          <>
            <div className="relative aspect-[4/3] bg-slate-100">
              {mapUrl && (
                <img
                  src={mapUrl}
                  alt={`Bản đồ ${center?.label ?? ''}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 pointer-events-none">
                {pins.map((pin) => {
                  const pos = pinPosition(pin, bounds);
                  const isActive = activeId === pin.unitId;
                  return (
                    <Link
                      key={pin.unitId}
                      to={`/public/units/${pin.unitId}`}
                      title={`${pin.code} · ${formatPrice(pin.basePrice)}`}
                      className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full"
                      style={{
                        ...pos,
                        zIndex: isActive ? 10 : 1,
                      }}
                      onMouseEnter={() => setActiveId(pin.unitId)}
                      onMouseLeave={() => setActiveId(null)}
                    >
                      <span
                        className="block w-3 h-3 rounded-full border-2 border-white shadow-md"
                        style={{ background: isActive ? brand.primaryDark : brand.primary }}
                      />
                      {isActive && (
                        <span
                          className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold text-white shadow"
                          style={{ background: brand.primaryDark }}
                        >
                          {pin.code}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
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
        )}
      </div>
    </aside>
  );
}
