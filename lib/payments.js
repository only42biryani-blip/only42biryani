import { orderDb } from '@/lib/supabase-admin';
import { refundPayment } from '@/lib/razorpay';
import { alertOwner, orderAlert, telegramConfigured } from '@/lib/telegram';

// Marks an order paid (idempotent) and refunds automatically if the plates ran out in the meantime.
export async function settlePayment(code, paymentId) {
  const db = orderDb();
  const { data, error } = await db.rpc('mark_order_paid', { p_code: code, p_payment_id: paymentId });
  if (error) return { ok: false, result: 'error' };
  if (data === 'needs_refund') {
    const { data: row } = await db.from('orders').select('total').eq('code', code).maybeSingle();
    if (row) {
      const r = await refundPayment(paymentId, row.total);
      if (r.ok) await db.from('orders').update({ status: 'refunded', refund_id: r.id }).eq('code', code);
    }
  }
  if (telegramConfigured() && (data === 'ok' || data === 'needs_refund')) {
    const { data: o } = await db.from('orders').select('code, qty, total, customer_name, customer_phone, address, lat, lng, source, distance_km').eq('code', code).maybeSingle();
    if (o && data === 'ok') {
      alertOwner(orderAlert({ code: o.code, qty: o.qty, total: o.total, name: o.customer_name, phone: o.customer_phone, address: o.address, lat: o.lat, lng: o.lng, scheduledFor: null, paid: true, test: o.source === 'test', km: o.distance_km ?? null, outside: false }));
    } else if (o) {
      alertOwner(`⚠️ Order ${o.code} was paid after the plates sold out. It is being refunded automatically (₹${o.total}). Nothing to cook.`);
    }
  }
  return { ok: true, result: data };
}
