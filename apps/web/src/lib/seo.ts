import type { UnitDetail } from '../lib/api';

export function buildProductSchema(
  detail: UnitDetail,
  origin: string,
): Record<string, unknown> {
  const { data } = detail;
  const a = data.attributes;
  const availability =
    a.unitStatus === 'AVAILABLE'
      ? 'https://schema.org/InStock'
      : a.unitStatus === 'RESERVED'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: a.title,
    description: `${a.projectName} · ${a.code} · ${a.bedrooms}PN · ${a.area}m²`,
    sku: a.code,
    brand: { '@type': 'Brand', name: a.projectName },
    image: a.thumbnailUrl ? [a.thumbnailUrl] : undefined,
    offers: {
      '@type': 'Offer',
      price: a.basePrice,
      priceCurrency: 'VND',
      availability,
      url: `${origin}/public/units/${data.id}`,
    },
  };
}
