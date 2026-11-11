import { supabase } from '@/lib/supabase';
import { rulesFromRow, DEFAULT_RULES } from '@/lib/delivery';

// Server only: reads your delivery range and charges from the settings table (public read).
// If the delivery SQL has not been run yet, the defaults apply and nothing is blocked (no kitchen pin = no check).
export async function deliveryRules() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('kitchen_lat, kitchen_lng, max_km, free_km, base_fee, per_km_fee, require_pin')
      .eq('id', 1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle();
    if (error || !data) return { ...DEFAULT_RULES };
    return rulesFromRow(data);
  } catch {
    return { ...DEFAULT_RULES };
  }
}
