import { supabase } from '@/lib/supabase';
import { istNow } from '@/lib/kitchenTime';

// Pre-booking: when the kitchen is offline (or today is sold out), customers can book for the next day.
// Pure date helpers + one server read. All dates are Indian (IST) calendar dates like "2026-11-13".

export const PREBOOK_DAYS = 7; // tomorrow and the six days after it
export const PREBOOK_PLATES_PER_DAY = 42;

const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const prettyDate = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// The days a customer may pre-book, tomorrow first (that is the default).
export function prebookDates(now = new Date()) {
  const today = istNow(now).date;
  return Array.from({ length: PREBOOK_DAYS }, (_, i) => {
    const value = addDays(today, i + 1);
    return { value, label: i === 0 ? `Tomorrow · ${prettyDate(value)}` : prettyDate(value) };
  });
}

export const validPrebookDate = (date, now = new Date()) => prebookDates(now).some((d) => d.value === date);

// Has the owner switched pre-booking on (Delivery & pay tab)? If the SQL has not been run yet this is false.
export async function prebookEnabled() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('accept_prebook')
      .eq('id', 1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle();
    return !error && !!data && data.accept_prebook === true;
  } catch {
    return false;
  }
}
