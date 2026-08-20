export type ActivityType = 'CALL' | 'NOTE' | 'VISIT' | 'ZALO' | 'MEETING';

export interface GpsMetadata {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  source: 'mobile-gps';
  clientRequestId: string;
}

export interface PendingActivityPayload {
  leadId: string;
  type: ActivityType;
  summary?: string;
  metadata: GpsMetadata;
}

export interface SyncQueueItem {
  id: string;
  kind: 'activity';
  createdAt: string;
  payload: PendingActivityPayload;
}

export interface SyncQueuePayload {
  meta: { updatedAt: string };
  items: SyncQueueItem[];
}
