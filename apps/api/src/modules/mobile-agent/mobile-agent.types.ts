import type { CrmActivityType } from '../../database/entities/crm-activity.entity';

export type MobileDevicePlatform = 'ios' | 'android' | 'unknown';

export interface RegisterDeviceInput {
  pushToken: string;
  platform?: MobileDevicePlatform;
  deviceName?: string;
}

export interface MobileDeviceRecord {
  id: string;
  pushToken: string;
  platform: MobileDevicePlatform;
  deviceName: string | null;
  userId: string;
  registeredAt: string;
}

export interface SyncActivityItem {
  clientRequestId: string;
  leadId: string;
  type: CrmActivityType;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncActivitiesInput {
  items: SyncActivityItem[];
}

export interface PushStubInput {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}
