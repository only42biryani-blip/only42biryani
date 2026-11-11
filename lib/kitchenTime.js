// Time rules for the daily Go online switch. Pure functions (no database), all in Indian time (IST).
const IST = 5.5 * 60 * 60 * 1000;

export const validTime = (t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t || '').trim());
const mins = (t) => {
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

export const prettyTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
