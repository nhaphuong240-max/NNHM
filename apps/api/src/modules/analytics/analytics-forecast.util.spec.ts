import { buildAbsorptionForecast } from './analytics-forecast.util';

describe('analytics-forecast.util', () => {
  it('projects increasing sold units over months', () => {
    const result = buildAbsorptionForecast({
      total: 100,
      sold: 10,
      available: 90,
      months: 3,
      monthlySoldRate: 0.05,
    });

    expect(result.projections).toHaveLength(3);
    expect(result.projections[0].projectedSold).toBeGreaterThan(10);
    expect(result.projections[2].projectedSold).toBeGreaterThan(result.projections[0].projectedSold);
    expect(result.projections[2].projectedSold).toBeLessThanOrEqual(100);
  });
});
