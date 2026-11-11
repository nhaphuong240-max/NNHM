const TOKEN_RE = /^v1\.(ten_[a-z0-9_]+)\.([A-Za-z0-9_-]{8,})$/;

/** Public links carry the tenant in the token. A header cannot replace it. */
export function mintPublicTenantToken(tenantId: string, secret: string): string {
  if (!/^ten_[a-z0-9_]+$/.test(tenantId)) {
    throw new Error(`public token refused: invalid tenant ${tenantId}`);
  }
  if (!/^[A-Za-z0-9_-]{8,}$/.test(secret)) {
    throw new Error('public token refused: secret must be unpadded and at least 8 characters');
  }
  return `v1.${tenantId}.${secret}`;
}

export function tenantIdFromPublicToken(token: string | undefined | null): string | null {
  const match = TOKEN_RE.exec((token ?? '').trim());
  return match?.[1] ?? null;
}

export function secretFromPublicToken(token: string | undefined | null): string | null {
  const match = TOKEN_RE.exec((token ?? '').trim());
  return match?.[2] ?? null;
}

/** Exact stored values to try for a presented token. A bare secret also matches the prefixed form. */
export function presentedTokenCandidates(presented: string, tenantId?: string): string[] {
  const raw = presented.trim();
  const values = new Set<string>();
  if (raw) values.add(raw);
  const secret = secretFromPublicToken(raw);
  if (secret) values.add(secret);
  if (tenantId && raw && !raw.startsWith('v1.')) {
    values.add(`v1.${tenantId}.${raw}`);
  }
  return [...values];
}

/** Catalog token only. No dev fallback: an empty NODE_ENV must not become ten_dev_01. */
export function configuredCatalogToken(): string | null {
  const fromEnv = process.env.PUBLIC_CATALOG_TOKEN?.trim();
  return fromEnv || null;
}
