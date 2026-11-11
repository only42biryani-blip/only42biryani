import { orderDb } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { settlePayment } from '@/lib/payments';

// Razorpay -> us. Confirms payments even if the customer closed the browser before it returned.
// In the Razorpay dashboard add this URL (Settings -> Webhooks) with the events payment.captured and order.paid,
// and set the same secret in RAZORPAY_WEBHOOK_SECRET.
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature(raw, signature)) return Response.json({ error: 'Bad signature' }, { status: 400 });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }
  const db = orderDb();
  if (!db) return Response.json({ ok: true });

  const payment = event?.payload?.payment?.entity;
  const rzOrderId = payment?.order_id || event?.payload?.order?.entity?.id;
  const paymentId = payment?.id;
  if (!rzOrderId || !paymentId) return Response.json({ ok: true });
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') return Response.json({ ok: true });

  const { data: row } = await db.from('orders').select('code').eq('razorpay_order_id', rzOrderId).maybeSingle();
  if (row) await settlePayment(row.code, paymentId);
  return Response.json({ ok: true });
}
