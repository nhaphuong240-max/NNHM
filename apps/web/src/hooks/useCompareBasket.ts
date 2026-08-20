import { useCallback, useEffect, useState } from 'react';
import {
  addCompareId,
  clearCompareIds,
  COMPARE_CHANGE_EVENT,
  MAX_COMPARE_UNITS,
  readCompareIds,
  removeCompareId,
  writeCompareIds,
} from '../lib/compare';

export function useCompareBasket() {
  const [ids, setIds] = useState<string[]>(() => readCompareIds());

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    window.addEventListener('storage', sync);
    window.addEventListener(COMPARE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(COMPARE_CHANGE_EVENT, sync);
    };
  }, []);

  const add = useCallback((unitId: string) => {
    const result = addCompareId(unitId);
    setIds(result.ids);
    return result;
  }, []);

  const remove = useCallback((unitId: string) => {
    const next = removeCompareId(unitId);
    setIds(next);
    return next;
  }, []);

  const clear = useCallback(() => {
    clearCompareIds();
    setIds([]);
  }, []);

  const replace = useCallback((nextIds: string[]) => {
    const next = writeCompareIds(nextIds);
    setIds(next);
    return next;
  }, []);

  return { ids, add, remove, clear, replace, max: MAX_COMPARE_UNITS, count: ids.length };
}
