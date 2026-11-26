/** Public crawl files. A missing SITE_URL stays relative and does not invent a host. */

export const PUBLIC_PATHS = [
  '/',
  '/public/search',
  '/public/map',
  '/public/compare',
  '/public/tools/emi',
  '/public/open-day',
  '/legal/privacy',
] as const;

export function publicSiteBase(siteUrl: string | undefined): string {
  const raw = siteUrl?.trim() ?? '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

export function buildRobotsTxt(siteUrl: string | undefined): string {
  const base = publicSiteBase(siteUrl);
  const sitemap = base ? `${base}/sitemap.xml` : '/sitemap.xml';
  return [
    'User-agent: *',
    'Disallow: /login',
    'Disallow: /auth/login',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');
}

export function buildSitemapXml(siteUrl: string | undefined): string {
  const base = publicSiteBase(siteUrl);
  const urls = PUBLIC_PATHS.map((path) => {
    const loc = base ? `${base}${path === '/' ? '/' : path}` : path;
    return `  <url><loc>${loc}</loc></url>`;
  });
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

export function siteFile(
  pathname: string | undefined,
  siteUrl: string | undefined,
): { contentType: string; body: string } | null {
  if (pathname === '/robots.txt') {
    return { contentType: 'text/plain; charset=utf-8', body: buildRobotsTxt(siteUrl) };
  }
  if (pathname === '/sitemap.xml') {
    return { contentType: 'application/xml; charset=utf-8', body: buildSitemapXml(siteUrl) };
  }
  return null;
}
