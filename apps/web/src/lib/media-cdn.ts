/** P4 — client-side media URL (API may already return absolute CDN URLs). */
const CDN_BASE =
  (import.meta.env.VITE_MEDIA_CDN as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${CDN_BASE}${path}`;
}
