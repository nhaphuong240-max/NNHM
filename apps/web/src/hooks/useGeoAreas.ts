import { useEffect, useState } from 'react';
import { fetchCmsAreas, type CmsGeoArea } from '../lib/api';
import { DISTRICTS } from '../lib/districts';

/** Phase A FR-CNT-004 — geo areas from CMS master, fallback to static seed. */
export function useGeoAreas(city?: string) {
  const [areas, setAreas] = useState<CmsGeoArea[]>(
    DISTRICTS.map((d) => ({
      id: d.slug,
      slug: d.slug,
      label: d.label,
      city: d.city,
      level: 'district',
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
      listingCount: 0,
      isIndexable: true,
    })),
  );
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'cms' | 'fallback'>('fallback');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCmsAreas(city)
      .then((res) => {
        if (!active || res.data.length === 0) return;
        setAreas(res.data);
        setSource('cms');
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [city]);

  return { areas, loading, source };
}
