// Daily Go online switch: time rules, gating of customer orders, and the Today numbers. FAKE database.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_kitchentest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'lib'), { recursive: true });
fs.mkdirSync(path.join(T, 'routes'), { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
const rewrite = (src, rel) => src.replace(/from 'next\/server'/g, "from 'next/server.js'").replace(/from '@\/lib\/([\w-]+)'/g, (_, n) => `from '${rel}${n}.js'`);
for (const f of ['orders', 'razorpay', 'borzo', 'payments', 'apiGuard', 'config', 'kitchen', 'kitchenTime', 'summary', 'deliveryRules', 'delivery', 'payment', 'prebook', 'kitchenTime', 'settingsRow', 'dailyDrop', 'telegram', 'config']) {
  fs.writeFileSync(path.join(T, 'lib', f + '.js'), rewrite(fs.readFileSync(`${REPO}/lib/${f}.js`, 'utf8'), './'));
}
fs.writeFileSync(path.join(T, 'routes', 'place.js'), rewrite(fs.readFileSync(`${REPO}/app/api/order/place/route.js`, 'utf8'), '../lib/'));
fs.writeFileSync(path.join(T, 'routes', 'summary.js'), rewrite(fs.readFileSync(`${REPO}/app/api/admin/summary/route.js`, 'utf8'), '../lib/'));
fs.writeFileSync(path.join(T, 'lib', 'adminAuth.js'), `export async function requireAdmin(r){ return r.headers.get('authorization')==='Bearer ADMIN' ? null : Response.json({error:'x'},{status:403}); }`);
fs.writeFileSync(path.join(T, 'lib', 'supabase.js'), `
export const store = { row: { online_until: null }, error: false, throwIt: false };
export const supabase = { from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: async () => {
  if (store.throwIt) throw new Error('network');
  return store.error ? { data: null, error: { message: 'column missing' } } : { data: store.row, error: null };
} }) }) }) }) };`);
fs.writeFileSync(path.join(T, 'lib', 'supabase-admin.js'), `
export const orders = []; export const dup = { rows: [] }; export const placed = []; export const drops = []; export const dropMode = { fail: false, left: 41, order: [] };
const db = {
  rpc: async (n, a) => { if (n === 'ensure_daily_drop') { drops.push(a); dropMode.order.push('drop'); return dropMode.fail ? { data: null, error: { message: 'function missing' } } : { data: dropMode.left, error: null }; } if (n === 'place_self_order') { dropMode.order.push('place'); placed.push(a); return { error: null }; } return { data: 0, error: null }; },
  from: () => { const q = { select: () => q, gte: () => q, eq: () => q, is: () => q, neq: () => { q._dup = true; return q; }, limit: async () => ({ data: q._dup ? dup.rows : orders, error: null }) }; return q; },
};
export const orderDb = () => (process.env.SUPABASE_SERVICE_ROLE_KEY ? db : null);`);

Object.assign(process.env, { ORDERING_ENABLED: '1', ORDER_MODE: 'self', PLATE_PRICE: '400', ORDER_MAX_QTY: '2', ORDER_HOURS: '', SUPABASE_SERVICE_ROLE_KEY: 'fake' });
const lib = (n) => import(pathToFileURL(path.join(T, 'lib', n + '.js')).href);
const kt = await lib('kitchenTime');
const { kitchenOnline } = await lib('kitchen');
const { store } = await lib('supabase');
const { summarize, istDayStart } = await lib('summary');
const { orders, placed, drops, dropMode, dup } = await lib('supabase-admin');
const place = (await import(pathToFileURL(path.join(T, 'routes', 'place.js')).href)).POST;
const summaryGet = (await import(pathToFileURL(path.join(T, 'routes', 'summary.js')).href)).GET;

let passed = 0; const ok = (m) => { passed++; console.log('  ok  ' + m); };
let ipn = 0;
const req = (body) => new Request('http://localhost/api/order/place', { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', 'x-forwarded-for': '10.9.0.' + ++ipn }, body: JSON.stringify(body) });
const good = { name: 'Ali Khan', phone: '9876543210', address: 'Flat 4, Road 2, Khairatabad, Hyderabad', qty: 1 };

console.log('Daily Go online switch');
// 12:00 IST = 06:30 UTC
const at = (hhmm) => new Date(`2026-11-12T${hhmm}:00+05:30`);
{ assert.ok(kt.validTime('22:00') && kt.validTime('9:05') && !kt.validTime('25:00') && !kt.validTime('10:75') && !kt.validTime('abc'));
  const c = kt.closingInstant('22:00', at('12:00')); assert.equal(c.toISOString(), at('22:00').toISOString());
  assert.equal(kt.closingInstant('22:00', at('23:00')), null); assert.equal(kt.closingInstant('bad', at('12:00')), null);
  ok('closing time: today at the chosen IST time; already passed or invalid = refused'); }
{ const until = at('22:00').toISOString();
  assert.equal(kt.isOnline(until, at('12:00')), true); assert.equal(kt.isOnline(until, at('22:01')), false); assert.equal(kt.isOnline(null, at('12:00')), false);
  ok('online switches itself off at the closing time and an empty value means offline'); }
{ const base = { reminderTime: '10:30', closeTime: '22:00' };
  const due = (onlineUntil, t) => kt.bellDue({ ...base, onlineUntil, now: at(t) });
  assert.equal(due(null, '10:00'), false); assert.equal(due(null, '10:30'), true); assert.equal(due(null, '11:29'), true); assert.equal(due(null, '11:30'), false); assert.equal(due(null, '15:00'), false); assert.equal(due(null, '22:00'), false);
  assert.equal(due(at('22:00').toISOString(), '11:00'), false);
  assert.equal(due(at('10:00').toISOString(), '11:00'), true); // yesterday's / expired switch still means offline -> bell
  ok('bell: silent before the bell time, rings for 60 minutes while offline, silent afterwards and once online'); }

{ store.row = { online_until: new Date(Date.now() + 3600e3).toISOString() }; assert.equal(await kitchenOnline(), true);
  store.row = { online_until: new Date(Date.now() - 1000).toISOString() }; assert.equal(await kitchenOnline(), false);
  store.row = { online_until: null }; assert.equal(await kitchenOnline(), false);
  ok('server: online only while online_until is in the future'); }

{ const kt2 = kt; const row = (o) => ({ online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null, drop_date: null, ...o });
  assert.equal(kt2.kitchenOpenNow(row(), at('10:59')), false); assert.equal(kt2.kitchenOpenNow(row(), at('11:00')), true);
  assert.equal(kt2.kitchenOpenNow(row(), at('21:59')), true); assert.equal(kt2.kitchenOpenNow(row(), at('22:00')), false);
  assert.equal(kt2.kitchenOpenNow(row({ auto_online_time: null }), at('12:00')), false); assert.equal(kt2.kitchenOpenNow(row({ auto_online_time: '' }), at('12:00')), false);
  assert.equal(kt2.kitchenOpenNow({ online_until: null, close_time: '22:00' }, at('12:00')), false); // SQL not run: no automatic opening
  assert.equal(kt2.kitchenOpenNow(row({ auto_off_day: '2026-11-12' }), at('12:00')), false); // pressed Go offline today
  assert.equal(kt2.kitchenOpenNow(row({ auto_off_day: '2026-11-11' }), at('12:00')), true); // yesterday's holiday does not matter
  assert.equal(kt2.kitchenOpenNow(row({ online_until: at('22:00').toISOString() }), at('09:00')), true); // opened by hand earlier
  ok('automatic opening: opens at the chosen time every day, closes at closing time, off when empty, respects Go offline for today'); }
{ const { dropDue } = await lib('dailyDrop');
  const row = (o) => ({ online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null, drop_date: null, ...o });
  assert.equal(dropDue(row(), at('10:00')), false); assert.equal(dropDue(row(), at('11:05')), true);
  assert.equal(dropDue(row({ drop_date: '2026-11-12' }), at('11:05')), false); assert.equal(dropDue(row({ drop_date: '2026-11-11' }), at('11:05')), true);
  assert.equal(dropDue(row({ auto_online_time: null }), at('11:05')), false); assert.equal(dropDue({ online_until: null }, at('11:05')), false);
  ok('daily plates reset: due once per day, only when automatic opening is on and the kitchen is open'); }
{ const { kitchenOnlineFromRow } = await lib('kitchen');
  const r = { online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null };
  assert.equal(kitchenOnlineFromRow(r, at('10:58')), false); assert.equal(kitchenOnlineFromRow(r, at('11:02')), true); assert.equal(kitchenOnlineFromRow(r, at('22:01')), false);
  ok('server check follows the automatic opening time'); }
{ const PB = await lib('prebook');
  const base = { accept_prebook: true, reminder_time: '10:30', auto_online_time: '11:00' };
  assert.equal(PB.prebookFromRow(base).openTime, '11:00'); // with automatic opening, "today" can be pre-booked until the drop starts
  assert.equal(PB.prebookFromRow({ ...base, auto_online_time: '09:00' }).openTime, '09:00');
  assert.equal(PB.prebookFromRow({ ...base, auto_online_time: null }).openTime, '10:30'); assert.equal(PB.prebookFromRow({ accept_prebook: true, reminder_time: '10:30' }).openTime, '10:30');
  assert.ok(PB.validPrebookDate('2026-11-12', at('10:45'), PB.prebookFromRow(base).openTime)); assert.ok(!PB.validPrebookDate('2026-11-12', at('11:05'), PB.prebookFromRow(base).openTime));
  ok('pre-booking "today" closes at the automatic opening time (not the bell time) when automatic opening is on'); }
{ const { ensureDailyDrop, resetDropRetry } = await lib('dailyDrop');
  const row = { online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null, drop_date: '2026-11-11' };
  drops.length = 0; resetDropRetry();
  assert.equal(await ensureDailyDrop(row, at('10:00')), null); assert.equal(drops.length, 0); // not open yet
  assert.equal(await ensureDailyDrop({ ...row, drop_date: '2026-11-12' }, at('12:00')), null); assert.equal(drops.length, 0); // already started today
  dropMode.left = 41; assert.equal(await ensureDailyDrop(row, at('12:00')), 41); assert.deepEqual(drops[0], { p_today: '2026-11-12', p_total: 42 });
  dropMode.fail = true; resetDropRetry(); drops.length = 0;
  const origErr = console.error; console.error = () => {};
  assert.equal(await ensureDailyDrop(row, at('12:00')), null); assert.equal(await ensureDailyDrop(row, at('12:00')), null); assert.equal(drops.length, 1); // a failure is not retried on every request
  console.error = origErr; dropMode.fail = false; resetDropRetry();
  ok('daily reset: runs only when due with the right date and total, returns the plates left; a failure is not retried on every request'); }
{ const { resetDropRetry } = await lib('dailyDrop');
  // The order route makes sure today's plates have started BEFORE it takes the order.
  const RealDate = Date; const fixed = at('12:00').getTime();
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  try {
    store.row = { online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null, drop_date: '2026-11-11' };
    drops.length = 0; placed.length = 0; dropMode.order.length = 0; resetDropRetry();
    const r = await place(req(good)); assert.equal(r.status, 200); assert.deepEqual(dropMode.order, ['drop', 'place']);
    store.row = { online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: '2026-11-12', drop_date: '2026-11-11' };
    const r2 = await place(req(good)); assert.equal(r2.status, 409); // pressed Go offline today: no automatic opening
  } finally { globalThis.Date = RealDate; }
  ok('order route: the plates start before the first order of the day; "Go offline" blocks automatic opening for that day'); }
{ // admin checklist shows a failure when the reset could not run
  const { resetDropRetry } = await lib('dailyDrop');
  const RealDate = Date; const fixed = at('12:00').getTime();
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  const origErr = console.error; console.error = () => {};
  try {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake'; resetDropRetry(); dropMode.fail = true;
    store.row = { online_until: null, close_time: '22:00', auto_online_time: '11:00', auto_off_day: null, drop_date: '2026-11-11' };
    const d = await (await summaryGet(new Request('http://localhost/x', { headers: { authorization: 'Bearer ADMIN' } }))).json();
    assert.equal(d.checks.find((c) => c.key === 'drop')?.ok, false);
    dropMode.fail = false; resetDropRetry(); dropMode.left = 40;
    const d2 = await (await summaryGet(new Request('http://localhost/x', { headers: { authorization: 'Bearer ADMIN' } }))).json();
    assert.equal(d2.checks.find((c) => c.key === 'drop'), undefined); assert.ok(d2.checks.find((c) => c.key === 'auto').ok);
  } finally { globalThis.Date = RealDate; console.error = origErr; dropMode.fail = false; resetDropRetry(); }
  ok('admin checklist: warns when the plates could not start by themselves, shows automatic opening when fine'); }
{ const { plateConfig, priceOrder } = await lib('orders');
  assert.equal(plateConfig().price, 400); assert.equal(plateConfig().offerPercent, 50); // defaults: Vercel / website settings
  assert.equal(plateConfig({ plate_price: null, offer_percent: null }).price, 400); assert.equal(plateConfig({ plate_price: null, offer_percent: null }).offerPercent, 50);
  const c = plateConfig({ plate_price: 300, offer_percent: 20 }); assert.equal(c.price, 300); assert.equal(c.offerPercent, 20);
  assert.equal(plateConfig({ plate_price: 300, offer_percent: 0 }).offerPercent, 0); // 0 is a real choice: offer switched off
  assert.equal(plateConfig({ offer_percent: 99 }).offerPercent, 90); assert.equal(plateConfig({ plate_price: -5 }).price, 400); // out-of-range values are not trusted
  const p = priceOrder(2, c, 40); assert.equal(p.mrp, 300); assert.equal(p.net, 240); assert.equal(p.total, 520);
  ok('price and offer set in the admin win over the defaults; 0% means no offer; bad values are ignored'); }
{ store.row = { online_until: new Date(Date.now() + 3600e3).toISOString(), plate_price: 300, offer_percent: 20 }; placed.length = 0;
  const r = await place(req(good)); assert.equal(r.status, 200);
  const a = placed[0]; assert.equal(a.p_mrp, 300); assert.equal(a.p_plate_price, 240); assert.equal(a.p_discount_percent, 20); assert.equal(a.p_total, 240 + a.p_delivery_fee);
  placed.length = 0; store.row = { online_until: new Date(Date.now() + 3600e3).toISOString(), plate_price: 250, offer_percent: 0 };
  assert.equal((await place(req(good))).status, 200); assert.equal(placed[0].p_plate_price, 250); assert.equal(placed[0].p_discount_amount, 0);
  ok('a customer order is charged the price and offer from the admin settings, worked out on the server'); }
{ // Telegram alert for a website order (and a pre-booking), and a Telegram outage never blocks an order
  const sent = []; const realFetch = globalThis.fetch; const origErr = console.error; let down = false;
  process.env.TELEGRAM_BOT_TOKEN = '123:abc'; process.env.TELEGRAM_CHAT_ID = '555';
  globalThis.fetch = async (url, opt) => {
    if (String(url).startsWith('https://api.telegram.org/')) { if (down) throw new Error('down'); sent.push(JSON.parse(opt.body).text); return new Response('{"ok":true}', { status: 200 }); }
    return realFetch(url, opt);
  };
  console.error = () => {};
  try {
    store.row = { online_until: new Date(Date.now() + 3600e3).toISOString(), accept_prebook: true };
    placed.length = 0; const r = await place(req({ ...good, lat: 17.4, lng: 78.4 })); assert.equal(r.status, 200);
    assert.equal(sent.length, 1); assert.match(sent[0], /NEW ORDER/); assert.ok(sent[0].includes('Ali Khan')); assert.ok(sent[0].includes('9876543210'));
    assert.match(sent[0], /cash \/ UPI on delivery/); assert.ok(sent[0].includes('maps.google.com/?q=17.4,78.4')); assert.ok(sent[0].includes('/admin'));
    down = true; placed.length = 0; assert.equal((await place(req(good))).status, 200); assert.equal(placed.length, 1); // order still saved
    down = false; sent.length = 0; store.row = { online_until: null, accept_prebook: true };
    const tomorrow = new Date(Date.now() + 5.5 * 3600e3 + 86400e3).toISOString().slice(0, 10);
    const rp = await place(req({ ...good, scheduledFor: tomorrow })); assert.equal(rp.status, 200); assert.match(sent[0], /PRE-BOOKED/);
    sent.length = 0; assert.equal((await place(req({ ...good, name: '', scheduledFor: tomorrow }))).status, 400); assert.equal(sent.length, 0); // a rejected order sends nothing
  } finally { globalThis.fetch = realFetch; console.error = origErr; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
  ok('Telegram: a website order and a pre-booking send an alert with the details; a failed Telegram call or a rejected order does not break anything'); }
{ // A second tap or a page refresh must not create a second order
  store.row = { online_until: new Date(Date.now() + 3600e3).toISOString() }; placed.length = 0;
  dup.rows = [{ code: 'DUPLICAT', total: 240 }];
  const r = await place(req(good)); const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.code, 'DUPLICAT'); assert.equal(d.duplicate, true); assert.equal(placed.length, 0); // the first order is returned, nothing new is saved
  dup.rows = []; const r2 = await place(req(good)); assert.equal(r2.status, 200); assert.equal(placed.length, 1); assert.ok(!(await r2.json()).duplicate);
  ok('the same phone, address and plates twice within 3 minutes gives the first order back instead of a second one'); }
{ // How many plates one order can have: the admin's limit wins; before the qty SQL is run the old small limit applies
  const { plateConfig, hardMaxQty, validateOrder } = await lib('orders');
  assert.equal(plateConfig().maxQty, 2); assert.equal(plateConfig({ plate_price: 400 }).maxQty, 2); // column missing = old limit (2 by default)
  process.env.ORDER_MAX_QTY = '9'; assert.equal(plateConfig().maxQty, 5); delete process.env.ORDER_MAX_QTY; // the old database rule allowed 5 at most
  assert.equal(plateConfig({ max_qty: 10 }).maxQty, 10); assert.equal(plateConfig({ max_qty: 1 }).maxQty, 1);
  assert.equal(plateConfig({ max_qty: 99 }).maxQty, 42); assert.equal(plateConfig({ max_qty: 0 }).maxQty, 10); assert.equal(plateConfig({ max_qty: null }).maxQty, 10); // never more than a day's batch; a bad value falls back to 10
  assert.equal(hardMaxQty({ max_qty: 10 }), 42); assert.equal(hardMaxQty({}), 5); assert.equal(hardMaxQty(null), 5);
  const body = { name: 'Ali Khan', phone: '9876543210', address: 'Flat 4, Road 2, Khairatabad, Hyderabad', qty: 8 };
  assert.equal(validateOrder(body, 10).ok, true); assert.equal(validateOrder(body, 5).ok, false); assert.match(validateOrder(body, 5).error, /1 to 5 plates/);
  ok('plates per order: the admin limit (up to 42) wins, a missing column keeps the old limit, bad values are ignored, orders above the limit are refused'); }
{ store.row = { online_until: new Date(Date.now() + 3600e3).toISOString(), max_qty: 10 }; placed.length = 0;
  assert.equal((await place(req({ ...good, qty: 8, phone: '9111111111' }))).status, 200); assert.equal(placed[0].p_qty, 8);
  const over = await place(req({ ...good, qty: 11, phone: '9222222222' })); assert.equal(over.status, 400); assert.match((await over.json()).error, /1 to 10 plates/); assert.equal(placed.length, 1);
  store.row = { online_until: new Date(Date.now() + 3600e3).toISOString() };
  assert.equal((await place(req({ ...good, qty: 3, phone: '9333333333' }))).status, 400); // before the SQL is run, 3 is still too many
  ok('a customer order of 8 plates works when the limit is 10; 11 is refused; without the SQL the old limit still protects the database'); }
{ store.error = true; assert.equal(await kitchenOnline(), true); store.error = false; store.throwIt = true; assert.equal(await kitchenOnline(), true); store.throwIt = false; store.row = null; assert.equal(await kitchenOnline(), true);
  ok('before the SQL is run (missing columns) or on a network error, ordering is not blocked'); }

{ store.row = { online_until: null }; placed.length = 0;
  const r = await place(req(good)); assert.equal(r.status, 409); assert.match((await r.json()).error, /offline/i); assert.equal(placed.length, 0);
  ok('offline: a customer order is refused with a clear message and nothing is saved'); }
{ store.row = { online_until: new Date(Date.now() + 3600e3).toISOString() };
  const r = await place(req(good)); assert.equal(r.status, 200); assert.equal(placed.length, 1);
  ok('online: the same order is accepted'); }

{ const now = at('15:00'); const mk = (o) => ({ qty: 1, total: 200, payment_mode: 'cod', paid_by: null, created_at: at('12:00').toISOString(), ...o });
  const list = [
    mk({ status: 'new' }), mk({ status: 'confirmed', qty: 2, total: 400 }),
    mk({ status: 'delivered', paid_by: 'cash' }), mk({ status: 'delivered', paid_by: 'upi', total: 400, qty: 2 }),
    mk({ status: 'delivered', payment_mode: 'online', total: 249 }), mk({ status: 'cancelled' }), mk({ status: 'paid_needs_refund', payment_mode: 'online' }),
    mk({ status: 'delivered', paid_by: 'cash', created_at: at('12:00').toISOString().replace('2026-11-12', '2026-11-11') }), // yesterday
  ];
  const s = summarize(list, now);
  assert.equal(s.orders, 7); assert.equal(s.waitingToConfirm, 1); assert.equal(s.delivered, 3); assert.equal(s.cancelled, 1); assert.equal(s.needsRefund, 1);
  assert.equal(s.cashCollected, 200); assert.equal(s.upiCollected, 400); assert.equal(s.onlineCollected, 249); assert.equal(s.collectedTotal, 849);
  assert.equal(s.toCollect, 600); assert.equal(s.toCollectCount, 2); assert.equal(s.platesSold, 7);
  assert.equal(istDayStart(at('00:30')).toISOString(), at('00:00').toISOString());
  ok('Today numbers: orders, delivered, cash / UPI / online collected, still to collect, plates; yesterday is excluded'); }

{ const now = at('15:00'); const mk = (o) => ({ qty: 1, total: 200, payment_mode: 'cod', paid_by: null, status: 'new', created_at: at('12:00').toISOString(), ...o });
  const list = [mk({}), mk({ scheduled_for: '2026-11-13', qty: 2 }), mk({ scheduled_for: '2026-11-13', status: 'cancelled' }), mk({ scheduled_for: '2026-11-12', qty: 3, created_at: at('12:00').toISOString().replace('2026-11-12', '2026-11-11') })];
  const s = summarize(list, now);
  assert.equal(s.orders, 2); // the order placed today + the one pre-booked earlier for today; tomorrow's booking is not "today"
  assert.deepEqual(s.prebookedTomorrow, { orders: 1, plates: 2 }); assert.deepEqual(s.prebookedToday, { orders: 1, plates: 3 });
  ok('Today numbers: pre-booked orders count on their booked day (not the day they were placed); cancelled bookings are ignored'); }
{ assert.equal((await summaryGet(new Request('http://localhost/x'))).status, 403);
  const r = await summaryGet(new Request('http://localhost/x', { headers: { authorization: 'Bearer ADMIN' } })); const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.blocker, null); assert.ok(d.checks.find((c) => c.key === 'db').ok);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY; const d2 = await (await summaryGet(new Request('http://localhost/x', { headers: { authorization: 'Bearer ADMIN' } }))).json();
  assert.equal(d2.checks.find((c) => c.key === 'db').ok, false); assert.ok(d2.blocker);
  ok('summary API: admin only; the checklist shows what is missing (database key) and the blocker'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
