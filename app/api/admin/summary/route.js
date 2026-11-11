import { orderDb } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/adminAuth';
import { plateConfig, orderMode, orderingBlocker } from '@/lib/orders';
import { borzoConfigured } from '@/lib/borzo';
import { razorpayConfigured } from '@/lib/razorpay';
import { summarize, istDayStart } from '@/lib/summary';
import { deliveryRules } from '@/lib/deliveryRules';
import { hasKitchenPin } from '@/lib/delivery';

// Numbers for the admin "Today" tab plus a setup checklist. Admin Google login only.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const mode = orderMode();
  const cfg = plateConfig();
  const env = (k) => !!process.env[k];
  const checks = [
    { key: 'db', ok: !!orderDb(), label: 'Orders database key', fix: 'Add SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.' },
    { key: 'enabled', ok: process.env.ORDERING_ENABLED === '1', label: 'Ordering switched on', fix: 'Set ORDERING_ENABLED=1 in Vercel (last), then redeploy.' },
    { key: 'price', ok: !!cfg.price, label: `Plate price${cfg.price ? ` (₹${cfg.price})` : ''}`, fix: 'Set PLATE_PRICE in Vercel.' },
    { key: 'mode', ok: true, label: mode === 'self' ? 'Mode: you deliver, cash / UPI on delivery' : 'Mode: online payment + Borzo delivery', fix: '' },
    { key: 'hours', ok: !!cfg.hours, label: `Ordering hours${cfg.hours ? ` (${cfg.hours} IST)` : ''}`, fix: 'Optional: set ORDER_HOURS like 10:42-22:00. Without it the Go online switch alone decides.', optional: true },
  ];
  const rules = await deliveryRules();
  checks.push({
    key: 'range', ok: hasKitchenPin(rules),
    label: hasKitchenPin(rules) ? `Delivery range: ${rules.maxKm} km${rules.requirePin ? '' : ' (location optional)'}` : 'Delivery range and kitchen location',
    fix: 'Open the Delivery tab, press "Use my current location" at the kitchen and set your range. Until then any address can order.',
  });
  if (mode !== 'self') {
    checks.push({ key: 'razorpay', ok: razorpayConfigured(), label: 'Razorpay (online payment)', fix: 'Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET once Razorpay approves you.' });
    checks.push({ key: 'borzo', ok: borzoConfigured(), label: 'Borzo (delivery)', fix: 'Add BORZO_TOKEN (production) and KITCHEN_ADDRESS / KITCHEN_PHONE.' });
    checks.push({ key: 'webhook', ok: env('RAZORPAY_WEBHOOK_SECRET'), label: 'Razorpay webhook secret', fix: 'Add RAZORPAY_WEBHOOK_SECRET so payments confirm even if the customer closes the page.' });
  }
  const blocker = orderingBlocker();

  const db = orderDb();
  if (!db) return Response.json({ checks, blocker, summary: null, setup: true }, { headers: { 'Cache-Control': 'no-store' } });

  const since = new Date(istDayStart().getTime() - 7 * 86400000).toISOString(); // today + a little history for "still active"
  const { data, error } = await db.from('orders').select('status,total,qty,payment_mode,paid_by,created_at').gte('created_at', since).limit(1000);
  if (error) return Response.json({ checks, blocker, summary: null, setup: true }, { headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ checks, blocker, mode, summary: summarize(data || []) }, { headers: { 'Cache-Control': 'no-store' } });
}
