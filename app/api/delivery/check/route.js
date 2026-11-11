import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { deliveryRules } from '@/lib/deliveryRules';
import { checkDelivery, hasKitchenPin } from '@/lib/delivery';

// Tells the order page how far a shared location is and what delivery will cost, before the customer orders.
// With no location it just reports the rules (range, whether sharing location is required).
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('delivery-check', clientIp(request), 40, 10 * 60 * 1000)) return bad('Too many requests. Please try again in a few minutes.', 429);
  let body = {};
  try {
    body = await request.json();
  } catch {
    // No body = just the rules.
  }
  const rules = await deliveryRules();
  const lat = Number(body.lat), lng = Number(body.lng);
  const hasPin = body.lat !== undefined && body.lat !== null && body.lat !== '' && Number.isFinite(lat) && Number.isFinite(lng) && lat > 6 && lat < 38 && lng > 68 && lng < 98;
  const base = { configured: hasKitchenPin(rules), maxKm: rules.maxKm, requirePin: rules.requirePin };
  if (!hasPin) return Response.json({ ...base }, { headers: { 'Cache-Control': 'no-store' } });
  const d = checkDelivery(rules, { lat, lng });
  return Response.json({ ...base, ok: d.ok, km: d.km, fee: d.fee, reason: d.reason, message: d.message }, { headers: { 'Cache-Control': 'no-store' } });
}
