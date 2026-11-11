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

  const { data: o } = await db
    .from('orders')
    .select('code,status,qty,total,customer_name,borzo_status,tracking_url,courier_name,courier_phone,created_at,hold_expires_at')
    .eq('code', code)
    .maybeSingle();
  if (!o) return bad('Order not found.', 404);

  return Response.json(
    {
      code: o.code,
      status: o.status,
      label: STATUS_LABEL[o.status] || o.status,
      qty: o.qty,
      total: o.total,
      firstName: String(o.customer_name || '').split(' ')[0],
      trackingUrl: o.tracking_url,
      courierName: o.courier_name,
      courierPhone: o.courier_phone,
      createdAt: o.created_at,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
