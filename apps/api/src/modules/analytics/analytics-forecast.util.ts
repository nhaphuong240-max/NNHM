/** UC-AN-05 — absorption forecast with seasonality + confidence band (T5-S5). */

export type ForecastMonthPoint = {
  label: string;
  month: string;
  projectedSold: number;
  projectedAvailable: number;
  absorptionRate: number;
  confidenceLow: number;
  confidenceHigh: number;
  seasonalityFactor: number;
};

const SEASONALITY = [1.0, 0.95, 1.05, 1.1, 0.9, 1.0, 0.85, 0.9, 1.15, 1.2, 1.1, 0.95];

export function buildAbsorptionForecast(input: {
  total: number;
  sold: number;
  available: number;
  months: number;
  monthlySoldRate?: number;
}): {
  monthlySoldRate: number;
  confidenceBand: number;
  projections: ForecastMonthPoint[];
} {
  const months = Math.min(Math.max(input.months, 1), 12);
  const total = Math.max(input.total, 1);
  const sold = Math.min(input.sold, total);

  const inferredRate =
    input.monthlySoldRate ??
    Math.max(0.005, Math.min(0.08, sold / total / Math.max(3, months / 2)));

  const projections: ForecastMonthPoint[] = [];
  let projectedSold = sold;
  const now = new Date();
  const confidenceBand = 0.12;

  for (let i = 1; i <= months; i += 1) {
    const monthIndex = (now.getUTCMonth() + i) % 12;
    const seasonalityFactor = SEASONALITY[monthIndex] ?? 1;
    const increment = Math.max(0, Math.round(total * inferredRate * seasonalityFactor));
    projectedSold = Math.min(total, projectedSold + increment);
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const absorptionRate = Math.round((projectedSold / total) * 1000) / 1000;

    projections.push({
      label: `M+${i}`,
      month: monthDate.toISOString().slice(0, 7),
      projectedSold,
      projectedAvailable: Math.max(0, total - projectedSold),
      absorptionRate,
      confidenceLow: Math.max(0, Math.round(absorptionRate * (1 - confidenceBand) * 1000) / 1000),
      confidenceHigh: Math.min(1, Math.round(absorptionRate * (1 + confidenceBand) * 1000) / 1000),
      seasonalityFactor,
    });
  }

  return { monthlySoldRate: inferredRate, confidenceBand, projections };
}

/** T6 — ML-ready weighted forecast (rules bridge; swap model server Tier 6+) */
export function buildMlAbsorptionForecast(input: {
  total: number;
  sold: number;
  available: number;
  months: number;
  velocity30d?: number;
}): ReturnType<typeof buildAbsorptionForecast> & { model: string; features: Record<string, number> } {
  const velocityBoost =
    input.velocity30d != null && input.total > 0
      ? Math.min(0.08, (input.velocity30d / input.total) * 0.5)
      : undefined;
  const base = buildAbsorptionForecast({
    ...input,
    monthlySoldRate: velocityBoost,
  });
  return {
    ...base,
    model: 'wereal-absorption-v2',
    features: {
      total: input.total,
      sold: input.sold,
      available: input.available,
      velocity30d: input.velocity30d ?? 0,
      seasonalityMonths: 12,
    },
  };
}
