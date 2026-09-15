import { useCallback, useEffect, useState } from 'react';
import { AgentShell } from '../../components/AgentShell';
import {
  fetchWalkInCheckIns,
  fetchWalkInGalleries,
  type WalkInCheckIn,
  type WalkInGallery,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

export function AgentWalkInPage() {
  const [galleries, setGalleries] = useState<WalkInGallery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<WalkInCheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCheckIns = useCallback(async (galleryId: string) => {
    const res = await fetchWalkInCheckIns(galleryId);
    setCheckIns(res.data);
  }, []);

  useEffect(() => {
    let active = true;
    fetchWalkInGalleries()
      .then((res) => {
        if (!active) return;
        setGalleries(res.data);
        if (res.data[0]) {
          setSelectedId(res.data[0].id);
          void loadCheckIns(res.data[0].id);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Không tải gallery');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadCheckIns]);

  const selected = galleries.find((g) => g.id === selectedId) ?? galleries[0];

  return (
    <AgentShell title="Walk-in QR Gallery" subtitle="FR-DP-005 · Check-in → Lead Registry">
      {loading && <p style={{ color: brand.muted }}>Đang tải…</p>}
      {error && (
        <p className="text-sm rounded-lg p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {selected && (
        <section
          className="rounded-xl p-5 mb-6 space-y-3"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold">{selected.title}</h2>
          <p className="text-xs" style={{ color: brand.muted }}>
            In QR hoặc chia sẻ link walk-in cho khách tại gallery
          </p>
          <div className="rounded-lg p-3 font-mono text-xs break-all" style={{ background: brand.background }}>
            {selected.publicUrl}
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selected.publicUrl)}`}
            alt="QR walk-in gallery"
            width={180}
            height={180}
            className="rounded-lg border"
            style={{ borderColor: brand.border }}
          />
          {galleries.length > 1 && (
            <select
              value={selectedId ?? selected.id}
              onChange={(e) => {
                setSelectedId(e.target.value);
                void loadCheckIns(e.target.value);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: brand.border }}
            >
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}
        </section>
      )}

      <section>
        <h3 className="font-semibold text-sm mb-3">Check-in gần đây</h3>
        {checkIns.length === 0 ? (
          <p className="text-sm" style={{ color: brand.muted }}>
            Chưa có check-in. Khách quét QR tại gallery sẽ xuất hiện ở đây.
          </p>
        ) : (
          <ul className="space-y-2">
            {checkIns.map((c) => (
              <li
                key={c.id}
                className="rounded-lg p-3 text-sm flex justify-between gap-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="text-xs font-mono" style={{ color: brand.muted }}>
                    {c.phone} · {c.leadId ?? '—'}
                  </p>
                </div>
                <time className="text-xs shrink-0" style={{ color: brand.muted }}>
                  {new Date(c.checkedInAt).toLocaleString('vi-VN')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AgentShell>
  );
}
