import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession } from '../services/auth';
import {
  clearSession,
  getSession,
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
} from '../services/auth';

interface AuthContextValue {
  ready: boolean;
  session: AuthSession | null;
  loggedIn: boolean;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(getSession());

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((stored) => {
        if (active) setSession(stored);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const stored = await restoreSession();
    setSession(stored);
  }, []);

  const loginDemo = useCallback(async () => {
    const next = await loginRequest('agent@sunrise-dev.vn', 'Agent123!');
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      session,
      loggedIn: !!session?.accessToken,
      loginDemo,
      logout,
      refresh,
    }),
    [ready, session, loginDemo, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** For tests / imperative reset */
export async function resetAuthState() {
  await clearSession();
}
