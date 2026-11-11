import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { bookDelivery, cancelDelivery } from '@/lib/borzo';
import { refundPayment } from '@/lib/razorpay';
import { sanitizeBill } from '@/lib/bill';

// Kitchen actions on one order. Admin Google login only.
//   GET        - the full order (used by the bill page)
//   confirm    - you confirmed the order (the customer sees "Order confirmed")
//   save_bill  - save an edited bill; the server recalculates the total (pay-on-delivery orders only)
//   preparing  - the kitchen started on it
//   out        - you are delivering it yourself now (no rider booking)
//   dispatch   - the food is (nearly) ready: book the Borzo rider now
//   delivered  - mark delivered; body.paid_by = "cash" or "upi" records how a pay-on-delivery order was paid
//   cancel     - cancel + refund; body.restore = true puts the plate back in stock
export async function GET(request, { params }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Ordering database is not set up yet.' }, { status: 503 });
  const { code } = await params;
  const { data: o } = await db.from('orders').select('*').eq('code', code).maybeSingle();
  if (!o) return Response.json({ error: 'Order not found.' }, { status: 404 });
  return Response.json({ order: o }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request, { params }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Ordering database is not set up yet.' }, { status: 503 });

  const { code } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const action = String(body.action || '');
  const { data: o } = await db.from('orders').select('*').eq('code', code).maybeSingle();
  if (!o) return Response.json({ error: 'Order not found.' }, { status: 404 });

  if (action === 'confirm') {
    if (!['new', 'paid'].includes(o.status)) return Response.json({ error: 'Only a new order can be confirmed.' }, { status: 409 });
    const { error } = await db.from('orders').update({ status: 'confirmed' }).eq('code', code);
    if (error) return Response.json({ error: 'Could not confirm the order. Try again.' }, { status: 502 });
    await db.from('orders').update({ confirmed_at: new Date().toISOString() }).eq('code', code); // best effort: needs supabase-bill-setup.sql
    return Response.json({ ok: true });
  }

  if (action === 'save_bill') {
    if (o.payment_mode !== 'cod') return Response.json({ error: 'This order was paid online, so its bill cannot be changed.' }, { status: 409 });
    if (['cancelled', 'refunded'].includes(o.status)) return Response.json({ error: 'This order is closed.' }, { status: 409 });
    const v = sanitizeBill(body.bill);
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    const t = v.totals;
    const patch = {
      bill: v.bill,
      total: t.total,
      delivery_fee: t.fee,
      discount_amount: t.discountAmount,
      discount_percent: t.discountType === 'percent' ? t.discountValue : 0,
    };
    if (v.bill.customer.name) patch.customer_name = v.bill.customer.name;
    if (v.bill.customer.phone.length >= 10) patch.customer_phone = v.bill.customer.phone;
    if (v.bill.customer.address.length >= 5) patch.address = v.bill.customer.address;
    const { error } = await db.from('orders').update(patch).eq('code', code);
    if (error) return Response.json({ error: 'Could not save the bill. Has supabase-bill-setup.sql been run?' }, { status: 502 });
    const { data: fresh } = await db.from('orders').select('*').eq('code', code).maybeSingle();
    return Response.json({ ok: true, order: fresh });
  }

  if (action === 'preparing') {
    if (!['paid', 'new', 'confirmed'].includes(o.status)) return Response.json({ error: 'Only a new or confirmed order can be started.' }, { status: 409 });
    await db.from('orders').update({ status: 'preparing' }).eq('code', code);
    return Response.json({ ok: true });
  }

  if (action === 'out') {
    if (!['new', 'paid', 'confirmed', 'preparing', 'ready'].includes(o.status)) return Response.json({ error: 'This order cannot go out for delivery now.' }, { status: 409 });
    await db.from('orders').update({ status: 'dispatched', ready_at: new Date().toISOString() }).eq('code', code);
    return Response.json({ ok: true });
  }

  if (action === 'dispatch') {
    if (!['new', 'paid', 'confirmed', 'preparing'].includes(o.status)) return Response.json({ error: 'This order cannot be dispatched now.' }, { status: 409 });
    if (o.borzo_order_id) return Response.json({ error: 'A rider is already booked for this order.' }, { status: 409 });
    const r = await bookDelivery({
      dropAddress: o.address,
      dropPhone: o.customer_phone,
      dropName: o.customer_name,
      note: o.note,
      clientOrderId: o.code,
      thermobox: process.env.BORZO_THERMOBOX === '1',
    });
    if (!r.ok) {
      const code0 = (r.errors || [])[0];
      const msg =
        code0 === 'insufficient_balance' ? 'Borzo balance is too low. Top it up, then try again.'
        : code0 === 'order_is_duplicate' ? 'Borzo says this looks like a duplicate booking. Check the Borzo order list.'
        : `Rider booking failed (${code0 || 'unknown'}). Try again or book in the Borzo app.`;
      return Response.json({ error: msg }, { status: 502 });
    }
    await db
      .from('orders')
      .update({ status: 'ready', ready_at: new Date().toISOString(), borzo_order_id: r.orderId, borzo_status: r.status })
      .eq('code', code);
    return Response.json({ ok: true, borzoOrderId: r.orderId });
  }

  if (action === 'delivered') {
    const patch = { status: 'delivered', delivered_at: new Date().toISOString() };
    if (o.payment_mode === 'cod') {
      const by = String(body.paid_by || '').toLowerCase();
      if (by !== 'cash' && by !== 'upi') return Response.json({ error: 'Choose how the customer paid: cash or UPI.' }, { status: 400 });
      patch.paid_by = by;
      patch.paid_at = new Date().toISOString();
    }
    await db.from('orders').update(patch).eq('code', code);
    return Response.json({ ok: true });
  }

  if (action === 'cancel') {
    if (['delivered', 'cancelled', 'refunded'].includes(o.status)) return Response.json({ error: 'Already closed.' }, { status: 409 });
    let riderNote = '';
    if (o.borzo_order_id && o.status !== 'dispatched') {
      const c = await cancelDelivery(o.borzo_order_id);
      if (!c.ok) riderNote = ' The Borzo rider booking could not be cancelled automatically; cancel it in the Borzo app.';
    }
    await db.rpc('cancel_order', { p_code: code, p_restore: Boolean(body.restore) });
    if (o.razorpay_payment_id) {
      const rf = await refundPayment(o.razorpay_payment_id, o.total);
      if (!rf.ok) return Response.json({ error: `Order cancelled but the refund failed (${rf.error}). Refund it in the Razorpay dashboard.${riderNote}` }, { status: 502 });
      await db.from('orders').update({ status: 'refunded', refund_id: rf.id }).eq('code', code);
    }
    return Response.json({ ok: true, note: riderNote.trim() });
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
