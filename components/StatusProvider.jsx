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

    // Re-check right when the scheduled launch time arrives so visitors see the live site
    // within a second or two instead of waiting for the next poll.
    let launchTimer;
    const at = status.launchAt ? new Date(status.launchAt).getTime() : NaN;
    const delay = at - Date.now();
    if (!status.launched && delay > 0 && delay < 2147483647) {
      launchTimer = setTimeout(() => {
        refresh();
        setTimeout(refresh, 3000);
      }, delay + 1000);
    }
    return () => {
      stopped = true;
      clearTimeout(launchTimer);
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [status.launchAt, status.launched]);

  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>;
}
