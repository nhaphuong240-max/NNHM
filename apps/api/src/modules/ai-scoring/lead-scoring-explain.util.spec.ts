import { buildLeadScoreExplainFactors } from './lead-scoring-explain.util';

describe('buildLeadScoreExplainFactors', () => {
  it('explains META lead with unit interest', () => {
    const factors = buildLeadScoreExplainFactors({
      source: 'META_LEAD',
      hasUnitInterest: true,
      hasEmail: true,
    });

    expect(factors.some((f) => f.key === 'source' && f.impact === 30)).toBe(true);
    expect(factors.some((f) => f.key === 'hasUnitInterest' && f.impact === 15)).toBe(true);
    expect(factors.reduce((sum, f) => sum + f.impact, 0)).toBeGreaterThanOrEqual(85);
  });
});
