import type { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';

export type RecommendPreferences = {
  bedrooms?: number;
  maxPrice?: number;
  minPrice?: number;
};

export type RankedRecommendation = {
  id: string;
  listingId: string;
  matchScore: number;
  reasons: string[];
  attributes: {
    code: string;
    projectName: string;
    basePrice: number;
    bedrooms: number;
    area: number;
    title: string;
    verified: boolean;
    unitStatus: string;
  };
};

export function scoreRecommendation(
  candidate: SearchIndexDocEntity,
  seed: SearchIndexDocEntity | null,
  preferences: RecommendPreferences = {},
): { score: number; reasons: string[] } | null {
  if (seed && candidate.id === seed.id) return null;

  let score = 0;
  const reasons: string[] = [];

  if (candidate.detail.unitStatus === 'AVAILABLE') {
    score += 25;
    reasons.push('Còn hàng');
  } else if (candidate.detail.unitStatus === 'SOLD') {
    score -= 40;
  }

  if (candidate.verified) {
    score += 10;
    reasons.push('Verified listing');
  }

  if (preferences.bedrooms !== undefined && candidate.bedrooms === preferences.bedrooms) {
    score += 20;
    reasons.push(`${preferences.bedrooms} phòng ngủ`);
  }

  const price = Number(candidate.basePrice);
  if (preferences.maxPrice !== undefined && price <= preferences.maxPrice) {
    score += 15;
    reasons.push('Trong ngân sách');
  }
  if (preferences.minPrice !== undefined && price >= preferences.minPrice) {
    score += 5;
  }

  if (seed) {
    if (candidate.bedrooms === seed.bedrooms) {
      score += 30;
      if (!reasons.includes(`${seed.bedrooms} phòng ngủ`)) {
        reasons.push('Cùng số phòng ngủ');
      }
    }

    const seedPrice = Number(seed.basePrice);
    if (seedPrice > 0) {
      const priceDelta = Math.abs(price - seedPrice) / seedPrice;
      if (priceDelta <= 0.12) {
        score += 25;
        reasons.push('Giá tương đương');
      } else if (priceDelta <= 0.25) {
        score += 12;
        reasons.push('Giá gần tương đương');
      }
    }

    if (candidate.detail.projectId === seed.detail.projectId) {
      score += 15;
      reasons.push('Cùng dự án');
    }

    const areaDelta = Math.abs(Number(candidate.area) - Number(seed.area));
    if (areaDelta <= 8) {
      score += 10;
      reasons.push('Diện tích tương tự');
    }
  }

  if (score <= 0) return null;

  return { score: Math.min(100, score), reasons: [...new Set(reasons)] };
}

export function rankRecommendations(
  docs: SearchIndexDocEntity[],
  seed: SearchIndexDocEntity | null,
  preferences: RecommendPreferences = {},
  limit = 6,
): RankedRecommendation[] {
  const ranked: RankedRecommendation[] = [];

  for (const doc of docs) {
    const result = scoreRecommendation(doc, seed, preferences);
    if (!result) continue;

    ranked.push({
      id: doc.id,
      listingId: doc.listingId,
      matchScore: result.score,
      reasons: result.reasons,
      attributes: {
        code: doc.code,
        projectName: doc.projectName,
        basePrice: Number(doc.basePrice),
        bedrooms: doc.bedrooms,
        area: Number(doc.area),
        title: doc.title,
        verified: doc.verified,
        unitStatus: doc.detail.unitStatus,
      },
    });
  }

  return ranked.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
