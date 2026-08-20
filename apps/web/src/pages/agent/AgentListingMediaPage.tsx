import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgentShell } from '../../components/AgentShell';
import {
  deleteListingMedia,
  fetchListingMedia,
  fetchListingMediaBlob,
  fetchListings,
  reorderListingMedia,
  scanListingMedia,
  setListingMediaCover,
  uploadListingMedia,
  type ListingMediaRecord,
  type ListingRecord,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

function ScanBadge({ status }: { status: ListingMediaRecord['attributes']['scanStatus'] }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#FFFBEB', fg: brand.warning },
    CLEAN: { bg: '#DCFCE7', fg: brand.success },
    QUARANTINE: { bg: '#FEE2E2', fg: brand.destructive },
  };
  const c = colors[status] ?? { bg: brand.surface, fg: brand.muted };
  return (
    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function MediaThumb({ listingId, media }: { listingId: string; media: ListingMediaRecord }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetchListingMediaBlob(listingId, media.id).then((blob) => {
      if (active) setUrl(URL.createObjectURL(blob));
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, media.id]);

  if (!url) {
    return (
      <div
        className="w-full aspect-[4/3] rounded-lg flex items-center justify-center text-xs"
        style={{ background: brand.surface, color: brand.muted }}
      >
        …
      </div>
    );
  }
  return <img src={url} alt={media.attributes.fileName} className="w-full aspect-[4/3] object-cover rounded-lg" />;
}

export function AgentListingMediaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialListingId = searchParams.get('listingId') ?? '';

  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [listingId, setListingId] = useState(initialListingId);
  const [media, setMedia] = useState<ListingMediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchListings().then((res) => setListings(res.data));
  }, []);

  const loadMedia = useCallback(async (id: string) => {
    if (!id) {
      setMedia([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchListingMedia(id);
      setMedia(res.data);
      setListingId(id);
      setSearchParams({ listingId: id });
    } catch (e) {
      setMedia([]);
      setError(e instanceof Error ? e.message : 'Không tải media');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (initialListingId) void loadMedia(initialListingId);
  }, [initialListingId, loadMedia]);

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === listingId),
    [listings, listingId],
  );

  async function handleUpload(files: FileList | null) {
    if (!listingId || !files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadListingMedia(listingId, file);
      }
      await loadMedia(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function moveMedia(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= media.length) return;
    const ids = media.map((m) => m.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    setBusyId(media[index].id);
    try {
      await reorderListingMedia(listingId, ids);
      await loadMedia(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetCover(mediaId: string) {
    setBusyId(mediaId);
    try {
      await setListingMediaCover(listingId, mediaId);
      await loadMedia(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Set cover thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleScan(mediaId: string) {
    setBusyId(mediaId);
    try {
      await scanListingMedia(listingId, mediaId);
      await loadMedia(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(mediaId: string) {
    if (!window.confirm('Xóa ảnh này?')) return;
    setBusyId(mediaId);
    try {
      await deleteListingMedia(listingId, mediaId);
      await loadMedia(listingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AgentShell
      title="Media listing"
      subtitle="UC-LS-04 · SCR-AGENT-010 · upload · cover · scan"
      screenTag="Agent / Listing"
    >
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <Link to="/agent/listings/new" className="underline" style={{ color: brand.primary }}>
          ← Wizard listing
        </Link>
        {listingId && (
          <Link
            to={`/agent/listings/new?listingId=${listingId}`}
            className="underline"
            style={{ color: brand.primary }}
          >
            Sửa listing {listingId}
          </Link>
        )}
      </div>

      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <label className="text-sm flex-1 min-w-[220px]">
          Listing
          <select
            value={listingId}
            onChange={(e) => void loadMedia(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border text-sm"
            style={{ borderColor: brand.border }}
          >
            <option value="">— Chọn listing —</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.attributes.title ?? l.attributes.unitId}
              </option>
            ))}
          </select>
        </label>
        {selectedListing && (
          <p className="text-xs w-full" style={{ color: brand.muted }}>
            {selectedListing.attributes.status} · unit {selectedListing.attributes.unitId}
          </p>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg p-3" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}

      {listingId && (
        <>
          <div
            className="rounded-xl border-2 border-dashed p-8 text-center mb-6"
            style={{ borderColor: brand.border, background: brand.surface }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleUpload(e.dataTransfer.files);
            }}
          >
            <p className="text-sm mb-3">Dropzone — kéo thả ảnh JPG/PNG hoặc chọn file</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => void handleUpload(e.target.files)}
            />
            {uploading && <p className="text-xs mt-2" style={{ color: brand.muted }}>Đang upload…</p>}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: brand.muted }}>Đang tải gallery…</p>
          ) : media.length === 0 ? (
            <p className="text-sm" style={{ color: brand.muted }}>Chưa có media — upload ảnh đầu tiên.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {media.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: brand.surface,
                    border: `2px solid ${item.attributes.isCover ? brand.primary : brand.border}`,
                  }}
                >
                  <MediaThumb listingId={listingId} media={item} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs truncate flex-1" title={item.attributes.fileName}>
                      {item.attributes.fileName}
                    </p>
                    <ScanBadge status={item.attributes.scanStatus} />
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <button
                      type="button"
                      disabled={index === 0 || busyId === item.id}
                      className="rounded border px-2 py-1 disabled:opacity-40"
                      style={{ borderColor: brand.border }}
                      onClick={() => void moveMedia(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === media.length - 1 || busyId === item.id}
                      className="rounded border px-2 py-1 disabled:opacity-40"
                      style={{ borderColor: brand.border }}
                      onClick={() => void moveMedia(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={item.attributes.isCover || busyId === item.id}
                      className="rounded border px-2 py-1 disabled:opacity-40"
                      style={{ borderColor: brand.border, color: brand.primary }}
                      onClick={() => void handleSetCover(item.id)}
                    >
                      ★ Cover
                    </button>
                    {item.attributes.scanStatus === 'PENDING' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        className="rounded border px-2 py-1 disabled:opacity-40"
                        style={{ borderColor: brand.border }}
                        onClick={() => void handleScan(item.id)}
                      >
                        Scan
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      className="rounded border px-2 py-1 disabled:opacity-40 ml-auto"
                      style={{ borderColor: brand.border, color: brand.destructive }}
                      onClick={() => void handleDelete(item.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </AgentShell>
  );
}
