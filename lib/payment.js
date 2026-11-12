import crypto from 'node:crypto';
import { loadSettings } from '@/lib/settingsRow';
import { razorpayConfigured } from '@/lib/razorpay';

// Which ways customers may pay, decided in /admin -> Delivery & pay:
//   cod    : cash / UPI on delivery (default ON)
//   online : "off"  = Razorpay is not offered
//            "test" = only people with your secret test link can pay online (for you to try it)
//            "on"   = everyone can pay online (use only with approved LIVE Razorpay keys)
// If the payment SQL has not been run yet, we use the safe defaults: cash on delivery on, online off.
export function paymentFromRow(row) {
  if (!row) return { cod: true, online: 'off' };
  return { cod: row.accept_cod !== false, online: ['test', 'on'].includes(row.online_pay) ? row.online_pay : 'off' };
}

// Pass the settings row if you already have it; otherwise it is read here.
export async function paymentOptions(row) {
  return paymentFromRow(row === undefined ? await loadSettings() : row);
}

// A test link works for one Indian day and is made from your secret database key, so it cannot be guessed.
function istDate(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function testToken(now = new Date()) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return '';
  return crypto.createHmac('sha256', key).update(`pay-test:${istDate(now)}`).digest('hex').slice(0, 24);
}
export function validTestToken(token, now = new Date()) {
  const want = testToken(now);
  const got = String(token || '');
  if (!want || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

// May this visitor pay online right now?
export function onlineAllowed(opts, token) {
  if (!razorpayConfigured()) return false;
  if (opts.online === 'on') return true;
  return opts.online === 'test' && validTestToken(token);
}
