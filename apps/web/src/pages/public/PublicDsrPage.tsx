import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicTopBar } from '../../components/PublicTopBar';
import { createDsrShareLink, fetchDsrDrillDown } from '../../lib/api';
import { getVisitorId } from '../../lib/visitor';
import { brand, formatPrice } from '../../theme/tokens';

/** Phase B FR-DSR-001 — masterplan drill-down tower → floor → unit + share tracking. */
export function PublicDsrPage() {
  const { projectId = 'prj_sunrise' } = useParams<{ projectId: string }>();
  const [params, setParams] = useSearchParams();
  const tower = params.get('tower') ?? undefined;
  const floor = params.get('floor') ?? undefined;

  const [breadcrumbs, setBreadcrumbs] = useState<
    { level: string; refId: string; label: string }[]
  >([]);
  const [children, setChildren] = useState<
    { id: string; level: string; refId: string; label: string }[]
  >([]);
  const [units, setUnits] = useState<
    { unitId: string; code: string; basePrice: number; status: string }[]
  >([]);
  const [shareStats, setShareStats] = useState({ linkCount: 0, totalOpens: 0 });
  const [loading, setLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDsrDrillDown(projectId, tower, floor);
      setBreadcrumbs(res.data.breadcrumbs);
      setChildren(res.data.children);
      setUnits(res.data.units);
      setShareStats(res.data.shareStats);
    } finally {
      setLoading(false);
    }
  }, [projectId, tower, floor]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectTower(refId: string) {
    const next = new URLSearchParams();
    next.set('tower', refId);
    setParams(next);
  }

  function selectFloor(refId: string) {
    const next = new URLSearchParams();
    if (tower) next.set('tower', tower);
    next.set('floor', refId);
    setParams(next);
  }

  function resetDrill() {
    setParams(new URLSearchParams());
  }

  async function handleShare() {
    setShareMsg(null);
    try {
      const res = await createDsrShareLink({
        projectId,
        visitorId: getVisitorId(),
      });
      setShareMsg(`Link chia sẻ: ${window.location.origin}${res.data.url}`);
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : 'Không tạo link');
    }
  }

  return (
    <div className="min-h-screen nnhn-paper">
      <PublicTopBar />
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="nnhn-display text-3xl" style={{ color: brand.ink }}>
              Masterplan DSR
            </h1>
            <p className="text-sm mt-1" style={{ color: brand.muted }}>
              Drill-down · {shareStats.linkCount} link · {shareStats.totalOpens} lượt mở
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: brand.primary }}
          >
            Chia sẻ dự án
          </button>
        </div>

        {shareMsg && (
          <p className="text-xs rounded-lg p-3" style={{ background: brand.surface }}>
            {shareMsg}
          </p>
        )}

        <nav className="flex flex-wrap gap-2 text-xs">
          {breadcrumbs.map((b, i) => (
            <span key={b.refId} className="flex items-center gap-2">
              {i > 0 && <span style={{ color: brand.muted }}>/</span>}
              <button
                type="button"
                className="underline"
                style={{ color: brand.primary }}
                onClick={() => {
                  if (b.level === 'masterplan') resetDrill();
                  else if (b.level === 'tower') selectTower(b.refId);
                }}
              >
                {b.label}
              </button>
            </span>
          ))}
        </nav>

        {loading ? (
          <p>Đang tải…</p>
        ) : (
          <>
            {children.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="rounded-full px-4 py-1.5 text-xs font-semibold"
                    style={{
                      background: brand.surface,
                      border: `1px solid ${brand.border}`,
                    }}
                    onClick={() =>
                      c.level === 'tower' ? selectTower(c.refId) : selectFloor(c.refId)
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            <div
              className="rounded-xl p-6 min-h-[200px]"
              style={{
                background: 'linear-gradient(180deg,#d8e5d4,#f4efe6)',
                border: `1px solid ${brand.border}`,
              }}
            >
              {units.length === 0 ? (
                <p className="text-sm" style={{ color: brand.muted }}>
                  Chọn tòa → tầng để xem căn, hoặc chưa có unit khớp tầng.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {units.slice(0, 18).map((u) => (
                    <Link
                      key={u.unitId}
                      to={`/public/units/${u.unitId}`}
                      className="rounded-lg p-3 no-underline"
                      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
                    >
                      <p className="font-semibold text-sm">{u.code}</p>
                      <p className="text-xs" style={{ color: brand.muted }}>
                        {u.status}
                      </p>
                      <p className="text-sm font-bold mt-1" style={{ color: brand.primary }}>
                        {formatPrice(u.basePrice)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
