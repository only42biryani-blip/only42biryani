// Contact requests: a visitor who urgently needs us fills a short form instead of seeing our phone number.
// You see it in /admin -> Requests (and in Telegram). You call or WhatsApp them yourself, or press "Show our
// number": then their request page shows the number for REVEAL_HOURS, and hides it again.
export const REVEAL_HOURS = 24;

export const requestCodeOk = (code) => /^[A-Z2-9]{8}$/.test(String(code || ''));

// Is the number currently allowed to be shown for this request row?
export function revealActive(row, now = new Date()) {
  if (!row || !row.approved_at || row.status === 'done') return false;
  const t = new Date(row.approved_at).getTime();
  return Number.isFinite(t) && now.getTime() - t < REVEAL_HOURS * 3600 * 1000;
}

// What the visitor may know about their own request (no name, no phone). The kitchen number is only added by the
// route, and only when revealActive() is true.
export function publicRequest(row, now = new Date()) {
  return {
    code: row.code,
    status: row.status === 'done' ? 'done' : 'new',
    approved: revealActive(row, now),
    expiresAt: revealActive(row, now) ? new Date(new Date(row.approved_at).getTime() + REVEAL_HOURS * 3600 * 1000).toISOString() : null,
  };
}

const PHONE = /^(\+91)?[6-9]\d{9}$/;

// Checks and cleans what the visitor typed. Returns { ok, error } or { ok: true, value }.
export function validateRequest(body) {
  const name = String(body?.name || '').trim().slice(0, 80);
  const raw = String(body?.phone || '').replace(/[\s-]/g, '');
  const message = String(body?.message || '').trim().slice(0, 300);
  const orderCode = String(body?.orderCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (name.length < 2) return { ok: false, error: 'Please enter your name.' };
  if (!PHONE.test(raw)) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
  return { ok: true, value: { name, phone: `91${raw.slice(-10)}`, message, orderCode } };
}
