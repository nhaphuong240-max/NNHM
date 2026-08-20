export const MAX_COMPARE_UNITS = 3;
const STORAGE_KEY = 'wereal_compare_units';

export const COMPARE_CHANGE_EVENT = 'wereal-compare-change';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, MAX_COMPARE_UNITS);
  } catch {
    return [];
  }
}

export function readCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  return parseIds(window.localStorage.getItem(STORAGE_KEY));
}

export function writeCompareIds(ids: string[]): string[] {
  const next = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, MAX_COMPARE_UNITS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(COMPARE_CHANGE_EVENT));
  return next;
}

export function addCompareId(unitId: string): { ids: string[]; added: boolean; full: boolean } {
  const current = readCompareIds();
  if (current.includes(unitId)) {
    return { ids: current, added: false, full: current.length >= MAX_COMPARE_UNITS };
  }
  if (current.length >= MAX_COMPARE_UNITS) {
    return { ids: current, added: false, full: true };
  }
  return { ids: writeCompareIds([...current, unitId]), added: true, full: false };
}

export function removeCompareId(unitId: string): string[] {
  return writeCompareIds(readCompareIds().filter((id) => id !== unitId));
}

export function clearCompareIds(): void {
  writeCompareIds([]);
}

export function parseCompareQuery(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))].slice(0, MAX_COMPARE_UNITS);
}

export function compareQueryString(ids: string[]): string {
  return ids.join(',');
}
