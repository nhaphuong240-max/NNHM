import { detectDuplicateListingGroups, pickPrimaryListing } from './listing-duplicate.util';
import type { ListingEntity } from '../../database/entities/listing.entity';

describe('listing-duplicate.util', () => {
  const base = (over: Partial<ListingEntity>): ListingEntity =>
    ({
      id: 'ls_a',
      tenantId: 'ten_dev_01',
      unitId: 'un_01',
      title: 'Title A',
      description: 'd',
      highlights: [],
      mediaIds: [],
      priceDisplay: '1',
      status: 'PUBLISHED',
      antiDriftStatus: 'PASS',
      driftReport: null,
      verified: true,
      rejectReason: null,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-01'),
      ...over,
    }) as ListingEntity;

  it('groups listings on same unit', () => {
    const groups = detectDuplicateListingGroups([
      base({ id: 'ls_01', unitId: 'un_01' }),
      base({ id: 'ls_02', unitId: 'un_01', status: 'PENDING_REVIEW' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe('SAME_UNIT');
    expect(pickPrimaryListing(groups[0])).toBe('ls_01');
  });
});
