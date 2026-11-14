import { unmeasuredDataBilling } from './data-intelligence.service';
import { listingIsPubliclyIndexable } from '../search/search-index.service';

describe('public intelligence limits', () => {
  it('does not invent an MRR and does not mark the heatmap as a measured pilot KPI', () => {
    const billing = unmeasuredDataBilling('ten_a', [
      { productCode: 'HEATMAP', enabled: true, quotaPerMonth: 100 },
      { productCode: 'MARKET_BRIEF', enabled: true, quotaPerMonth: 100 },
    ]);
    expect(billing.data.estimatedMrrVnd).toBeNull();
    expect(billing.data.lineItems.every((item) => item.unitPriceVnd == null)).toBe(true);
    expect(billing.meta.measured).toBe(false);
    expect(billing.meta.pilotKpi).toBe(false);
    expect(JSON.stringify(billing)).not.toContain('5000000');
    expect(JSON.stringify(billing)).not.toContain('2000000');
  });

  it('indexes only a published listing and leaves drafts and private pages out', () => {
    expect(listingIsPubliclyIndexable('PUBLISHED')).toBe(true);
    expect(listingIsPubliclyIndexable('DRAFT')).toBe(false);
    expect(listingIsPubliclyIndexable('PENDING_REVIEW')).toBe(false);
    expect(listingIsPubliclyIndexable('REJECTED')).toBe(false);
  });
});
