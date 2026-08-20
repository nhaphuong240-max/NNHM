import { scanListingAnomaly } from './ai-anomaly.util';

describe('ai-anomaly.util', () => {
  const baseUnit = {
    code: 'A-12-05',
    basePrice: '3850000000',
    status: 'AVAILABLE',
    area: '68.00',
  };

  it('flags price drift >10%', () => {
    const result = scanListingAnomaly({
      listing: {
        id: 'ls_test',
        unitId: 'un_01',
        title: 'Test listing',
        status: 'PUBLISHED',
        priceDisplay: '4500000000',
        antiDriftStatus: 'BLOCK',
        createdAt: new Date('2026-07-01'),
      },
      unit: baseUnit,
      duplicateCountOnUnit: 1,
    });

    expect(result).not.toBeNull();
    expect(result!.mlScore).toBeGreaterThanOrEqual(65);
    expect(result!.signals.some((s) => s.code === 'PRICE_DRIFT_BLOCK')).toBe(true);
  });

  it('flags duplicate listings on same unit', () => {
    const result = scanListingAnomaly({
      listing: {
        id: 'ls_dup',
        unitId: 'un_01',
        title: 'Dup',
        status: 'PENDING_REVIEW',
        priceDisplay: '3850000000',
        antiDriftStatus: 'PASS',
        createdAt: new Date('2026-07-01'),
      },
      unit: baseUnit,
      duplicateCountOnUnit: 3,
    });

    expect(result!.signals.some((s) => s.code === 'DUPLICATE_UNIT')).toBe(true);
  });

  it('returns null when no signals', () => {
    const result = scanListingAnomaly({
      listing: {
        id: 'ls_ok',
        unitId: 'un_01',
        title: 'OK',
        status: 'PUBLISHED',
        priceDisplay: '3850000000',
        antiDriftStatus: 'PASS',
        createdAt: new Date('2026-07-01'),
      },
      unit: baseUnit,
      duplicateCountOnUnit: 1,
    });

    expect(result).toBeNull();
  });
});
