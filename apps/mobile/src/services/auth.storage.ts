import * as SecureStore from 'expo-secure-store';

export const AUTH_STORAGE_KEYS = {
  accessToken: '@wereal/auth/accessToken',
  refreshToken: '@wereal/auth/refreshToken',
  tenantId: '@wereal/auth/tenantId',
  email: '@wereal/auth/email',
  roles: '@wereal/auth/roles',
} as const;

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  email: string;
  roles: string[];
}

export async function readStoredSession(): Promise<StoredAuthSession | null> {
  const [accessToken, refreshToken, tenantId, email, rolesJson] = await Promise.all([
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.accessToken),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.refreshToken),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.tenantId),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.email),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.roles),
  ]);

  if (!accessToken || !refreshToken || !tenantId || !email) {
    return null;
  }

  let roles: string[] = [];
  try {
    roles = rolesJson ? (JSON.parse(rolesJson) as string[]) : [];
  } catch {
    roles = [];
  }

  return { accessToken, refreshToken, tenantId, email, roles };
}

export async function writeStoredSession(session: StoredAuthSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.accessToken, session.accessToken),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.refreshToken, session.refreshToken),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.tenantId, session.tenantId),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.email, session.email),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.roles, JSON.stringify(session.roles)),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all(
    Object.values(AUTH_STORAGE_KEYS).map((key) => SecureStore.deleteItemAsync(key)),
  );
}
