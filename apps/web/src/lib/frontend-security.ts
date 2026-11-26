/**
 * Report-only CSP for the public web.
 * Sources in use: same-origin API and scripts, Google fonts, Leaflet tiles and marker images,
 * the QR image host, and the VNPay sandbox redirect.
 * Listing images may be absolute https URLs from the media host. Add that host here before enforce.
 * To enforce, rename the header to Content-Security-Policy after the report stream is clean.
 * HSTS is not set by the Vite dev server. Send max-age=15552000 only on HTTPS, without preload,
 * and without includeSubDomains until every subdomain serves HTTPS.
 */
export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://unpkg.com https://*.tile.openstreetmap.org https://api.qrserver.com",
  "connect-src 'self' https://sandbox.vnpayment.vn",
  "form-action 'self' https://sandbox.vnpayment.vn",
].join('; ');

export const FRONTEND_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy-Report-Only': CONTENT_SECURITY_POLICY_REPORT_ONLY,
};
