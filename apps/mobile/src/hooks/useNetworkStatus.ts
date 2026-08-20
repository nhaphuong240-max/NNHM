import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) setOnline(state.isConnected ?? true);
      } catch {
        if (mounted) setOnline(true);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { online, offline: !online };
}
