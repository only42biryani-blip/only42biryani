import { supabase } from '@/lib/supabase';

// ONE database read for every setting (kitchen online, payment choices, pre-booking, delivery rules).
// The order page, the status API and the order routes used to read these one by one (five or more round trips,
// each slow from the server). Now they read once and work out the rest from the row.
// Returns the row, or null when it cannot be read (every user of it then falls back to safe defaults).
export async function loadSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle();
    return error || !data ? null : data;
  } catch {
    return null;
  }
}
