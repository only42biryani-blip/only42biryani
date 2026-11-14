import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { revealActive } from '@/lib/contactRequests';

// Admin only: the contact requests, and what to do with each one.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Orders database is not set up yet.', setup: true }, { status: 503 });
  const { data, error } = await db.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return Response.json({ error: 'Not set up yet. Run supabase-contact-setup.sql in Supabase.', setup: true }, { status: 500 });
  const requests = (data || []).map((r) => ({ ...r, revealed: revealActive(r) }));
  return Response.json({ requests, open: requests.filter((r) => r.status === 'new').length }, { headers: { 'Cache-Control': 'no-store' } });
}

// body: { id, action }  action = show (reveal our number to them) | hide | done | reopen
export async function PATCH(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const db = orderDb();
  if (!db) return Response.json({ error: 'Orders database is not set up yet.' }, { status: 503 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const patches = {
    show: { approved_at: new Date().toISOString(), status: 'new' },
    hide: { approved_at: null },
    done: { status: 'done', approved_at: null }, // finished: the number is hidden again
    reopen: { status: 'new' },
  };
  const patch = patches[body.action];
  if (!patch || !/^[0-9a-f-]{36}$/i.test(String(body.id || ''))) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const { data, error } = await db.from('contact_requests').update(patch).eq('id', body.id).select('id');
  if (error || !data || data.length === 0) return Response.json({ error: 'Could not update that request.' }, { status: 502 });
  return Response.json({ ok: true });
}
