import { orderDb } from '@/lib/supabase-admin';
import { clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { requestCodeOk, publicRequest } from '@/lib/contactRequests';
import { kitchenContact } from '@/lib/kitchenContact';

// The visitor's own request page asks this. The kitchen number is included ONLY while you have approved it
// (admin -> Requests -> Show our number) and the time window has not passed. The code is the visitor's key.
export async function GET(request, { params }) {
  const { code } = await params;
  if (!requestCodeOk(code)) return bad('Request not found.', 404);
  if (rateLimited('contact-status', clientIp(request), 90, 10 * 60 * 1000)) return bad('Too many requests.', 429);
  const db = orderDb();
  if (!db) return bad('Not available.', 503);
  const { data: row } = await db.from('contact_requests').select('code,status,approved_at').eq('code', code).maybeSingle();
  if (!row) return bad('Request not found.', 404);
  const pub = publicRequest(row);
  const body = pub.approved ? { ...pub, phone: kitchenContact().phone, tel: kitchenContact().tel, whatsapp: kitchenContact().whatsapp } : pub;
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
