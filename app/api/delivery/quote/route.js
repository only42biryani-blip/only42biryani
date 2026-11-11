import { borzoConfigured, quoteDelivery } from '@/lib/borzo';

// Delivery price check for the (future) order page. Returns only what a customer may see:
// the fee. Borzo's token and our kitchen details never leave the server.

// Best-effort per-IP limit (20 quotes / 10 min). In-memory, so it resets when the instance recycles.
const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 20) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const bad = (message, status = 400) => Response.json({ error: message }, { status });

export async function POST(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) return bad('Forbidden', 403);
    } catch {
      return bad('Forbidden', 403);
    }
  }

  if (!borzoConfigured()) return bad('Delivery is not available yet.', 503);

  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return bad('Too many requests. Please try again in a few minutes.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }

  const address = String(body.address || '').trim().slice(0, 350);
  if (address.length < 10) return bad('Enter the full delivery address (house or flat, street, area).');

  const q = await quoteDelivery({ dropAddress: address });
  if (!q.ok) {
    const code = (q.errors || [])[0];
    if (code === 'invalid_parameters' || code === 'route_not_found') {
      return bad('We could not find that address. Check it and try again.', 422);
    }
    return bad('We could not price the delivery right now. Please try again.', 502);
  }

  return Response.json({ fee: q.customerFee, currency: 'INR' }, { headers: { 'Cache-Control': 'no-store' } });
}
