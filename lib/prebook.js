import { supabase } from '@/lib/supabase';
import { istNow } from '@/lib/kitchenTime';
import { orderDb } from '@/lib/supabase-admin';

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

// Plates already pre-booked for each of the given dates: { '2026-11-13': 3, ... }. Server only.
// Cancelled / refunded / expired bookings do not count. Returns {} when it cannot be read.
export async function bookedPlates(dates) {
  try {
    const db = orderDb();
    if (!db || !dates.length) return {};
    const { data, error } = await db.from('orders').select('scheduled_for, qty, status').in('scheduled_for', dates);
    if (error || !data) return {};
    const out = {};
    for (const o of data) {
      if (['cancelled', 'refunded', 'expired'].includes(o.status)) continue;
      out[o.scheduled_for] = (out[o.scheduled_for] || 0) + Number(o.qty || 0);
    }
    return out;
  } catch {
    return {};
  }
}

// The pre-book days with how many plates are still free on each.
export async function prebookDatesWithLeft(now = new Date()) {
  const dates = prebookDates(now);
  const booked = await bookedPlates(dates.map((d) => d.value));
  return dates.map((d) => ({ ...d, left: Math.max(0, PREBOOK_PLATES_PER_DAY - (booked[d.value] || 0)) }));
}
