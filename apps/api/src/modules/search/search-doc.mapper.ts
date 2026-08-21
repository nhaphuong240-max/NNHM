import type { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';

export function mapDocToSearchHit(doc: SearchIndexDocEntity) {
  return {
    id: doc.id,
    listingId: doc.listingId,
    attributes: {
      code: doc.code,
      projectName: doc.projectName,
      projectId: doc.detail.projectId,
      basePrice: Number(doc.basePrice),
      bedrooms: doc.bedrooms,
      area: Number(doc.area),
      title: doc.title,
      verified: doc.verified,
      thumbnailUrl: doc.thumbnailUrl,
      city: doc.city,
      district: doc.district,
    },
  };
}
