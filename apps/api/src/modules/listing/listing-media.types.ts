import type { ListingMediaScanStatus } from '../../database/entities/listing-media.entity';

export interface ListingMediaRecord {
  id: string;
  attributes: {
    listingId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
    isCover: boolean;
    scanStatus: ListingMediaScanStatus;
    url: string;
    createdAt: string;
  };
}

export interface PresignListingMediaInput {
  fileName: string;
  mimeType: string;
}

export interface AttachListingMediaInput {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface ReorderListingMediaInput {
  mediaIds: string[];
}
