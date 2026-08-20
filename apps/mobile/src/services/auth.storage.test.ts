import {
  AUTH_STORAGE_KEYS,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from './auth.storage';

describe('auth.storage', () => {
  beforeEach(async () => {
    await clearStoredSession();
  });

  it('writeStoredSession persists and readStoredSession restores session', async () => {
    await writeStoredSession({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tenantId: 'ten_dev_01',
      email: 'agent@sunrise-dev.vn',
      roles: ['AGENT'],
    });

    const restored = await readStoredSession();
    expect(restored).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tenantId: 'ten_dev_01',
      email: 'agent@sunrise-dev.vn',
      roles: ['AGENT'],
    });
  });

  it('readStoredSession returns null when incomplete', async () => {
    const SecureStore = require('expo-secure-store');
    await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.accessToken, 'only-access');
    expect(await readStoredSession()).toBeNull();
  });

  it('clearStoredSession removes all keys', async () => {
    await writeStoredSession({
      accessToken: 'a',
      refreshToken: 'r',
      tenantId: 't',
      email: 'e@x.vn',
      roles: [],
    });
    await clearStoredSession();
    expect(await readStoredSession()).toBeNull();
  });
});
