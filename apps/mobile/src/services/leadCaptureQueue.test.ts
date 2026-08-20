import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LEAD_CAPTURE_QUEUE_KEY,
  enqueueLeadCapture,
  readLeadCaptureQueue,
  removeLeadCaptures,
} from './leadCaptureQueue';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('leadCaptureQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
  });

  it('enqueues offline lead captures', async () => {
    const item = await enqueueLeadCapture({ fullName: 'Nam', phone: '0901234567' });
    expect(item.fullName).toBe('Nam');
    expect(item.source).toBe('MOBILE_OFFLINE');
    expect(storage.setItem).toHaveBeenCalledWith(
      LEAD_CAPTURE_QUEUE_KEY,
      expect.stringContaining('Nam'),
    );
  });

  it('removes synced items from queue', async () => {
    storage.getItem.mockResolvedValueOnce(
      JSON.stringify([
        { id: 'lc_1', fullName: 'A', phone: '1', source: 'MOBILE_OFFLINE', createdAt: '2026-01-01' },
        { id: 'lc_2', fullName: 'B', phone: '2', source: 'MOBILE_OFFLINE', createdAt: '2026-01-01' },
      ]),
    );
    await removeLeadCaptures(['lc_1']);
    const saved = JSON.parse((storage.setItem.mock.calls[0]?.[1] as string) ?? '[]') as unknown[];
    expect(saved).toHaveLength(1);
    expect((saved[0] as { id: string }).id).toBe('lc_2');
  });

  it('returns empty array for invalid JSON', async () => {
    storage.getItem.mockResolvedValueOnce('not-json');
    await expect(readLeadCaptureQueue()).resolves.toEqual([]);
  });
});
