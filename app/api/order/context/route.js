import { supabase } from '@/lib/supabase';
import { orderingBlocker, plateConfig, isOpenNow } from '@/lib/orders';
import { loadSettings } from '@/lib/settingsRow';
import { ensureDailyDrop } from '@/lib/dailyDrop';
import { kitchenOnlineFromRow } from '@/lib/kitchen';
import { paymentFromRow, onlineAllowed } from '@/lib/payment';
import { prebookFromRow, prebookDates, prebookDatesWithLeft, bookedPlates } from '@/lib/prebook';
import { rulesFromRow, checkDelivery, capFee, hasKitchenPin } from '@/lib/delivery';

// Everything the order page needs, in ONE fast response, so the page itself can be static and open instantly:
// is the kitchen online, how can the customer pay, can they pre-book (and for which days), plates left, the
// delivery rules. All database reads happen at the same time, and the answer is cached for a few seconds at
// the edge. (A request with a private test link is never cached.)
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t') || '';
  const blocker = orderingBlocker();
  const now = new Date();

  const [row, inv, booked] = await Promise.all([
    loadSettings(),
    supabase.from('inventory').select('remaining').eq('id', 1).abortSignal(AbortSignal.timeout(4000)).maybeSingle().then((r) => r, () => ({ data: null })),
    bookedPlates(prebookDates(now, '23:59').map((d) => d.value)),
  ]);

  const cfg = plateConfig(row); // price and offer set in the admin win
  const online = kitchenOnlineFromRow(row);
  const pay = paymentFromRow(row);
  const pb = prebookFromRow(row);
  const dropped = await ensureDailyDrop(row); // automatic opening: the day's plates start by themselves
  const remaining = dropped !== null ? dropped : inv?.data ? inv.data.remaining : null;
  const open = isOpenNow();
  const soldOutToday = remaining !== null && remaining <= 0;
  const canPayOnline = onlineAllowed(pay, token);
  const prebookMode = !blocker && pb.enabled && pay.cod && (!online || !open || soldOutToday);
  const rules = rulesFromRow(row);
  const noPin = checkDelivery(rules, null);
  const defaultFee = noPin.fee !== null ? noPin.fee : noPin.ok ? capFee(cfg.selfFee, rules) : (rules.maxFee ?? rules.baseFee);

  const body = {
    blocker, // null = ordering is switched on
    online, open, hours: cfg.hours,
    cod: pay.cod, canPayOnline, testMode: canPayOnline && pay.online === 'test',
    prebook: prebookMode ? await prebookDatesWithLeft(now, pb.openTime, booked) : null,
    reason: !online ? 'offline' : soldOutToday ? 'soldout' : !open ? 'closed' : '',
    remaining, price: cfg.price, maxQty: cfg.maxQty, offerPercent: cfg.offerPercent, selfFee: cfg.selfFee,
    rules: { configured: hasKitchenPin(rules), maxKm: rules.maxKm, requirePin: rules.requirePin && rules.limitRange, limitRange: rules.limitRange, defaultFee, maxFee: rules.maxFee, cityOnly: rules.cityOnly, cityRadiusKm: rules.cityRadiusKm },
  };
  return Response.json(body, {
    headers: { 'Cache-Control': token ? 'no-store' : 'public, s-maxage=5, stale-while-revalidate=30' },
  });
}
