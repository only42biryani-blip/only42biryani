// Time rules for the daily Go online switch. Pure functions (no database), all in Indian time (IST).
const IST = 5.5 * 60 * 60 * 1000;

export const validTime = (t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t || '').trim());
export const mins = (t) => {
  const [h, m] = String(t).trim().split(':').map(Number);
  return h * 60 + m;
};

export function istNow(now = new Date()) {
  const d = new Date(now.getTime() + IST);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

// The moment (a Date) when today's closing time happens, or null if that time has already passed.
export function closingInstant(closeTime, now = new Date()) {
  if (!validTime(closeTime)) return null;
  const { date } = istNow(now);
  const [h, m] = closeTime.trim().split(':');
  const at = new Date(`${date}T${h.padStart(2, '0')}:${m}:00+05:30`);
  return at.getTime() > now.getTime() ? at : null;
}

export const isOnline = (onlineUntil, now = new Date()) => !!onlineUntil && new Date(onlineUntil).getTime() > now.getTime();

// Automatic daily opening: from `auto_online_time` (e.g. 11:00) until the closing time, every day, unless the owner
// pressed Go offline / Stay offline today (that saves today's date in `auto_off_day`). Empty time = switched off.
export function autoEnabled(row) {
  return !!row && validTime(row.auto_online_time);
}

export function autoOnlineNow(row, now = new Date()) {
  if (!autoEnabled(row)) return false;
  const { date, minutes } = istNow(now);
  if (row.auto_off_day === date) return false;
  const close = validTime(row.close_time) ? row.close_time : '22:00';
  return minutes >= mins(row.auto_online_time) && minutes < mins(close);
}

// Is the kitchen open to customers right now? Either switched on by hand until closing, or the automatic opening.
export const kitchenOpenNow = (row, now = new Date()) => isOnline(row?.online_until, now) || autoOnlineNow(row, now);

// The bell is a MORNING reminder: it rings for RING_WINDOW_MIN minutes from the bell time while you are still
// offline, then stays quiet for the rest of the day (and never after closing time).
export const RING_WINDOW_MIN = 60;

export function bellDue({ onlineUntil, reminderTime, closeTime, now = new Date() }) {
  if (isOnline(onlineUntil, now) || !validTime(reminderTime) || !validTime(closeTime)) return false;
  const t = istNow(now).minutes;
  const start = mins(reminderTime);
  const end = Math.min(mins(closeTime), start + RING_WINDOW_MIN);
  return t >= start && t < end;
}

// "11:00" -> "11:00 AM" (a clock time written as HH:MM, not a date)
export function prettyClock(t) {
  const m = mins(t);
  return `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'AM' : 'PM'}`;
}

export const prettyTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
