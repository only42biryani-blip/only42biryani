import { orderDb } from '@/lib/supabase-admin';
import { refundPayment } from '@/lib/razorpay';

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
  return { ok: true, result: data };
}
