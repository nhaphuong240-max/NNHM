import { generateListingCopilotCopy } from './listing-copilot.engine';

describe('generateListingCopilotCopy', () => {
  const ctx = {
    unitId: 'un_01',
    unitCode: 'A-12-05',
    projectId: 'prj_sunrise',
    projectName: 'Sunrise Tower A',
    bedrooms: 2,
    area: 68,
    floor: 12,
    status: 'AVAILABLE',
    basePrice: 3_850_000_000,
  };

  it('generates Vietnamese title and description', () => {
    const result = generateListingCopilotCopy(ctx, 'premium');
    expect(result.title).toContain('2PN');
    expect(result.content).toContain('A-12-05');
    expect(result.content).toContain('Sunrise Tower A');
    expect(result.content).toContain('68');
  });

  it('varies tone for investment', () => {
    const result = generateListingCopilotCopy(ctx, 'investment');
    expect(result.title.toLowerCase()).toContain('đầu tư');
    expect(result.content.toLowerCase()).toContain('cho thuê');
  });
});
