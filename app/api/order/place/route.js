import { orderDb } from '@/lib/supabase-admin';
import { plateConfig, orderingBlocker, isOpenNow, newCode, validateOrder, priceOrder } from '@/lib/orders';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { kitchenOnline, OFFLINE_MESSAGE } from '@/lib/kitchen';
import { deliveryRules } from '@/lib/deliveryRules';
import { paymentOptions } from '@/lib/payment';
import { prebookEnabled, validPrebookDate, prettyDate } from '@/lib/prebook';
import { checkDelivery, capFee } from '@/lib/delivery';

// Self-delivery orders: you deliver, the customer pays cash or UPI on delivery. The server works out every
// amount (including the offer); nothing the browser sends about prices is trusted.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('order-place', clientIp(request), 6, 10 * 60 * 1000)) {
    return bad('Too many attempts. Please try again in a few minutes.', 429);
  }
  if (orderingBlocker()) return bad('Online ordering is not open yet.', 503);
  if (!(await paymentOptions()).cod) return bad('Cash on delivery is not available right now.', 409);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  if (body.website) return Response.json({ ok: true }); // honeypot

  // Pre-booking: a booking for the next day(s). Otherwise the kitchen must be online and open right now.
  const sched = typeof body.scheduledFor === 'string' ? body.scheduledFor : '';
  if (sched) {
    if (!(await prebookEnabled())) return bad('Pre-booking is not available right now.', 409);
    if (!validPrebookDate(sched)) return bad('Please choose one of the days shown (tomorrow up to a week ahead).', 422);
  } else {
    if (!(await kitchenOnline())) return bad(OFFLINE_MESSAGE, 409);
    if (!isOpenNow()) return bad(`We are closed right now. Ordering hours (IST): ${plateConfig().hours}.`, 409);
  }

  const cfg = plateConfig();
  const v = validateOrder(body, cfg.maxQty);
  if (!v.ok) return bad(v.error);
  const o = v.value;
  // Delivery range and charge come from your Delivery settings in /admin, worked out here from the shared location.
  const rules = await deliveryRules();
  const d = checkDelivery(rules, o.lat !== null ? { lat: o.lat, lng: o.lng } : null);
  if (!d.ok) return bad(d.message, 422);
  const p = priceOrder(o.qty, cfg, d.fee === null ? capFee(cfg.selfFee, rules) : d.fee);
  const code = newCode();

  const args = {
    p_code: code, p_qty: o.qty, p_mrp: p.mrp, p_discount_percent: p.discountPercent, p_discount_amount: p.discountAmount,
    p_plate_price: p.net, p_delivery_fee: p.deliveryFee, p_total: p.total,
    p_name: o.name, p_phone: o.phone, p_email: o.email, p_address: o.address, p_note: o.note,
    p_lat: o.lat, p_lng: o.lng, p_source: 'website',
  };
  const { error } = sched
    ? await orderDb().rpc('place_prebook_order', { ...args, p_date: sched })
    : await orderDb().rpc('place_self_order', args);
  if (error) {
    if (/sold_out/i.test(error.message || '')) return bad(sched ? `Sorry, ${prettyDate(sched)} is fully booked. Please choose another day.` : 'Sorry, there are not enough plates left today.', 409);
    return bad('We could not place your order. Please try again.', 502);
  }
  if (d.km !== null) await orderDb().from('orders').update({ distance_km: d.km }).eq('code', code); // best effort (needs supabase-delivery-setup.sql)
  return Response.json({ ok: true, code, total: p.total }, { headers: { 'Cache-Control': 'no-store' } });
}
