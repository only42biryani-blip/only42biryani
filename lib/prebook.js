import { loadSettings } from '@/lib/settingsRow';
import { istNow, validTime, mins } from '@/lib/kitchenTime';
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

// The days a customer may pre-book. TODAY is offered only until your opening time (the "Ring bell from" time in
// admin, 10:30 by default), because after that the day's drop is under way. Then tomorrow and the days after it.
// The first entry is the default. word = how the banners say it ("today" / "tomorrow").
export function prebookDates(now = new Date(), openTime = '10:30') {
  const { date: today, minutes } = istNow(now);
  const out = [];
  if (validTime(openTime) && minutes < mins(openTime)) out.push({ value: today, label: `Today · ${prettyDate(today)}`, word: 'today' });
  for (let i = 1; i <= PREBOOK_DAYS; i++) {
    const value = addDays(today, i);
    out.push({ value, label: i === 1 ? `Tomorrow · ${prettyDate(value)}` : prettyDate(value), word: i === 1 ? 'tomorrow' : prettyDate(value) });
  }
  return out;
}

export const validPrebookDate = (date, now = new Date(), openTime = '10:30') => prebookDates(now, openTime).some((d) => d.value === date);

// Pre-booking settings from the settings row. Off (and nothing offered) if the pre-booking SQL has not been run.
export function prebookFromRow(row) {
  return { enabled: !!row && row.accept_prebook === true, openTime: row && validTime(row.reminder_time) ? row.reminder_time : '10:30' };
}

export async function prebookEnabled(row) {
  return prebookFromRow(row === undefined ? await loadSettings() : row).enabled;
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

// The pre-book days with how many plates are still free on each. Pass `booked` if you already have it.
export async function prebookDatesWithLeft(now = new Date(), openTime = '10:30', booked) {
  const dates = prebookDates(now, openTime);
  const taken = booked || (await bookedPlates(dates.map((d) => d.value)));
  return dates.map((d) => ({ ...d, left: Math.max(0, PREBOOK_PLATES_PER_DAY - (taken[d.value] || 0)) }));
}
