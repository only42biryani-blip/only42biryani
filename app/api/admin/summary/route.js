import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { plateConfig, orderingBlocker } from '@/lib/orders';
import { paymentOptions } from '@/lib/payment';
import { borzoConfigured } from '@/lib/borzo';
import { razorpayConfigured } from '@/lib/razorpay';
import { summarize, istDayStart } from '@/lib/summary';
import { deliveryRules } from '@/lib/deliveryRules';
import { hasKitchenPin } from '@/lib/delivery';

// Numbers for the admin "Today" tab plus a setup checklist. Admin Google login only.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const pay = await paymentOptions();
  const cfg = plateConfig();
  const env = (k) => !!process.env[k];
  const checks = [
    { key: 'db', ok: !!orderDb(), label: 'Orders database key', fix: 'Add SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.' },
    { key: 'enabled', ok: process.env.ORDERING_ENABLED === '1', label: 'Ordering switched on', fix: 'Set ORDERING_ENABLED=1 in Vercel (last), then redeploy.' },
    { key: 'price', ok: !!cfg.price, label: `Plate price${cfg.price ? ` (₹${cfg.price})` : ''}`, fix: 'Set PLATE_PRICE in Vercel.' },
    { key: 'cod', ok: pay.cod, optional: !pay.cod, label: pay.cod ? 'Cash / UPI on delivery: ON for customers' : 'Cash / UPI on delivery: OFF', fix: 'Turn it on in Delivery & pay.' },
    { key: 'online', ok: true, label: pay.online === 'on' ? 'Online payment: ON for everyone' : pay.online === 'test' ? 'Online payment: TEST only (your secret test link)' : 'Online payment: OFF for customers', fix: '' },
    { key: 'hours', ok: !!cfg.hours, label: `Ordering hours${cfg.hours ? ` (${cfg.hours} IST)` : ''}`, fix: 'Optional: set ORDER_HOURS like 10:42-22:00. Without it the Go online switch alone decides.', optional: true },
  ];
  const rules = await deliveryRules();
  checks.push({
    key: 'range', ok: hasKitchenPin(rules),
    label: hasKitchenPin(rules) ? `Delivery: ${rules.maxFee === null ? 'no cap' : `max ₹${rules.maxFee}`}, ${rules.limitRange ? `usual range ${rules.maxKm} km` : 'no distance limit'}` : 'Delivery charge and kitchen location',
    fix: 'Optional: open Delivery & pay and press "Use my current location" at the kitchen so distance-based charges work. Until then every order pays the default charge.', optional: true,
  });
  {
    const testKeys = String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_');
    const needed = pay.online !== 'off';
    checks.push({ key: 'razorpay', ok: razorpayConfigured(), optional: !needed, label: testKeys ? 'Razorpay TEST keys (fake money, no real payments)' : 'Razorpay keys', fix: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel (Razorpay approval needed for live keys).' });
    if (pay.online === 'on' && testKeys) checks.push({ key: 'testkeys-live', ok: false, label: 'Online payment is ON for everyone but the keys are TEST keys', fix: 'Customers would pay with fake money. Switch online payment to Test or Off, or add your live keys.' });
    checks.push({ key: 'webhook', ok: env('RAZORPAY_WEBHOOK_SECRET'), optional: !needed, label: 'Razorpay webhook secret', fix: 'Add RAZORPAY_WEBHOOK_SECRET so payments confirm even if the customer closes the page.' });
    checks.push({ key: 'borzo', ok: borzoConfigured(), optional: true, label: 'Borzo (optional: lets you send an order with a Borzo rider)', fix: 'Add BORZO_TOKEN (production) and KITCHEN_ADDRESS / KITCHEN_PHONE when you want it.' });
  }
  const blocker = orderingBlocker();

  const db = orderDb();
  if (!db) return Response.json({ checks, blocker, summary: null, setup: true }, { headers: { 'Cache-Control': 'no-store' } });

  const since = new Date(istDayStart().getTime() - 7 * 86400000).toISOString(); // today + a little history for "still active"
  const { data, error } = await db.from('orders').select('status,total,qty,payment_mode,paid_by,created_at').gte('created_at', since).limit(1000);
  if (error) return Response.json({ checks, blocker, summary: null, setup: true }, { headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ checks, blocker, summary: summarize(data || []) }, { headers: { 'Cache-Control': 'no-store' } });
}
