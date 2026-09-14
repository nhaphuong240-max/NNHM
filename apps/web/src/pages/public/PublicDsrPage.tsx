import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { fetchDsrMasterplan } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

/** P1 FR-DSR-001 — interactive masterplan (public-safe). */
export function PublicDsrPage() {
  const { projectId = 'prj_sunrise' } = useParams<{ projectId: string }>();
  const [polygons, setPolygons] = useState<
    { id: string; level: string; refId: string; label: string; geojson: Record<string, unknown> }[]
  >([]);
  const [units, setUnits] = useState<
    { unitId: string; code: string; basePrice: number; status: string }[]
  >([]);
  const [activeTower, setActiveTower] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDsrMasterplan(projectId)
      .then((res) => {
        setPolygons(res.data.polygons);
        setUnits(res.data.units);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const towers = polygons.filter((p) => p.level === 'tower');
  const filteredUnits = activeTower
    ? units.filter((u) => u.code.startsWith(activeTower.slice(0, 1).toUpperCase()))
    : units;

  return (
    <div className="min-h-screen nnhn-paper">
      <PublicTopBar />
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <h1 className="nnhn-display text-3xl" style={{ color: brand.ink }}>
          Masterplan DSR
        </h1>
        <p className="text-sm" style={{ color: brand.muted }}>
          Public-safe · không hiển thị hold owner
        </p>
        {loading ? (
          <p>Đang tải…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-1.5 text-xs font-semibold"
                style={{
                  background: !activeTower ? brand.primary : brand.surface,
                  color: !activeTower ? '#fff' : brand.ink,
                  border: `1px solid ${brand.border}`,
                }}
                onClick={() => setActiveTower(null)}
              >
                Tất cả
              </button>
              {towers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-full px-4 py-1.5 text-xs font-semibold"
                  style={{
                    background: activeTower === t.refId ? brand.primary : brand.surface,
                    color: activeTower === t.refId ? '#fff' : brand.ink,
                    border: `1px solid ${brand.border}`,
                  }}
                  onClick={() => setActiveTower(t.refId)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div
              className="rounded-xl p-6 min-h-[200px]"
              style={{
                background: 'linear-gradient(180deg,#d8e5d4,#f4efe6)',
                border: `1px solid ${brand.border}`,
              }}
            >
              <p className="text-xs mb-4" style={{ color: brand.muted }}>
                {polygons.length} polygon · click tòa để lọc căn
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUnits.slice(0, 12).map((u) => (
                  <Link
                    key={u.unitId}
                    to={`/public/units/${u.unitId}`}
                    className="rounded-lg p-3 no-underline"
                    style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                  >
                    <p className="font-semibold text-sm">{u.code}</p>
                    <p className="text-xs" style={{ color: brand.muted }}>{u.status}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: brand.primary }}>
                      {formatPrice(u.basePrice)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
