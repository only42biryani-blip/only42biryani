// End-to-end logic test of the ordering flow with FAKE Razorpay, Borzo and database.
// Copies the real source files into a temp folder inside the repo (so node_modules resolve), rewrites the "@/" imports,
// swaps the real database / admin check for in-memory fakes, runs the scenarios, then deletes the temp folder.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_flowtest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'lib'), { recursive: true });
fs.mkdirSync(path.join(T, 'routes'), { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');

const rewrite = (src, rel) => src.replace(/from 'next\/server'/g, "from 'next/server.js'").replace(/from '@\/lib\/([\w-]+)'/g, (_, n) => `from '${rel}${n}.js'`);
for (const f of ['orders', 'razorpay', 'borzo', 'payments', 'apiGuard', 'config', 'bill', 'kitchen', 'deliveryRules', 'delivery', 'payment', 'prebook', 'kitchenTime', 'settingsRow', 'dailyDrop', 'telegram']) {
  fs.writeFileSync(path.join(T, 'lib', f + '.js'), rewrite(fs.readFileSync(`${REPO}/lib/${f}.js`, 'utf8'), './'));
}
const routes = {
  create: 'app/api/order/create/route.js',
  verify: 'app/api/order/verify/route.js',
  webhook: 'app/api/razorpay/webhook/route.js',
  callback: 'app/api/borzo/callback/route.js',
  admin: 'app/api/admin/orders/[code]/route.js',
  status: 'app/api/order/[code]/route.js',
};
for (const [n, f] of Object.entries(routes)) {
  fs.writeFileSync(path.join(T, 'routes', n + '.js'), rewrite(fs.readFileSync(`${REPO}/${f}`, 'utf8'), '../lib/'));
}

// ---- fakes -----------------------------------------------------------------------------------------------
fs.writeFileSync(path.join(T, 'lib', 'supabase.js'), "export const supabase = { from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: async () => ({ data: { online_until: new Date(Date.now() + 3600e3).toISOString(), online_pay: 'on', accept_cod: true }, error: null }) }) }) }) }) };");
fs.writeFileSync(path.join(T, 'lib', 'adminAuth.js'), `
export async function requireAdmin(request) {
  return request.headers.get('authorization') === 'Bearer ADMIN' ? null : Response.json({ error: 'Not allowed' }, { status: 403 });
}`);
fs.writeFileSync(path.join(T, 'lib', 'supabase-admin.js'), `
export const state = { orders: [], remaining: 42 };
let seq = 0;
const clone = (x) => JSON.parse(JSON.stringify(x));
function releaseExpired() {
  let n = 0;
  for (const o of state.orders) if (o.status === 'pending_payment' && o.hold_expires_at && new Date(o.hold_expires_at) < new Date()) {
    o.status = 'expired'; state.remaining = Math.min(42, state.remaining + o.qty); n++;
  }
  return n;
}
const rpcs = {
  release_expired_holds: () => ({ data: releaseExpired(), error: null }),
  place_order_hold: (a) => {
    releaseExpired();
    if (state.remaining < a.p_qty) return { data: null, error: { message: 'sold_out' } };
    state.remaining -= a.p_qty;
    state.orders.push({ id: 'id' + (++seq), code: a.p_code, status: 'pending_payment', qty: a.p_qty, plate_price: a.p_plate_price,
      delivery_fee: a.p_delivery_fee, total: a.p_total, customer_name: a.p_name, customer_phone: a.p_phone, customer_email: a.p_email,
      address: a.p_address, note: a.p_note, razorpay_order_id: null, razorpay_payment_id: null, borzo_order_id: null,
      hold_expires_at: new Date(Date.now() + a.p_hold_minutes * 60000).toISOString(), created_at: new Date().toISOString() });
    return { data: 'id' + seq, error: null };
  },
  mark_order_paid: (a) => {
    const o = state.orders.find((x) => x.code === a.p_code);
    if (!o) return { data: 'not_found', error: null };
    if (['paid','preparing','ready','dispatched','delivered'].includes(o.status)) return { data: 'already_paid', error: null };
    if (o.status === 'pending_payment') { Object.assign(o, { status: 'paid', razorpay_payment_id: a.p_payment_id, hold_expires_at: null }); return { data: 'ok', error: null }; }
    if (o.status === 'expired') {
      if (state.remaining >= o.qty) { state.remaining -= o.qty; Object.assign(o, { status: 'paid', razorpay_payment_id: a.p_payment_id, hold_expires_at: null }); return { data: 'ok', error: null }; }
      Object.assign(o, { status: 'paid_needs_refund', razorpay_payment_id: a.p_payment_id }); return { data: 'needs_refund', error: null };
    }
    return { data: o.status, error: null };
  },
  cancel_order: (a) => {
    const o = state.orders.find((x) => x.code === a.p_code);
    if (!o) return { data: 'not_found', error: null };
    if (['cancelled','refunded','expired','delivered'].includes(o.status)) return { data: o.status, error: null };
    if (a.p_restore && ['pending_payment','paid','preparing','ready'].includes(o.status)) state.remaining = Math.min(42, state.remaining + o.qty);
    o.status = 'cancelled'; return { data: 'cancelled', error: null };
  },
};
class Q {
  constructor(table) { this.table = table; this.filters = []; this.patch = null; }
  select() { return this; }
  update(p) { this.patch = p; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  not(c, op, v) { const set = v.replace(/[()]/g, '').split(','); this.filters.push((r) => !set.includes(r[c])); return this; }
  rows() { return state.orders.filter((r) => this.filters.every((f) => f(r))); }
  async maybeSingle() { const r = this.rows()[0]; return { data: r ? clone(r) : null, error: null }; }
  then(res, rej) {
    if (this.patch) { for (const r of this.rows()) Object.assign(r, this.patch); }
    return Promise.resolve({ data: null, error: null }).then(res, rej);
  }
}
const db = { rpc: async (n, a) => rpcs[n](a || {}), from: (t) => new Q(t) };
export function orderDb() { return process.env.SUPABASE_SERVICE_ROLE_KEY ? db : null; }
`);

// ---- environment + fake network ----------------------------------------------------------------------------
Object.assign(process.env, {
  ORDERING_ENABLED: '1', PLATE_PRICE: '349', ORDER_MAX_QTY: '2', MAX_DELIVERY_FEE: '120', ORDER_HOURS: '',
  SELF_DELIVERY_FEE: '30', BORZO_TOKEN: 'FAKE', KITCHEN_ADDRESS: 'Khairtabad, Hyderabad', KITCHEN_PHONE: '919999999999',
  RAZORPAY_KEY_ID: 'rzp_test_FAKE', RAZORPAY_KEY_SECRET: 'rzp_secret', RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
  BORZO_CALLBACK_SECRET: 'borzo_cb_secret', SUPABASE_SERVICE_ROLE_KEY: 'fake',
});

const net = { borzoPrice: '72.40', rzFail: false, refunds: [], borzoBooked: 0, borzoCancelled: 0, rzOrderSeq: 0 };
globalThis.fetch = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null;
  const ok = (data) => ({ ok: true, status: 200, json: async () => data });
  if (url.includes('borzodelivery.com') && url.endsWith('/calculate-order')) {
    if (body.points[1].address.includes('Nowhere')) return ok({ is_successful: false, errors: ['invalid_parameters'] });
    return ok({ is_successful: true, order: { payment_amount: net.borzoPrice }, warnings: [] });
  }
  if (url.endsWith('/create-order')) { net.borzoBooked++; net.lastBooking = body; return ok({ is_successful: true, order: { order_id: 777000 + net.borzoBooked, status: 'available', payment_amount: net.borzoPrice } }); }
  if (url.endsWith('/cancel-order')) { net.borzoCancelled++; return ok({ is_successful: true, order: { status: 'canceled' } }); }
  if (url === 'https://api.razorpay.com/v1/orders') {
    if (net.rzFail) return { ok: false, status: 400, json: async () => ({ error: { description: 'nope' } }) };
    return ok({ id: 'order_RZ' + ++net.rzOrderSeq, amount: body.amount });
  }
  if (url.includes('/refund')) { net.refunds.push({ url, body }); return ok({ id: 'rfnd_' + net.refunds.length }); }
  throw new Error('unexpected fetch ' + url);
};

// ---- helpers -----------------------------------------------------------------------------------------------
const load = (n) => import(pathToFileURL(path.join(T, 'routes', n + '.js')).href);
const lib = (n) => import(pathToFileURL(path.join(T, 'lib', n + '.js')).href);
const { state } = await lib('supabase-admin');
const create = (await load('create')).POST, verify = (await load('verify')).POST, webhook = (await load('webhook')).POST;
const callback = (await load('callback')).POST, admin = (await load('admin')).POST, status = (await load('status')).GET;
let ipn = 0;
const req = (url, body, headers = {}, raw) => new Request('http://localhost' + url, {
  method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', 'x-forwarded-for': '10.0.0.' + ++ipn, ...headers },
  body: raw ?? JSON.stringify(body),
});
const good = { name: 'Ali Khan', phone: '9876543210', email: '', address: 'Flat 205, Manam Apt, Banjara Hills Road 12, Hyderabad', note: '', qty: 2 };
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };
const reset = () => { state.orders.length = 0; state.remaining = 42; net.refunds.length = 0; net.rzFail = false; net.borzoBooked = 0; net.borzoCancelled = 0; };

// ---- scenarios ---------------------------------------------------------------------------------------------
console.log('Direct ordering flow (fake services)');

{ // create: happy path
  reset();
  const r = await create(req('/api/order/create', good));
  const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  assert.equal(d.fee, 30); // the default delivery charge (Borzo's price is not used for customers)
  assert.equal(d.total, 2 * 175 + 30); // 50% offer: Rs 349 -> Rs 175 a plate
  assert.equal(d.amountPaise, (2 * 175 + 30) * 100);
  assert.match(d.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(state.remaining, 40);
  assert.equal(state.orders[0].status, 'pending_payment');
  assert.equal(state.orders[0].customer_phone, '919876543210');
  assert.equal(state.orders[0].razorpay_order_id, d.razorpayOrderId);
  ok('create: server prices the order, holds 2 plates, creates payment');
}
{ // create: the browser cannot set the price
  reset();
  const r = await create(req('/api/order/create', { ...good, qty: 1, total: 1, price: 1, fee: 0, plate_price: 1 }));
  const d = await r.json();
  assert.equal(d.total, 175 + 30);
  ok('create: prices sent by the browser are ignored');
}
{ // create: validation + quantity cap
  reset();
  for (const bad of [{ ...good, name: '' }, { ...good, phone: '12345' }, { ...good, address: 'short' }, { ...good, qty: 3 }, { ...good, qty: 0 }, { ...good, email: 'nope' }]) {
    const r = await create(req('/api/order/create', bad));
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
  assert.equal(state.remaining, 42);
  ok('create: bad name/phone/address/quantity/email are rejected and nothing is held');
}
{ // create: Borzo's price never reaches the customer
  reset(); net.borzoPrice = '180.00';
  const r = await create(req('/api/order/create', good)); const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.fee, 30);
  net.borzoPrice = '72.40';
  ok('create: the delivery charge is your own setting; a Borzo price change does not change what customers pay');
}
{ // create: sold out
  reset(); state.remaining = 1;
  const r = await create(req('/api/order/create', good));
  assert.equal(r.status, 409);
  assert.equal(state.remaining, 1);
  ok('create: not enough plates -> refused, stock untouched');
}
{ // create: payment provider down -> plates released
  reset(); net.rzFail = true;
  const r = await create(req('/api/order/create', good));
  assert.equal(r.status, 502);
  assert.equal(state.remaining, 42);
  assert.equal(state.orders[0].status, 'cancelled');
  ok('create: if Razorpay fails, the held plates are given back');
}
{ // create: other site + honeypot + disabled + rate limit
  reset();
  assert.equal((await create(req('/api/order/create', good, { origin: 'https://evil.example' }))).status, 403);
  const hp = await create(req('/api/order/create', { ...good, website: 'bot' })); assert.equal((await hp.json()).ok, true); assert.equal(state.orders.length, 0);
  process.env.ORDERING_ENABLED = '0';
  assert.equal((await create(req('/api/order/create', good))).status, 503);
  process.env.ORDERING_ENABLED = '1';
  const same = { 'x-forwarded-for': '9.9.9.9' };
  let last; for (let i = 0; i < 7; i++) last = await create(req('/api/order/create', { ...good, qty: 1 }, same));
  assert.equal(last.status, 429);
  ok('create: other websites, bots, closed ordering and rapid repeats are blocked');
}
{ // opening hours
  reset(); process.env.ORDER_HOURS = '12:00-12:01';
  const r = await create(req('/api/order/create', good, { 'x-forwarded-for': '8.8.8.8' }));
  const istNow = new Date(Date.now() + 5.5 * 3600e3); const m = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  assert.equal(r.status, m >= 720 && m < 721 ? 200 : 409);
  process.env.ORDER_HOURS = '';
  const { isOpenNow } = await lib('orders');
  process.env.ORDER_HOURS = '12:00-22:00';
  assert.equal(isOpenNow(new Date('2026-11-12T07:00:00Z')), true);   // 12:30 IST, inside 12:00-22:00
  assert.equal(isOpenNow(new Date('2026-11-12T05:12:00Z')), false);  // 10:42 IST, before opening
  process.env.ORDER_HOURS = '22:00-02:00';                           // overnight window
  assert.equal(isOpenNow(new Date('2026-11-12T17:00:00Z')), true);   // 22:30 IST
  assert.equal(isOpenNow(new Date('2026-11-12T05:12:00Z')), false);  // 10:42 IST
  process.env.ORDER_HOURS = '';
  ok('hours: closed outside the window, overnight windows work');
}

// payment verification
async function startOrder() { reset(); const r = await create(req('/api/order/create', good)); return r.json(); }
{
  const d = await startOrder();
  const pay = 'pay_TEST1';
  const sig = hmac('rzp_secret', `${d.razorpayOrderId}|${pay}`);
  const badRes = await verify(req('/api/order/verify', { code: d.code, razorpay_order_id: d.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: 'deadbeef' }));
  assert.equal(badRes.status, 400); assert.equal(state.orders[0].status, 'pending_payment');
  const wrongOrder = await verify(req('/api/order/verify', { code: d.code, razorpay_order_id: 'order_OTHER', razorpay_payment_id: pay, razorpay_signature: hmac('rzp_secret', `order_OTHER|${pay}`) }));
  assert.equal(wrongOrder.status, 404);
  const goodRes = await verify(req('/api/order/verify', { code: d.code, razorpay_order_id: d.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sig }));
  assert.equal(goodRes.status, 200); assert.equal(state.orders[0].status, 'paid'); assert.equal(state.orders[0].razorpay_payment_id, pay);
  const replay = await verify(req('/api/order/verify', { code: d.code, razorpay_order_id: d.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sig }));
  assert.equal((await replay.json()).result, 'already_paid'); assert.equal(state.remaining, 40);
  ok('verify: bad/forged signature rejected; correct one marks paid; replay is harmless; stock stays correct');
}
{ // Telegram alert when an online payment is confirmed (once), and a Telegram outage never breaks the payment
  const sent = []; const realFetch = globalThis.fetch; const origErr = console.error; let down = false;
  process.env.TELEGRAM_BOT_TOKEN = '123:abc'; process.env.TELEGRAM_CHAT_ID = '555';
  globalThis.fetch = async (url, opt) => {
    if (String(url).startsWith('https://api.telegram.org/')) { if (down) throw new Error('down'); sent.push({ url: String(url), body: JSON.parse(opt.body) }); return new Response('{"ok":true}', { status: 200 }); }
    return realFetch(url, opt);
  };
  console.error = () => {};
  try {
    const d = await startOrder(); const pay = 'pay_TG1'; const sig = hmac('rzp_secret', `${d.razorpayOrderId}|${pay}`);
    const body = { code: d.code, razorpay_order_id: d.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sig };
    assert.equal((await verify(req('/api/order/verify', body))).status, 200);
    assert.equal(sent.length, 1); assert.match(sent[0].url, /bot123:abc\/sendMessage/); assert.equal(sent[0].body.chat_id, '555');
    assert.ok(sent[0].body.text.includes(d.code)); assert.match(sent[0].body.text, /PAID online/);
    await verify(req('/api/order/verify', body)); assert.equal(sent.length, 1); // a repeat does not alert again
    down = true; const d2 = await startOrder(); const pay2 = 'pay_TG2';
    const r2 = await verify(req('/api/order/verify', { code: d2.code, razorpay_order_id: d2.razorpayOrderId, razorpay_payment_id: pay2, razorpay_signature: hmac('rzp_secret', `${d2.razorpayOrderId}|${pay2}`) }));
    assert.equal(r2.status, 200);
  } finally { globalThis.fetch = realFetch; console.error = origErr; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
  ok('Telegram: one alert when an online payment is confirmed; a repeat is silent; Telegram being down does not break the payment');
}
{
  const d = await startOrder();
  const ev = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_WH1', order_id: d.razorpayOrderId } } } });
  assert.equal((await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': 'bad' } }))).status, 400);
  assert.equal(state.orders[0].status, 'pending_payment');
  const r = await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': hmac('wh_secret', ev) } }));
  assert.equal(r.status, 200); assert.equal(state.orders[0].status, 'paid');
  await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': hmac('wh_secret', ev) } }));
  assert.equal(state.remaining, 40);
  ok('webhook: bad signature rejected; payment.captured confirms the order even if the browser closed; duplicates are harmless');
}
{ // paid after the hold expired
  const d = await startOrder();
  state.orders[0].hold_expires_at = new Date(Date.now() - 1000).toISOString();
  await (await lib('supabase-admin')).orderDb().rpc('release_expired_holds');
  assert.equal(state.orders[0].status, 'expired'); assert.equal(state.remaining, 42);
  const ev = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_LATE', order_id: d.razorpayOrderId } } } });
  await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': hmac('wh_secret', ev) } }));
  assert.equal(state.orders[0].status, 'paid'); assert.equal(state.remaining, 40);
  ok('late payment: plates re-taken when still available, order confirmed');
}
{ // paid after expiry AND plates gone -> auto refund
  const d = await startOrder();
  state.orders[0].hold_expires_at = new Date(Date.now() - 1000).toISOString();
  await (await lib('supabase-admin')).orderDb().rpc('release_expired_holds');
  state.remaining = 0;
  const ev = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_LATE2', order_id: d.razorpayOrderId } } } });
  await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': hmac('wh_secret', ev) } }));
  assert.equal(state.orders[0].status, 'refunded'); assert.equal(net.refunds.length, 1);
  assert.ok(net.refunds[0].url.includes('pay_LATE2')); assert.equal(net.refunds[0].body.amount, (2 * 175 + 30) * 100);
  ok('late payment with no plates left: customer is refunded automatically for the full amount');
}

// kitchen + rider
async function paidOrder() {
  const d = await startOrder();
  const ev = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_K' + d.code, order_id: d.razorpayOrderId } } } });
  await webhook(new Request('http://localhost/x', { method: 'POST', body: ev, headers: { 'x-razorpay-signature': hmac('wh_secret', ev) } }));
  return d;
}
const act = (code, body, token = 'ADMIN') => admin(req('/x', body, { authorization: 'Bearer ' + token }), { params: Promise.resolve({ code }) });
{
  const d = await paidOrder();
  assert.equal((await act(d.code, { action: 'dispatch' }, 'nope')).status, 403);
  assert.equal((await act(d.code, { action: 'preparing' })).status, 200); assert.equal(state.orders[0].status, 'preparing');
  const r = await act(d.code, { action: 'dispatch' });
  assert.equal(r.status, 200); assert.equal(state.orders[0].status, 'ready'); assert.equal(state.orders[0].borzo_order_id, 777001);
  assert.equal(net.lastBooking.payment_method, 'balance'); assert.equal(net.lastBooking.points[1].client_order_id, d.code);
  assert.equal(net.lastBooking.points[1].contact_person.phone, '919876543210');
  assert.equal((await act(d.code, { action: 'dispatch' })).status, 409); assert.equal(net.borzoBooked, 1);
  ok('kitchen: only the admin can act; rider is booked once (no double-booking), with our code and the customer phone');
}
{
  const d = await paidOrder(); await act(d.code, { action: 'dispatch' });
  const cb = (payload, sig) => callback(new Request('http://localhost/x', { method: 'POST', body: payload, headers: { 'x-dv-signature': sig ?? hmac('borzo_cb_secret', payload) } }));
  const p1 = JSON.stringify({ event_type: 'delivery_changed', delivery: { client_order_id: d.code, status: 'parcel_picked_up', tracking_url: 'https://track.example/abc', courier: { name: 'Ravi', surname: 'K', phone: '919111111111' } } });
  assert.equal((await cb(p1, 'bad')).status, 400); assert.equal(state.orders[0].status, 'ready');
  assert.equal((await cb(p1)).status, 200);
  assert.equal(state.orders[0].status, 'dispatched'); assert.equal(state.orders[0].tracking_url, 'https://track.example/abc'); assert.equal(state.orders[0].courier_name, 'Ravi K');
  const p2 = JSON.stringify({ event_type: 'delivery_changed', delivery: { client_order_id: d.code, status: 'finished' } });
  await cb(p2); assert.equal(state.orders[0].status, 'delivered');
  const pub = await (await status(new Request('http://localhost/x', { headers: { 'x-forwarded-for': '7.7.7.7' } }), { params: Promise.resolve({ code: d.code }) })).json();
  assert.equal(pub.status, 'delivered'); assert.equal(pub.firstName, 'Ali'); assert.ok(!('customer_phone' in pub) && !('address' in pub));
  ok('rider updates: forged callbacks rejected; pickup -> out for delivery; finished -> delivered; public page shows no phone/address');
}
{
  const d = await paidOrder(); await act(d.code, { action: 'dispatch' });
  const cb = (payload) => callback(new Request('http://localhost/x', { method: 'POST', body: payload, headers: { 'x-dv-signature': hmac('borzo_cb_secret', payload) } }));
  const r = await act(d.code, { action: 'cancel', restore: true });
  assert.equal(r.status, 200); assert.equal(net.borzoCancelled, 1);
  assert.equal(net.refunds.length, 1); assert.equal(state.orders[0].status, 'refunded'); assert.equal(state.remaining, 42);
  await cb(JSON.stringify({ event_type: 'delivery_changed', delivery: { client_order_id: d.code, status: 'finished' } }));
  assert.equal(state.orders[0].status, 'refunded');
  ok('cancel: rider booking cancelled, full refund, plates restored; a late rider update cannot reopen a refunded order');
}
{
  const d = await paidOrder();
  await act(d.code, { action: 'cancel', restore: false });
  assert.equal(state.remaining, 40);
  ok('cancel without restoring: the cooked plates stay out of stock');
}

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
