import { orderDb } from '@/lib/supabase-admin';
import { newCode } from '@/lib/orders';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';
import { validateRequest } from '@/lib/contactRequests';
import { alertOwner } from '@/lib/telegram';
import { SITE_URL } from '@/lib/config';

// A visitor who urgently needs us asks for contact here. Our phone number is never returned from this route;
// you decide in /admin -> Requests whether to call them, WhatsApp them or show them our number.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('contact-request', clientIp(request), 4, 10 * 60 * 1000)) return bad('Too many attempts. Please try again in a few minutes.', 429);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  if (body.website) return Response.json({ ok: true, code: 'AAAAAAAA' }); // honeypot: pretend it worked
  const v = validateRequest(body);
  if (!v.ok) return bad(v.error);
  const db = orderDb();
  if (!db) return bad('Contact requests are not available right now. Please email us instead.', 503);

  // The same phone number asking again within 30 minutes gets the same request (no duplicates).
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: dup, error: dupErr } = await db.from('contact_requests').select('code').eq('phone', v.value.phone).eq('status', 'new').gte('created_at', since).limit(1);
  if (dupErr) return bad('Contact requests are not set up yet. Please email us instead.', 503);
  if (dup && dup.length) return Response.json({ ok: true, code: dup[0].code }, { headers: { 'Cache-Control': 'no-store' } });

  const code = newCode();
  const { error } = await db.from('contact_requests').insert([{ code, name: v.value.name, phone: v.value.phone, message: v.value.message || null, order_code: v.value.orderCode || null }]);
  if (error) return bad('We could not save your request. Please try again.', 502);

  alertOwner([
    `📞 CONTACT REQUEST ${code}`,
    `${v.value.name} · +${v.value.phone}`,
    v.value.orderCode ? `About order ${v.value.orderCode}` : '',
    v.value.message ? `"${v.value.message}"` : '',
    `Call or WhatsApp them, or press "Show our number": ${SITE_URL}/admin (Requests tab)`,
  ].filter(Boolean).join('\n'));
  return Response.json({ ok: true, code }, { headers: { 'Cache-Control': 'no-store' } });
}
