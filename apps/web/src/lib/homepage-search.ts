export type SearchChipParams = {
  intent?: 'buy' | 'rent' | 'project';
  q?: string;
  district?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
};

/** Build SERP URL from CMS homepage chip / trending item. */
export function buildHomeSearchUrl(params: SearchChipParams): string {
  const qs = new URLSearchParams();
  qs.set('intent', params.intent ?? 'buy');
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.district?.trim()) qs.set('district', params.district.trim());
  if (params.bedrooms != null) qs.set('bedrooms', String(params.bedrooms));
  if (params.minPrice != null) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) qs.set('maxPrice', String(params.maxPrice));
  return `/public/search?${qs.toString()}`;
}
