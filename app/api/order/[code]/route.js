import { orderDb } from '@/lib/supabase-admin';
import { STATUS_LABEL } from '@/lib/orders';
import { clientIp, rateLimited, bad } from '@/lib/apiGuard';

// Public order status for the tracking page. The 8-character code is the "key", so the response only
// contains what the customer needs: no phone number, email or full address.
export async function GET(request, { params }) {
  const { code } = await params;
  if (!/^[A-Z2-9]{8}$/.test(code || '')) return bad('Order not found.', 404);
  if (rateLimited('order-status', clientIp(request), 120, 10 * 60 * 1000)) return bad('Too many requests.', 429);
  const db = orderDb();
  if (!db) return bad('Not available.', 503);

  const base = 'code,status,qty,total,customer_name,borzo_status,tracking_url,courier_name,courier_phone,created_at,hold_expires_at';
  let { data: o, error } = await db.from('orders').select(`${base},payment_mode,scheduled_for`).eq('code', code).maybeSingle();
  if (error) ({ data: o, error } = await db.from('orders').select(`${base},payment_mode`).eq('code', code).maybeSingle()); // before the pre-booking SQL has been run
  if (error) ({ data: o } = await db.from('orders').select(base).eq('code', code).maybeSingle()); // before the self-delivery SQL has been run
  if (!o) return bad('Order not found.', 404);

  return Response.json(
    {
      code: o.code,
      status: o.status,
      label: STATUS_LABEL[o.status] || o.status,
      qty: o.qty,
      total: o.total,
      paymentMode: o.payment_mode,
      scheduledFor: o.scheduled_for || null,
      firstName: String(o.customer_name || '').split(' ')[0],
      trackingUrl: o.tracking_url,
      courierName: o.courier_name,
      courierPhone: o.courier_phone,
      createdAt: o.created_at,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
