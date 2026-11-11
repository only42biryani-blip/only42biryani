import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { STATUS_LABEL } from '@/lib/orders';

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
  return Response.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
}
