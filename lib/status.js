import { supabase } from '@/lib/supabase';
import { PRE_LAUNCH_MODE, LAUNCH_DATE } from '@/lib/config';

export const TOTAL_PLATES = 42;

// The site is live when the owner pressed "Go live now" OR the saved launch time has passed.
// Clearing the launch date in the admin (or "Switch back to pre-launch") stops the automatic launch.
export function isLive(launched, launchAt) {
  if (launched) return true;
  const t = launchAt ? new Date(launchAt).getTime() : NaN;
  return !Number.isNaN(t) && Date.now() >= t;
}

// Server-side read of launch state + plates left. Runs on our server (not in the
// visitor's browser) and falls back to the values in lib/config.js if the database
// can't be reached or the settings table hasn't been created yet.
export async function getStatus() {
  const fallback = {
    launched: isLive(!PRE_LAUNCH_MODE, LAUNCH_DATE),
    launchAt: LAUNCH_DATE,
    banner: null,
    remaining: null,
  };

  try {
    const signal = AbortSignal.timeout(4000);
    const [settings, inventory] = await Promise.all([
      supabase.from('settings').select('launched, launch_at, banner').eq('id', 1).abortSignal(signal).maybeSingle(),
      supabase.from('inventory').select('remaining').eq('id', 1).abortSignal(signal).maybeSingle(),
    ]);

    const s = settings.error ? null : settings.data;
    const inv = inventory.error ? null : inventory.data;

    return {
      launched: s ? isLive(!!s.launched, s.launch_at) : fallback.launched,
      launchAt: s?.launch_at ?? fallback.launchAt,
      banner: s?.banner || null,
      remaining: inv ? inv.remaining : null,
    };
  } catch {
    return fallback;
  }
}
