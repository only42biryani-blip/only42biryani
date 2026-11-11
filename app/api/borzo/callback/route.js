import crypto from 'node:crypto';
import { orderDb } from '@/lib/supabase-admin';

// Borzo -> us. Updates the order when a rider is assigned, picks the food up, or delivers it.
// In the Borzo cabinet (Integration tab) set the Callback URL to this address and enable delivery
// callbacks; put the Callback Secret Key in BORZO_CALLBACK_SECRET.
// Borzo signs the body with HMAC-SHA256 in the X-DV-Signature header and retries until we answer 2xx.
function validSignature(raw, signature) {
  const secret = process.env.BORZO_CALLBACK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('x-dv-signature'))) {
    return Response.json({ error: 'Bad signature' }, { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }
  const db = orderDb();
  if (!db) return Response.json({ ok: true });

  // Order-level events
  if (event.order) {
    const o = event.order;
    const drop = (o.points || [])[1] || {};
    const code = drop.client_order_id || (o.points || [])[0]?.client_order_id;
    if (!code) return Response.json({ ok: true });
    const patch = { borzo_status: o.status || null };
    if (drop.tracking_url) patch.tracking_url = drop.tracking_url;
    if (o.courier) {
      patch.courier_name = [o.courier.name, o.courier.surname].filter(Boolean).join(' ') || null;
      patch.courier_phone = o.courier.phone || null;
    }
    if (o.status === 'completed') {
      patch.status = 'delivered';
      patch.delivered_at = new Date().toISOString();
    }
    await db.from('orders').update(patch).eq('code', code).not('status', 'in', '(cancelled,refunded)');
    return Response.json({ ok: true });
  }

  // Delivery-level events (more detailed statuses)
  if (event.delivery) {
    const d = event.delivery;
    const code = d.client_order_id;
    if (!code) return Response.json({ ok: true });
    const patch = { borzo_status: d.status || null };
    if (d.tracking_url) patch.tracking_url = d.tracking_url;
    if (d.courier) {
      patch.courier_name = [d.courier.name, d.courier.surname].filter(Boolean).join(' ') || null;
      patch.courier_phone = d.courier.phone || null;
    }
    if (d.status === 'parcel_picked_up' || d.status === 'courier_arrived') patch.status = 'dispatched';
    if (d.status === 'finished') {
      patch.status = 'delivered';
      patch.delivered_at = new Date().toISOString();
    }
    await db.from('orders').update(patch).eq('code', code).not('status', 'in', '(cancelled,refunded)');
  }
  return Response.json({ ok: true });
}
