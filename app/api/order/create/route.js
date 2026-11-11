import { quoteDelivery } from '@/lib/borzo';
import { createRazorpayOrder } from '@/lib/razorpay';
import { orderDb } from '@/lib/supabase-admin';
import { plateConfig, orderingBlocker, orderMode, isOpenNow, newCode, validateOrder, priceOrder } from '@/lib/orders';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { kitchenOnline, OFFLINE_MESSAGE } from '@/lib/kitchen';
import { deliveryRules } from '@/lib/deliveryRules';
import { checkDelivery } from '@/lib/delivery';

// Starts an order: checks everything on the server (price, delivery fee, opening hours, plates left),
// holds the plates for 10 minutes, and creates the Razorpay payment. Nothing the browser sends about
// prices is trusted; the totals are always worked out here.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('order-create', clientIp(request), 6, 10 * 60 * 1000)) {
    return bad('Too many attempts. Please try again in a few minutes.', 429);
  }
  if (orderingBlocker() || orderMode() === 'self') return bad('Online ordering is not open yet.', 503);
  if (!(await kitchenOnline())) return bad(OFFLINE_MESSAGE, 409);
  if (!isOpenNow()) return bad(`We are closed right now. Ordering hours (IST): ${plateConfig().hours}.`, 409);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  if (body.website) return Response.json({ ok: true }); // honeypot

  const cfg = plateConfig();
  const v = validateOrder(body, cfg.maxQty);
  if (!v.ok) return bad(v.error);
  const o = v.value;

  // Delivery range from your Delivery settings: far-away customers are told BEFORE they pay.
  const range = checkDelivery(await deliveryRules(), o.lat !== null ? { lat: o.lat, lng: o.lng } : null);
  if (!range.ok) return bad(range.message, 422);

  // Delivery price from Borzo, worked out here.
  const quote = await quoteDelivery({ dropAddress: o.address, thermobox: process.env.BORZO_THERMOBOX === '1' });
  if (!quote.ok) {
    const code = (quote.errors || [])[0];
    if (code === 'invalid_parameters' || code === 'route_not_found') return bad('We could not find that address. Check it and try again.', 422);
    return bad('We could not price the delivery right now. Please try again.', 502);
  }
  if (cfg.maxFee && quote.customerFee > cfg.maxFee) {
    return bad('Sorry, that address is outside our delivery area.', 422);
  }

  const fee = quote.customerFee;
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
    mrp: pr.mrp, discount_percent: pr.discountPercent, discount_amount: pr.discountAmount, lat: o.lat, lng: o.lng, source: 'website',
  }).eq('code', code);

  return Response.json(
    {
      code, razorpayOrderId: rz.id, amountPaise: rz.amountPaise, keyId: process.env.RAZORPAY_KEY_ID,
      total, fee, plateTotal: o.qty * pr.net, discountAmount: pr.discountAmount, holdMinutes: 10, name: o.name, phone: o.phone, email: o.email,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
