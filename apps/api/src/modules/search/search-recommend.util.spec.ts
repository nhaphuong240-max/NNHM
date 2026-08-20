import type { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { rankRecommendations, scoreRecommendation } from './search-recommend.util';

const baseDoc = (): SearchIndexDocEntity => ({
  id: 'un_01',
  tenantId: 'ten_dev_01',
  listingId: 'ls_un01',
  projectName: 'Sunrise Tower A',
  title: 'Căn view sông',
  code: 'A-12-05',
  basePrice: '3850000000',
  bedrooms: 2,
  area: '68.00',
  verified: true,
  searchText: 'test',
  detail: {
    listingId: 'ls_un01',
    description: 'Desc',
    highlights: ['View sông'],
    priceDisplay: 3850000000,
    floor: 12,
    unitStatus: 'AVAILABLE',
    antiDriftStatus: 'PASS',
    projectId: 'prj_sunrise',
  },
  indexedAt: new Date(),
  updatedAt: new Date(),
});

describe('search-recommend.util', () => {
  it('ranks similar units higher (UC-AI-06)', () => {
    const seed = baseDoc();
    const similar: SearchIndexDocEntity = {
      ...baseDoc(),
      id: 'un_02',
      listingId: 'ls_un02',
      code: 'A-12-06',
      basePrice: '3900000000',
      area: '70.00',
    };
    const distant: SearchIndexDocEntity = {
      ...baseDoc(),
      id: 'un_99',
      listingId: 'ls_un99',
      code: 'B-01-01',
      bedrooms: 1,
      basePrice: '2900000000',
      area: '45.00',
      detail: { ...seed.detail, projectId: 'prj_other', unitStatus: 'AVAILABLE' },
    };

    const ranked = rankRecommendations([similar, distant], seed, {}, 2);
    expect(ranked[0].id).toBe('un_02');
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it('excludes seed unit from recommendations', () => {
    const seed = baseDoc();
    expect(scoreRecommendation(seed, seed, {})).toBeNull();
  });
});
