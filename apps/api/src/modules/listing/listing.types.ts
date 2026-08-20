import type { UnitEntity } from '../../database/entities/unit.entity';
import type { DriftReport } from '../listing/anti-drift.types';

export interface PatchUnitInput {
  basePrice?: number;
  status?: UnitEntity['status'];
  reason?: string;
  expectedVersion: number;
}

export interface CreateListingInput {
  unitId: string;
  /** Must match `unit.version` from GR at commit time (T7-S4). */
  expectedUnitVersion: number;
  title: string;
  description: string;
  highlights?: string[];
  mediaIds?: string[];
  priceDisplay?: number;
}

export interface ListingAttributes {
  title: string;
  description: string;
  status: string;
  unitId: string;
  unitVersion: number;
  verified: boolean;
  antiDriftStatus: string;
  driftReport?: DriftReport | null;
  highlights: string[];
  mediaIds: string[];
  priceDisplay?: number;
  rejectReason?: string | null;
  unitCode?: string;
  basePrice?: number;
  updatedAt: string;
}

export interface ListingApiRow {
  id: string;
  attributes: ListingAttributes;
}

export function mapListingToApiRow(
  listing: {
    id: string;
    title: string;
    description: string;
    status: string;
    unitId: string;
    unitVersion: number;
    verified: boolean;
    antiDriftStatus: string;
    driftReport: Record<string, unknown> | null;
    highlights: string[];
    mediaIds: string[];
    priceDisplay: string | null;
    rejectReason: string | null;
    updatedAt: Date;
    unit?: UnitEntity;
  },
  driftReport?: DriftReport | null,
): ListingApiRow {
  const report = driftReport ?? (listing.driftReport as DriftReport | null);
  return {
    id: listing.id,
    attributes: {
      title: listing.title,
      description: listing.description,
      status: listing.status,
      unitId: listing.unitId,
      unitVersion: listing.unitVersion,
      verified: listing.verified,
      antiDriftStatus: listing.antiDriftStatus,
      driftReport: report,
      highlights: listing.highlights ?? [],
      mediaIds: listing.mediaIds ?? [],
      priceDisplay: listing.priceDisplay ? Number(listing.priceDisplay) : undefined,
      rejectReason: listing.rejectReason,
      unitCode: listing.unit?.code,
      basePrice: listing.unit ? Number(listing.unit.basePrice) : undefined,
      updatedAt: listing.updatedAt.toISOString(),
    },
  };
}
