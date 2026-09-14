import type { SearchUnitsQuery } from './search.service';

export type SearchRelaxation = {
  label: string;
  query: Partial<SearchUnitsQuery>;
};

/** P0 FR-SRCH-008 — suggest relaxed filters when zero hits. */
export function buildZeroResultSuggestions(
  query: SearchUnitsQuery,
): SearchRelaxation[] {
  const suggestions: SearchRelaxation[] = [];

  if (query.bedrooms !== undefined) {
    suggestions.push({
      label: 'Bỏ lọc phòng ngủ',
      query: { ...query, bedrooms: undefined },
    });
  }

  if (query.district) {
    suggestions.push({
      label: 'Mở rộng toàn thành phố',
      query: { ...query, district: undefined },
    });
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const min = query.minPrice;
    const max = query.maxPrice;
    suggestions.push({
      label: 'Nới khoảng giá ±20%',
      query: {
        ...query,
        minPrice: min !== undefined ? Math.floor(min * 0.8) : undefined,
        maxPrice: max !== undefined ? Math.ceil(max * 1.2) : undefined,
      },
    });
  }

  if (query.q?.trim()) {
    suggestions.push({
      label: 'Xóa từ khóa tìm kiếm',
      query: { ...query, q: undefined },
    });
  }

  return suggestions.slice(0, 3);
}
