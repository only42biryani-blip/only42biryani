import { orderDb } from '@/lib/supabase-admin';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { settlePayment } from '@/lib/payments';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';

// Called by the browser right after Razorpay Checkout succeeds. The payment signature is checked
// on the server; only then is the order marked paid. (The Razorpay webhook is the safety net.)
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('order-verify', clientIp(request), 20, 10 * 60 * 1000)) return bad('Too many attempts.', 429);
  const db = orderDb();
  if (!db) return bad('Online ordering is not open yet.', 503);

  let b;
  try {
    b = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  const code = String(b.code || '');
  const paymentId = String(b.razorpay_payment_id || '');
  const orderId = String(b.razorpay_order_id || '');
  const signature = String(b.razorpay_signature || '');
  if (!code || !paymentId || !orderId || !signature) return bad('Invalid request.');

  const { data: row } = await db.from('orders').select('razorpay_order_id').eq('code', code).maybeSingle();
  if (!row || row.razorpay_order_id !== orderId) return bad('Order not found.', 404);
  if (!verifyPaymentSignature(orderId, paymentId, signature)) return bad('Payment could not be verified.', 400);

  const r = await settlePayment(code, paymentId);
  if (!r.ok) return bad('We could not confirm your payment yet. If money was taken, you will get a refund or your order will confirm shortly.', 502);
  return Response.json({ ok: true, code, result: r.result });
}
