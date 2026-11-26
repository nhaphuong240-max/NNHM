import type { NextFunction, Request, Response } from 'express';

const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=()';

/**
 * HSTS is sent only when Express already considers the request HTTPS.
 * That is true for a TLS listener, or for X-Forwarded-Proto when TRUST_PROXY=true
 * has enabled trust proxy. includeSubDomains is omitted until every subdomain is known to use HTTPS.
 * preload is omitted.
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  }
  next();
}
