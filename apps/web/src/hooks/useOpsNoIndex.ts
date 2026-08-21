import { usePageMeta } from './usePageMeta';

/** P4 — ops/finance portals are not public marketplace SEO targets */
export function useOpsNoIndex(title: string) {
  usePageMeta({
    title,
    robots: 'noindex, nofollow',
  });
}
