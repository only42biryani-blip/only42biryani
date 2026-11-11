import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase';

// Server-only database client with the secret service-role key. It can read and write the orders
// table, which the public key cannot. Never import this from a client component.
// Set SUPABASE_SERVICE_ROLE_KEY in Vercel (Project Settings -> Environment Variables), never in code.
let client = null;

export function orderDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!client) client = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
