import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { borzoConfigured } from '@/lib/borzo';
import { deliveryRules } from '@/lib/deliveryRules';
import { loadSettings } from '@/lib/settingsRow';
import { STATUS_LABEL, plateConfig, newCode, validateOrder, priceOrder, hardMaxQty } from '@/lib/orders';

async function limitKm() {
  const r = await deliveryRules();
  return r.limitRange ? r.maxKm : null; // null = no distance limit, nothing is flagged TOO FAR
}

// Latest orders for the admin order board. Admin Google login only.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Ordering database is not set up yet.', setup: true }, { status: 503 });

  await db.rpc('release_expired_holds'); // put plates back for unpaid holds
  const { data, error } = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(150);
  if (error) return Response.json({ error: 'Could not load orders. Has supabase-orders-setup.sql been run?', setup: true }, { status: 500 });

  // Unpaid carts are noise on the kitchen board: show paid and later, plus problems.
  const orders = (data || [])
    .filter((o) => o.status !== 'pending_payment' && o.status !== 'expired')
    .map((o) => ({ ...o, label: STATUS_LABEL[o.status] || o.status }));
  return Response.json({ orders, borzo: borzoConfigured(), maxKm: await limitKm() }, { headers: { 'Cache-Control': 'no-store' } });
}

// Enter an order by hand (for example one that arrived on WhatsApp). Admin Google login only.
// Same rules and the same offer as website orders; the plates come off the daily count too.
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Ordering database is not set up yet.' }, { status: 503 });
  const row = await loadSettings();
  const cfg = plateConfig(row);
  if (!cfg.price) return Response.json({ error: 'Set the plate price first (Delivery & pay -> Price and offer).' }, { status: 409 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const v = validateOrder(body, hardMaxQty(row)); // up to a whole day's batch (5 until supabase-qty-setup.sql is run)
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  const o = v.value;

  const pct = body.discountPercent === undefined || body.discountPercent === '' ? cfg.offerPercent : Math.min(100, Math.max(0, Number(body.discountPercent) || 0));
  const fee = body.deliveryFee === undefined || body.deliveryFee === '' ? cfg.selfFee : Math.max(0, Number(body.deliveryFee) || 0);
  const p = priceOrder(o.qty, { ...cfg, offerPercent: pct }, fee);
  const code = newCode();

  const { error } = await db.rpc('place_self_order', {
    p_code: code, p_qty: o.qty, p_mrp: p.mrp, p_discount_percent: p.discountPercent, p_discount_amount: p.discountAmount,
    p_plate_price: p.net, p_delivery_fee: p.deliveryFee, p_total: p.total,
    p_name: o.name, p_phone: o.phone, p_email: o.email, p_address: o.address, p_note: o.note,
    p_lat: o.lat, p_lng: o.lng, p_source: 'manual',
  });
  if (error) {
    if (/sold_out/i.test(error.message || '')) return Response.json({ error: 'Not enough plates left today.' }, { status: 409 });
    return Response.json({ error: 'Could not save the order. Has supabase-selfdelivery-setup.sql been run?' }, { status: 502 });
  }
  return Response.json({ ok: true, code, total: p.total });
}
