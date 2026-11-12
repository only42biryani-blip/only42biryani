import { supabase } from '@/lib/supabase';
import { PRE_LAUNCH_MODE, LAUNCH_DATE, TOTAL_PLATES } from '@/lib/config';
import { orderingBlocker } from '@/lib/orders';
import { kitchenOnlineFromRow } from '@/lib/kitchen';
import { paymentFromRow } from '@/lib/payment';
import { loadSettings } from '@/lib/settingsRow';
import { ensureDailyDrop } from '@/lib/dailyDrop';
import { razorpayConfigured } from '@/lib/razorpay';
import { prebookFromRow, prebookDates, prebookDatesWithLeft, bookedPlates } from '@/lib/prebook';

export { TOTAL_PLATES };

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
    kitchenOnline: true,
    directOrdering: orderingBlocker() === null,
    prebook: false,
    nextBooking: null,
  };

  try {
    const signal = AbortSignal.timeout(4000);
    // All three reads at once (settings row, plates left, plates already pre-booked).
    const [row, inventory, booked] = await Promise.all([
      loadSettings(),
      supabase.from('inventory').select('remaining').eq('id', 1).abortSignal(signal).maybeSingle(),
      bookedPlates(prebookDates(new Date(), '23:59').map((d) => d.value)),
    ]);

    const online = kitchenOnlineFromRow(row);
    const pay = paymentFromRow(row);
    const pb = prebookFromRow(row);
    let inv = inventory.error ? null : inventory.data;
    const dropped = await ensureDailyDrop(row); // automatic opening: the day's plates start by themselves
    if (dropped !== null) inv = { remaining: dropped };
    const soldOut = !!inv && inv.remaining <= 0;
    const prebookOn = orderingBlocker() === null && pb.enabled;
    const canOrder = pay.cod || (pay.online === 'on' && razorpayConfigured());
    const days = prebookOn ? await prebookDatesWithLeft(new Date(), pb.openTime, booked) : [];

    return {
      launched: row ? isLive(!!row.launched, row.launch_at) : fallback.launched,
      launchAt: row?.launch_at ?? fallback.launchAt,
      banner: row?.banner || null,
      remaining: inv ? inv.remaining : null,
      // True when /order is open (set by environment variables, so it can be switched on without a code change).
      kitchenOnline: online,
      directOrdering: orderingBlocker() === null && online && canOrder && !(soldOut && prebookOn),
      // Offline or sold out today: customers can pre-book instead.
      prebook: prebookOn && (!online || soldOut),
      // The next day a customer can pre-book ("today" before opening time, otherwise "tomorrow") and its free plates.
      nextBooking: days.length ? { word: days[0].word, left: days[0].left } : null,
    };
  } catch {
    return fallback;
  }
}
