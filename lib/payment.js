import crypto from 'node:crypto';
import { supabase } from '@/lib/supabase';
import { razorpayConfigured } from '@/lib/razorpay';

// Which ways customers may pay, decided in /admin -> Delivery & pay:
//   cod    : cash / UPI on delivery (default ON)
//   online : "off"  = Razorpay is not offered
//            "test" = only people with your secret test link can pay online (for you to try it)
//            "on"   = everyone can pay online (use only with approved LIVE Razorpay keys)
// If the payment SQL has not been run yet, we use the safe defaults: cash on delivery on, online off.
export async function paymentOptions() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('accept_cod, online_pay')
      .eq('id', 1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle();
    if (error || !data) return { cod: true, online: 'off' };
    return { cod: data.accept_cod !== false, online: ['test', 'on'].includes(data.online_pay) ? data.online_pay : 'off' };
  } catch {
    return { cod: true, online: 'off' };
  }
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
