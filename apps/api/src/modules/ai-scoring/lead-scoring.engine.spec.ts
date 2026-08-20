import { inferLeadScore, fallbackLeadScore } from './lead-scoring.engine';

describe('lead-scoring.engine', () => {
  it('scores META + unit as HOT', () => {
    const result = inferLeadScore({
      source: 'META_LEAD',
      unitId: 'un_01',
      email: 'a@b.com',
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe('HOT');
    expect(result.unscored).toBe(false);
  });

  it('scores cold lead as NEW tier', () => {
    const result = inferLeadScore({ source: 'AGENT_REFERRAL' });
    expect(result.tier).toBe('NEW');
    expect(result.score).toBeLessThan(60);
  });

  it('fallback marks unscored', () => {
    const result = fallbackLeadScore('model unavailable');
    expect(result.score).toBe(50);
    expect(result.unscored).toBe(true);
  });
});
