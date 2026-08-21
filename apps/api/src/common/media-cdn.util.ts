/**
 * P4 — rewrite listing media paths to CDN / public site origin when configured.
 * MEDIA_CDN_BASE e.g. https://ngoinhahomnay.vn (no trailing slash)
 */
export function resolveMediaPublicUrl(
  url: string | null | undefined,
  cdnBase: string | undefined,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!cdnBase?.trim()) return trimmed;
  const base = cdnBase.replace(/\/$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function mediaCdnBaseFromEnv(env: Record<string, string | undefined>): string | undefined {
  return env.MEDIA_CDN_BASE?.trim() || env.PUBLIC_SITE_URL?.trim() || undefined;
}
