const KEY = 'nnhn_visitor_id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'vis_ssr';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = `vis_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return 'vis_anon';
  }
}
