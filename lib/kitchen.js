import { supabase } from '@/lib/supabase';

// Is the kitchen ONLINE right now? You switch it on in /admin ("Go online") and it switches itself off at the
// time you chose, so every day starts offline until you press the button again.
// Server-side only. If the kitchen-switch SQL has not been run yet, we do NOT block anything (returns true).
export async function kitchenOnline() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('online_until')
      .eq('id', 1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle();
    if (error || !data) return true;
    return data.online_until ? new Date(data.online_until).getTime() > Date.now() : false;
  } catch {
    return true;
  }
}

export const OFFLINE_MESSAGE = 'We are offline right now. Please check back when the kitchen is open.';
