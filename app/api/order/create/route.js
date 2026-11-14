import { createRazorpayOrder } from '@/lib/razorpay';
import { orderDb } from '@/lib/supabase-admin';
import { plateConfig, orderingBlocker, isOpenNow, newCode, validateOrder, priceOrder } from '@/lib/orders';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { kitchenOnline, OFFLINE_MESSAGE } from '@/lib/kitchen';
import { deliveryRules } from '@/lib/deliveryRules';
import { loadSettings } from '@/lib/settingsRow';
import { ensureDailyDrop } from '@/lib/dailyDrop';
import { paymentOptions, onlineAllowed } from '@/lib/payment';
import { checkDelivery, capFee } from '@/lib/delivery';

// Starts an order: checks everything on the server (price, delivery fee, opening hours, plates left),
// holds the plates for 10 minutes, and creates the Razorpay payment. Nothing the browser sends about
// prices is trusted; the totals are always worked out here.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('order-create', clientIp(request), 6, 10 * 60 * 1000)) {
    return bad('Too many attempts. Please try again in a few minutes.', 429);
  }
  if (orderingBlocker()) return bad('Online ordering is not open yet.', 503);
  const row = await loadSettings(); // one database read for every setting this order needs
  if (!(await kitchenOnline(row))) return bad(OFFLINE_MESSAGE, 409);
  if (!isOpenNow()) return bad(`We are closed right now. Ordering hours (IST): ${plateConfig().hours}.`, 409);
  await ensureDailyDrop(row); // automatic opening: make sure today's plates have started

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  if (body.website) return Response.json({ ok: true }); // honeypot
  const payOpts = await paymentOptions(row);
  if (!onlineAllowed(payOpts, body.t)) return bad('Online payment is not available right now. Please choose cash on delivery.', 409);
  const isTest = payOpts.online !== 'on'; // only people with your test link get here when it is "test"

  const cfg = plateConfig(row);
  const v = validateOrder(body, cfg.maxQty);
  if (!v.ok) return bad(v.error);
  const o = v.value;

  // Delivery range from your Delivery settings: far-away customers are told BEFORE they pay.
  const rules = await deliveryRules(row);
  const range = checkDelivery(rules, o.lat !== null ? { lat: o.lat, lng: o.lng } : null, o.address); // also refuses addresses outside Hyderabad
  if (!range.ok) return bad(range.message, 422);

  // Delivery charge: from your Delivery settings (distance) when the kitchen location is set, else the default charge.
  const fee = range.fee !== null ? range.fee : capFee(cfg.selfFee, rules);
  const pr = priceOrder(o.qty, cfg, fee); // applies the offer; the total is always worked out here
  const total = pr.total;
  const code = newCode();
  const db = orderDb();

  const { error } = await db.rpc('place_order_hold', {
    p_code: code, p_qty: o.qty, p_plate_price: pr.net, p_delivery_fee: fee, p_total: total,
    p_name: o.name, p_phone: o.phone, p_email: o.email, p_address: o.address, p_note: o.note, p_hold_minutes: 10,
  });
  if (error) {
    if (/sold_out/i.test(error.message || '')) return bad('Sorry, there are not enough plates left today.', 409);
    return bad('We could not start your order. Please try again.', 502);
  }

  const rz = await createRazorpayOrder({ totalRupees: total, receipt: code, notes: { code } });
  if (!rz.ok) {
    await db.rpc('cancel_order', { p_code: code, p_restore: true }); // give the plates back
    return bad('We could not start the payment. Please try again.', 502);
  }
  await db.from('orders').update({ razorpay_order_id: rz.id }).eq('code', code);
  // Extra details for the bill. Saved separately so a missing column can never block a payment.
  await db.from('orders').update({
    mrp: pr.mrp, discount_percent: pr.discountPercent, discount_amount: pr.discountAmount, lat: o.lat, lng: o.lng, source: isTest ? 'test' : 'website',
  }).eq('code', code);

  if (range.km !== null) await db.from('orders').update({ distance_km: range.km }).eq('code', code); // best effort (needs supabase-delivery-setup.sql)

  return Response.json(
    {
      code, razorpayOrderId: rz.id, amountPaise: rz.amountPaise, keyId: process.env.RAZORPAY_KEY_ID,
      total, fee, plateTotal: o.qty * pr.net, discountAmount: pr.discountAmount, holdMinutes: 10, name: o.name, phone: o.phone, email: o.email,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
