import { useEffect, useState } from 'react';
import { ListingThumbnail } from './ListingThumbnail';

type MediaItem = {
  id: string;
  attributes: { url: string; isCover: boolean; mimeType: string };
};

type Props = {
  unitId: string;
  fallbackUrl?: string | null;
  alt: string;
  loadMedia: (unitId: string) => Promise<{ data: MediaItem[] }>;
};

export function UnitGallery({ unitId, fallbackUrl, alt, loadMedia }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadMedia(unitId)
      .then((res) => {
        if (mounted) setItems(res.data);
      })
      .catch(() => {
        if (mounted) setItems([]);
      });
    return () => {
      mounted = false;
    };
  }, [unitId, loadMedia]);

  const urls =
    items.length > 0
      ? items.map((i) => i.attributes.url)
      : fallbackUrl
        ? [fallbackUrl]
        : [];

  const mainUrl = urls[active] ?? null;

  return (
    <div className="space-y-3">
      <div className="aspect-video rounded-2xl overflow-hidden">
        <ListingThumbnail url={mainUrl} alt={alt} className="aspect-video w-full h-full rounded-2xl" />
      </div>
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, idx) => (
            <button
              key={url + idx}
              type="button"
              className="shrink-0 rounded-lg overflow-hidden border-2"
              style={{ borderColor: idx === active ? '#17692F' : 'transparent' }}
              onClick={() => setActive(idx)}
            >
              <ListingThumbnail url={url} alt="" className="w-20 h-14" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
