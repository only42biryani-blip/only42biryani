'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const StatusContext = createContext({ launched: false, launchAt: null, banner: null, remaining: null });

export function useStatus() {
  return useContext(StatusContext);
}

// Keeps launch state and plates-left fresh without a page reload. It polls our own
// /api/status route (server-side, edge-cached), not the database directly.
export default function StatusProvider({ initial, children }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/status');
        if (res.ok && !stopped) setStatus(await res.json());
      } catch {
        // Keep showing the last known state.
      }
    }

    const id = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>;
}
