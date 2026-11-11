import { orderDb } from '@/lib/supabase-admin';
import { plateConfig, orderingBlocker, orderMode, isOpenNow, newCode, validateOrder, priceOrder } from '@/lib/orders';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';

// Self-delivery orders: you deliver, the customer pays cash or UPI on delivery. The server works out every
// amount (including the offer); nothing the browser sends about prices is trusted.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('order-place', clientIp(request), 6, 10 * 60 * 1000)) {
    return bad('Too many attempts. Please try again in a few minutes.', 429);
  }
  if (orderingBlocker() || orderMode() !== 'self') return bad('Online ordering is not open yet.', 503);
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
  const p = priceOrder(o.qty, cfg);
  const code = newCode();

  const { error } = await orderDb().rpc('place_self_order', {
    p_code: code, p_qty: o.qty, p_mrp: p.mrp, p_discount_percent: p.discountPercent, p_discount_amount: p.discountAmount,
    p_plate_price: p.net, p_delivery_fee: p.deliveryFee, p_total: p.total,
    p_name: o.name, p_phone: o.phone, p_email: o.email, p_address: o.address, p_note: o.note,
    p_lat: o.lat, p_lng: o.lng, p_source: 'website',
  });
  if (error) {
    if (/sold_out/i.test(error.message || '')) return bad('Sorry, there are not enough plates left today.', 409);
    return bad('We could not place your order. Please try again.', 502);
  }
  return Response.json({ ok: true, code, total: p.total }, { headers: { 'Cache-Control': 'no-store' } });
}
