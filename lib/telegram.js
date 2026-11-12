import { after } from 'next/server';
import { SITE_URL } from '@/lib/config';

// Instant phone alerts through a Telegram bot (free). Set in Vercel (both as Secret):
//   TELEGRAM_BOT_TOKEN   the token BotFather gave you
//   TELEGRAM_CHAT_ID     the number of your chat with the bot (or of a group it is in)
// Nothing here can break an order: failures are only logged, and alerts are sent after the customer already has
// their answer.
export const telegramConfigured = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

export async function sendTelegram(text) {
  if (!telegramConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: String(text).slice(0, 3500), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      console.error('Telegram alert failed:', res.status, d?.description || '');
      return { ok: false, error: d?.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('Telegram alert failed:', e?.message || e);
    return { ok: false, error: 'network' };
  }
}

// Fire-and-forget: sends after the response is finished (so the customer never waits for it).
export function alertOwner(text) {
  if (!telegramConfigured()) return;
  const job = () => sendTelegram(text);
  try {
    after(job);
  } catch {
    job(); // not inside a request (for example in a script): just send it
  }
}

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const day = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// One new-order message. `o` = { code, qty, total, name, phone, address, lat, lng, scheduledFor, paid, test, km, outside }
export function orderAlert(o) {
  const lines = [
    `${o.test ? '🧪 TEST ORDER' : o.scheduledFor ? '📅 PRE-BOOKED ORDER' : '🆕 NEW ORDER'} ${o.code}`,
    `${o.qty} plate${o.qty > 1 ? 's' : ''} · ${rupees(o.total)} · ${o.paid ? 'PAID online' : 'cash / UPI on delivery'}`,
  ];
  if (o.scheduledFor) lines.push(`For ${day(o.scheduledFor)}`);
  lines.push(`${o.name} · ${o.phone}`, o.address);
  if (o.lat !== null && o.lat !== undefined && o.lng !== null && o.lng !== undefined) lines.push(`Map: https://maps.google.com/?q=${o.lat},${o.lng}`);
  if (o.km !== null && o.km !== undefined) lines.push(`About ${o.km} km away${o.outside ? ' · TOO FAR (beyond your usual range)' : ''}`);
  lines.push(`Open: ${SITE_URL}/admin`);
  return lines.join('\n');
}
