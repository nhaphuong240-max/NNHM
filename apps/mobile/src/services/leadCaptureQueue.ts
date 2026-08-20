import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEAD_CAPTURE_QUEUE_KEY = '@wereal/lead-capture/v1';

export type PendingLeadCapture = {
  id: string;
  fullName: string;
  phone: string;
  source: string;
  createdAt: string;
};

export async function readLeadCaptureQueue(): Promise<PendingLeadCapture[]> {
  const raw = await AsyncStorage.getItem(LEAD_CAPTURE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PendingLeadCapture[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueLeadCapture(input: {
  fullName: string;
  phone: string;
  source?: string;
}): Promise<PendingLeadCapture> {
  const queue = await readLeadCaptureQueue();
  const item: PendingLeadCapture = {
    id: `lc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    source: input.source ?? 'MOBILE_OFFLINE',
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(LEAD_CAPTURE_QUEUE_KEY, JSON.stringify([...queue, item]));
  return item;
}

export async function removeLeadCaptures(ids: string[]): Promise<void> {
  const queue = await readLeadCaptureQueue();
  const idSet = new Set(ids);
  await AsyncStorage.setItem(
    LEAD_CAPTURE_QUEUE_KEY,
    JSON.stringify(queue.filter((item) => !idSet.has(item.id))),
  );
}
