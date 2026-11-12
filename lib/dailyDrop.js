import { orderDb } from '@/lib/supabase-admin';
import { autoEnabled, istNow, kitchenOpenNow } from '@/lib/kitchenTime';
import { TOTAL_PLATES } from '@/lib/config';

// With automatic opening on, the day's plates must also start by themselves. The first time the kitchen is open
// on a new day (settings.drop_date is not today) the plate count is reset to the day's plates minus what was
// pre-booked for today. The database function does it once per day, safely, even if many visitors arrive at the
// same moment. The admin dashboard also marks the day as started when you change the plates by hand while the
// kitchen is open, so the reset never overwrites your own count.
export function dropDue(row, now = new Date()) {
  return autoEnabled(row) && row.drop_date !== istNow(now).date && kitchenOpenNow(row, now);
}

// If the reset fails (for example the SQL file was not run), do not hammer the database on every request.
const RETRY_AFTER_MS = 60 * 1000;
let failedAt = 0;
export const resetDropRetry = () => { failedAt = 0; };

// Returns the plates left after the reset, or null when nothing was needed (or it could not be done).
export async function ensureDailyDrop(row, now = new Date()) {
  if (!dropDue(row, now)) return null;
  if (Date.now() - failedAt < RETRY_AFTER_MS) return null;
  const db = orderDb();
  if (!db) return null;
  try {
    const { data, error } = await db.rpc('ensure_daily_drop', { p_today: istNow(now).date, p_total: TOTAL_PLATES });
    if (error || typeof data !== 'number') throw new Error(error?.message || 'no count returned');
    failedAt = 0;
    return data;
  } catch (e) {
    failedAt = Date.now();
    console.error('Daily plate reset failed (is supabase-autoopen-setup.sql run?):', e?.message || e);
    return null;
  }
}
