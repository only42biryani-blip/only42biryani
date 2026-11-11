import { supabase } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/config';

// Server-side admin check for API routes. The admin page sends its Google-login access token in
// "Authorization: Bearer <token>"; Supabase verifies it, and we accept only the admin Google account.
// Returns null when the caller is the admin, or a Response to send back when not.
export async function requireAdmin(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  const isAdmin =
    !error && user && user.email === ADMIN_EMAIL && user.app_metadata?.provider === 'google';
  if (!isAdmin) return Response.json({ error: 'Not allowed' }, { status: 403 });
  return null;
}
