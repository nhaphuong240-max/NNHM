import type { ListingEntity } from '../../database/entities/listing.entity';

export type DuplicateListingRow = {
  id: string;
  title: string;
  status: ListingEntity['status'];
  unitId: string;
  verified: boolean;
  createdAt: string;
};

export type DuplicateListingGroup = {
  groupKey: string;
  reason: 'SAME_UNIT' | 'SIMILAR_TITLE';
  unitId: string;
  listings: DuplicateListingRow[];
};

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function detectDuplicateListingGroups(listings: ListingEntity[]): DuplicateListingGroup[] {
  const active = listings.filter((l) => l.status !== 'REJECTED');
  const groups: DuplicateListingGroup[] = [];

  const byUnit = new Map<string, ListingEntity[]>();
  for (const listing of active) {
    const bucket = byUnit.get(listing.unitId) ?? [];
    bucket.push(listing);
    byUnit.set(listing.unitId, bucket);
  }

  for (const [unitId, rows] of byUnit.entries()) {
    if (rows.length < 2) continue;
    groups.push({
      groupKey: `unit:${unitId}`,
      reason: 'SAME_UNIT',
      unitId,
      listings: rows.map(mapRow).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    });
  }

  const titleMap = new Map<string, ListingEntity[]>();
  for (const listing of active) {
    const key = normalizeTitle(listing.title);
    const bucket = titleMap.get(key) ?? [];
    bucket.push(listing);
    titleMap.set(key, bucket);
  }

  for (const [titleKey, rows] of titleMap.entries()) {
    if (rows.length < 2) continue;
    const unitIds = new Set(rows.map((r) => r.unitId));
    if (unitIds.size === 1) continue;
    groups.push({
      groupKey: `title:${titleKey.slice(0, 48)}`,
      reason: 'SIMILAR_TITLE',
      unitId: rows[0].unitId,
      listings: rows.map(mapRow),
    });
  }

  return groups;
}

export function pickPrimaryListing(group: DuplicateListingGroup): string {
  const published = group.listings.find((l) => l.status === 'PUBLISHED');
  if (published) return published.id;
  return group.listings[0]?.id ?? '';
}

function mapRow(row: ListingEntity): DuplicateListingRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    unitId: row.unitId,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
  };
}
