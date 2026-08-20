import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { postMobileActivity } from '../services/agentActivityApi';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';

/** Records APP_SESSION on login + foreground — counts toward real WAU (not PILOT_SYNC). */
export function useAgentSession() {
  const { loggedIn } = useAuth();
  const { offline } = useNetworkStatus();

  const ping = useCallback(async () => {
    if (!loggedIn || offline) return;
    try {
      await postMobileActivity('APP_SESSION');
    } catch {
      /* best-effort — offline queue not needed for WAU heartbeat */
    }
  }, [loggedIn, offline]);

  useEffect(() => {
    void ping();
  }, [ping]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ping();
    });
    return () => sub.remove();
  }, [ping]);
}
