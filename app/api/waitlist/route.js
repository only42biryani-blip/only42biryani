import { supabase } from '@/lib/supabase';
import { alertOwner } from '@/lib/telegram';

const PHONE_PATTERN = /^(\+91)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-IP limit (5 signups / 10 min). In-memory, so it resets when the
// serverless instance recycles; it only needs to slow down casual abuse.
const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const bad = (message, status = 400) => Response.json({ error: message }, { status });

export async function POST(request) {
  // Only accept submissions coming from our own pages.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) return bad('Forbidden', 403);
    } catch {
      return bad('Forbidden', 403);
    }
  }

  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return bad('Too many attempts. Please try again in a few minutes.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }

  // Hidden field real visitors never fill in; bots often do. Pretend it worked.
  if (body.website) return Response.json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').replace(/[\s-]/g, '');
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const source = String(body.source || '').trim().slice(0, 60) || null;

  if (!name) return bad('Enter your name.');
  if (!PHONE_PATTERN.test(phone)) return bad('Enter a valid 10-digit mobile number.');
  if (!EMAIL_PATTERN.test(email)) return bad('Enter a valid email address.');

  const base = { name, phone, email };
  let { error } = await supabase.from('waitlist').insert([
    // The form shows the notice right above the button; joining is recorded as agreeing to it.
    { ...base, consent: true, consented_at: new Date().toISOString(), source },
  ]);

  // Columns from supabase-launch-setup.sql not created yet: save the basics instead.
  if (error && (error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
    ({ error } = await supabase.from('waitlist').insert([base]));
  }

  // Already on the list counts as success.
  if (error && error.code !== '23505') {
    return bad('We could not save your details right now. Please try again.', 502);
  }

  if (!error) alertOwner(`👋 New waitlist signup\n${name} · ${phone}`); // new people only (not someone already on the list)
  return Response.json({ ok: true });
}

export async function GET() {
  const { data, error } = await supabase.rpc('waitlist_count');
  const count = error ? 0 : Number(data) || 0;
  return Response.json(
    { count },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
  );
}
