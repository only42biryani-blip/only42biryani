import { requireAdmin } from '@/lib/adminAuth';
import { testToken } from '@/lib/payment';

// Your private link for testing online payment while customers only see cash on delivery. Admin login only.
// It stops working at midnight IST and cannot be guessed (it is made from your secret database key).
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const t = testToken();
  if (!t) return Response.json({ error: 'The database key is not set in Vercel yet.' }, { status: 409 });
  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/order?t=${t}` }, { headers: { 'Cache-Control': 'no-store' } });
}
