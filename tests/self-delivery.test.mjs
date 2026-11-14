// Self-delivery flow test with a FAKE database. Needs NO Borzo and NO Razorpay settings (that is part of the test).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_selftest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'lib'), { recursive: true });
fs.mkdirSync(path.join(T, 'routes'), { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
const rewrite = (src, rel) => src.replace(/from 'next\/server'/g, "from 'next/server.js'").replace(/from '@\/lib\/([\w-]+)'/g, (_, n) => `from '${rel}${n}.js'`);
for (const f of ['orders', 'razorpay', 'borzo', 'payments', 'apiGuard', 'config', 'bill', 'kitchen', 'deliveryRules', 'delivery', 'payment', 'prebook', 'kitchenTime', 'settingsRow', 'dailyDrop', 'telegram']) {
  fs.writeFileSync(path.join(T, 'lib', f + '.js'), rewrite(fs.readFileSync(`${REPO}/lib/${f}.js`, 'utf8'), './'));
}
const routes = { place: 'app/api/order/place/route.js', create: 'app/api/order/create/route.js', adminList: 'app/api/admin/orders/route.js', adminOne: 'app/api/admin/orders/[code]/route.js', status: 'app/api/order/[code]/route.js' };
for (const [n, f] of Object.entries(routes)) fs.writeFileSync(path.join(T, 'routes', n + '.js'), rewrite(fs.readFileSync(`${REPO}/${f}`, 'utf8'), '../lib/'));

fs.writeFileSync(path.join(T, 'lib', 'supabase.js'), "export const supabase = { from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: async () => ({ data: { online_until: new Date(Date.now() + 3600e3).toISOString(), online_pay: 'on', accept_cod: true }, error: null }) }) }) }) }) };");
fs.writeFileSync(path.join(T, 'lib', 'adminAuth.js'), `export async function requireAdmin(r){ return r.headers.get('authorization')==='Bearer ADMIN' ? null : Response.json({error:'Not allowed'},{status:403}); }`);
fs.writeFileSync(path.join(T, 'lib', 'supabase-admin.js'), `
export const state = { orders: [], remaining: 42 };
let seq = 0; const clone = (x) => JSON.parse(JSON.stringify(x));
const rpcs = {
  release_expired_holds: () => ({ data: 0, error: null }),
  place_self_order: (a) => {
    if (state.remaining < a.p_qty) return { data: null, error: { message: 'sold_out' } };
    state.remaining -= a.p_qty;
    state.orders.push({ id: 'id' + (++seq), code: a.p_code, status: 'new', qty: a.p_qty, plate_price: a.p_plate_price, delivery_fee: a.p_delivery_fee,
      total: a.p_total, customer_name: a.p_name, customer_phone: a.p_phone, customer_email: a.p_email, address: a.p_address, note: a.p_note,
      payment_mode: 'cod', lat: a.p_lat, lng: a.p_lng, mrp: a.p_mrp, discount_percent: a.p_discount_percent, discount_amount: a.p_discount_amount,
      source: a.p_source, paid_by: null, razorpay_payment_id: null, borzo_order_id: null, created_at: new Date().toISOString() });
    return { data: 'id' + seq, error: null };
  },
  cancel_order: (a) => {
    const o = state.orders.find((x) => x.code === a.p_code); if (!o) return { data: 'not_found', error: null };
    if (['cancelled','refunded','expired','delivered'].includes(o.status)) return { data: o.status, error: null };
    if (a.p_restore && ['pending_payment','new','confirmed','paid','preparing','ready','dispatched'].includes(o.status)) state.remaining = Math.min(42, state.remaining + o.qty);
    o.status = 'cancelled'; return { data: 'cancelled', error: null };
  },
};
class Q { constructor(){ this.f=[]; this.patch=null; }
  select(){ return this; } update(p){ this.patch=p; return this; } eq(c,v){ this.f.push((r)=>r[c]===v); return this; }
  order(){ return this; } limit(){ return this; }
  rows(){ return state.orders.filter((r)=>this.f.every((g)=>g(r))); }
  async maybeSingle(){ const r=this.rows()[0]; return { data: r?clone(r):null, error:null }; }
  then(res,rej){ if(this.patch){ for(const r of this.rows()) Object.assign(r,this.patch); return Promise.resolve({data:null,error:null}).then(res,rej);} return Promise.resolve({data:clone(state.orders),error:null}).then(res,rej); } }
const db = { rpc: async (n,a)=>rpcs[n](a||{}), from: ()=> new Q() };
export function orderDb(){ return process.env.SUPABASE_SERVICE_ROLE_KEY ? db : null; }
`);

// Self-delivery needs ONLY these. Deliberately no BORZO_* and no RAZORPAY_*.
Object.assign(process.env, { ORDERING_ENABLED: '1', ORDER_MODE: 'self', PLATE_PRICE: '400', ORDER_MAX_QTY: '2', ORDER_HOURS: '', SELF_DELIVERY_FEE: '0', SUPABASE_SERVICE_ROLE_KEY: 'fake' });
for (const k of ['BORZO_TOKEN', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) delete process.env[k];
globalThis.fetch = async () => { throw new Error('no network calls expected'); };

const load = (n) => import(pathToFileURL(path.join(T, 'routes', n + '.js')).href);
const lib = (n) => import(pathToFileURL(path.join(T, 'lib', n + '.js')).href);
const { state } = await lib('supabase-admin');
const place = (await load('place')).POST, create = (await load('create')).POST;
const adminList = await load('adminList'), adminOne = await load('adminOne');
let ipn = 0;
const req = (url, body, headers = {}) => new Request('http://localhost' + url, { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', 'x-forwarded-for': '10.1.0.' + ++ipn, ...headers }, body: JSON.stringify(body) });
const A = { authorization: 'Bearer ADMIN' };
const good = { name: 'Ali Khan', phone: '9763950680', email: '', address: 'Manam Apt 205, Banjara Hills Road 12, Hyderabad', note: 'Gate code 4455', qty: 2 };
const reset = () => { state.orders.length = 0; state.remaining = 42; process.env.SELF_DELIVERY_FEE = '0'; };
let passed = 0; const ok = (n) => { passed++; console.log('  ok  ' + n); };
const one = (code, body, headers = A) => adminOne.POST(req('/x', body, headers), { params: Promise.resolve({ code }) });

console.log('Self-delivery flow (fake database, no Borzo/Razorpay)');
{ reset();
  const r = await place(req('/api/order/place', { ...good, lat: 17.4126, lng: 78.4308 })); const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  const o = state.orders[0];
  assert.equal(d.total, 400); assert.equal(o.total, 400);               // 2 plates x Rs 200 (50% off Rs 400)
  assert.equal(o.mrp, 400); assert.equal(o.discount_percent, 50); assert.equal(o.discount_amount, 400); assert.equal(o.plate_price, 200);
  assert.equal(o.status, 'new'); assert.equal(o.payment_mode, 'cod'); assert.equal(o.source, 'website');
  assert.equal(o.lat, 17.4126); assert.equal(o.customer_phone, '919763950680'); assert.equal(state.remaining, 40);
  ok('place: 2 plates at 50% off = Rs 400, saved Rs 400, order is "new" and pay-on-delivery, 2 plates taken'); }
{ reset(); await place(req('/api/order/place', { ...good, qty: 1, total: 1, plate_price: 1, mrp: 1, discount_percent: 99, delivery_fee: 0 }));
  assert.equal(state.orders[0].total, 200); assert.equal(state.orders[0].discount_percent, 50);
  ok('place: prices and offer sent by the browser are ignored'); }
{ reset(); process.env.SELF_DELIVERY_FEE = '30'; await place(req('/api/order/place', { ...good, qty: 1 }));
  assert.equal(state.orders[0].total, 230); assert.equal(state.orders[0].delivery_fee, 30);
  ok('place: a self-delivery fee is added when you set one'); }
{ reset(); process.env.PLATE_PRICE = '349'; await place(req('/api/order/place', { ...good, qty: 1 }));
  assert.equal(state.orders[0].plate_price, 175); assert.equal(state.orders[0].discount_amount, 174); process.env.PLATE_PRICE = '400';
  ok('place: odd prices round sensibly (Rs 349 -> Rs 175 after 50% off)'); }
{ reset(); await place(req('/api/order/place', { ...good, lat: 999, lng: 999 })); assert.equal(state.orders[0].lat, null);
  await place(req('/api/order/place', { ...good, lat: 'abc' })); assert.equal(state.orders[1].lat, null);
  ok('place: a nonsense location is ignored, the order still goes through'); }
{ reset(); let bad = 0;
  for (const b of [{ ...good, name: '' }, { ...good, phone: '1' }, { ...good, address: 'x' }, { ...good, qty: 3 }]) { const r = await place(req('/api/order/place', b)); assert.equal(r.status, 400); bad++; }
  state.remaining = 1; assert.equal((await place(req('/api/order/place', good))).status, 409); assert.equal(state.remaining, 1);
  assert.equal((await place(req('/api/order/place', good, { origin: 'https://evil.example' }))).status, 403);
  process.env.ORDERING_ENABLED = '0'; assert.equal((await place(req('/api/order/place', good))).status, 503); process.env.ORDERING_ENABLED = '1';
  assert.equal(state.orders.length, 0);
  ok('place: bad details, sold out, other websites and closed ordering are all refused with nothing saved'); }
{ reset(); const r = await create(req('/api/order/create', good)); assert.equal(r.status, 409); assert.match((await r.json()).error, /cash on delivery/i);
  ok('the online-payment route stays shut without Razorpay keys: customers are told to choose cash on delivery'); }

{ reset();
  assert.equal((await adminList.POST(req('/x', good, {}))).status, 403);
  const r = await adminList.POST(req('/x', { name: 'Fatima', phone: '9876500000', address: 'https://maps.app.goo.gl/abc123', qty: 1 }, A)); const d = await r.json();
  assert.equal(r.status, 200); const o = state.orders[0];
  assert.equal(o.source, 'manual'); assert.equal(o.total, 200); assert.equal(o.address, 'https://maps.app.goo.gl/abc123'); assert.equal(state.remaining, 41);
  await adminList.POST(req('/x', { name: 'Zoya', phone: '9876500001', address: 'Flat 9, Road 3, Banjara Hills', qty: 2, discountPercent: 0, deliveryFee: 50 }, A));
  assert.equal(state.orders[1].total, 850); assert.equal(state.orders[1].discount_amount, 0);
  ok('manual order: only the admin can add; a pasted Maps link is stored; offer and delivery fee can be overridden'); }
{ reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  assert.equal((await one(code, { action: 'preparing' }, {})).status, 403);
  assert.equal((await one(code, { action: 'preparing' })).status, 200); assert.equal(state.orders[0].status, 'preparing');
  assert.equal((await one(code, { action: 'out' })).status, 200); assert.equal(state.orders[0].status, 'dispatched');
  const noPay = await one(code, { action: 'delivered' }); assert.equal(noPay.status, 400); assert.equal(state.orders[0].status, 'dispatched');
  const done = await one(code, { action: 'delivered', paid_by: 'upi' }); assert.equal(done.status, 200);
  assert.equal(state.orders[0].status, 'delivered'); assert.equal(state.orders[0].paid_by, 'upi'); assert.ok(state.orders[0].paid_at);
  ok('kitchen: new -> cooking -> out for delivery -> delivered; delivered needs cash/UPI and records it'); }
{ reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  const g = await adminOne.GET(new Request('http://localhost/x', { headers: { authorization: 'Bearer ADMIN' } }), { params: Promise.resolve({ code }) });
  assert.equal(g.status, 200); assert.equal((await g.json()).order.customer_name, 'Ali Khan');
  assert.equal((await adminOne.GET(new Request('http://localhost/x'), { params: Promise.resolve({ code }) })).status, 403);
  ok('bill data: the full order is only available to the admin'); }
{ reset(); await place(req('/api/order/place', good)); await place(req('/api/order/place', { ...good, qty: 1 }));
  const [a, b] = state.orders.map((o) => o.code);
  assert.equal(state.remaining, 39);
  await one(a, { action: 'cancel', restore: true }); assert.equal(state.orders[0].status, 'cancelled'); assert.equal(state.remaining, 41);
  await one(b, { action: 'cancel', restore: false }); assert.equal(state.remaining, 41);
  ok('cancel: plates return to stock only when you say the food was not cooked'); }

{ // confirm order
  reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  assert.equal((await one(code, { action: 'confirm' }, {})).status, 403);
  assert.equal((await one(code, { action: 'confirm' })).status, 200); assert.equal(state.orders[0].status, 'confirmed');
  assert.equal((await one(code, { action: 'confirm' })).status, 409);                          // cannot confirm twice
  assert.equal((await one(code, { action: 'preparing' })).status, 200);                        // confirmed -> cooking works
  await one(code, { action: 'out' }); assert.equal(state.orders[0].status, 'dispatched');
  assert.equal((await one(code, { action: 'delivered', paid_by: 'cash' })).status, 200); assert.equal(state.orders[0].status, 'delivered');
  ok('confirm: only the admin; once; then cooking -> out -> delivered continue to work'); }
{ // confirmed orders can go straight out for delivery and can be cancelled with plates restored
  reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  await one(code, { action: 'confirm' }); assert.equal((await one(code, { action: 'out' })).status, 200);
  const code2 = (await (async () => { await place(req('/api/order/place', { ...good, qty: 1 })); return state.orders[1].code; })());
  await one(code2, { action: 'confirm' }); assert.equal(state.remaining, 39);
  await one(code2, { action: 'cancel', restore: true }); assert.equal(state.remaining, 40);
  ok('confirmed orders can go out directly, and cancelling one puts its plate back'); }
{ // edited bill: totals are recalculated by the server
  reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  const bill = { items: [{ name: 'Chicken Dum Biryani', qty: 2, rate: 400 }, { name: 'Raita', qty: 1, rate: 30 }],
    discount: { type: 'percent', value: 50 }, deliveryFee: 20, note: 'Thanks!', paymentText: 'PAID - UPI',
    customer: { name: 'Ali K', phone: '9763950680', address: 'Flat 202, Lotus Nest, Kondapur' } };
  assert.equal((await one(code, { action: 'save_bill', bill }, {})).status, 403);
  const r = await one(code, { action: 'save_bill', bill: { ...bill, total: 1, subtotal: 1 } }); const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  const o = state.orders[0];
  assert.equal(o.total, 435);                    // 830 - 415 (50%) + 20 delivery
  assert.equal(o.discount_amount, 415); assert.equal(o.discount_percent, 50); assert.equal(o.delivery_fee, 20);
  assert.equal(o.customer_name, 'Ali K'); assert.equal(o.address, 'Flat 202, Lotus Nest, Kondapur'); assert.equal(o.customer_phone, '919763950680');
  assert.equal(o.bill.items.length, 2); assert.equal(o.bill.note, 'Thanks!'); assert.equal(d.order.total, 435);
  ok('edit bill: extra item + 50% + delivery -> Rs 435, recalculated by the server (browser totals ignored), customer details updated'); }
{ // flat discount, no discount, clamping, rounding
  reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  const base = { items: [{ name: 'Biryani', qty: 1, rate: 349 }], deliveryFee: 0, discount: { type: 'flat', value: 100 } };
  await one(code, { action: 'save_bill', bill: base }); assert.equal(state.orders[0].total, 249); assert.equal(state.orders[0].discount_percent, 0);
  await one(code, { action: 'save_bill', bill: { ...base, discount: { type: 'flat', value: 99999 } } }); assert.equal(state.orders[0].total, 0);   // discount can never exceed the bill
  await one(code, { action: 'save_bill', bill: { ...base, discount: { type: 'none' }, deliveryFee: -50 } }); assert.equal(state.orders[0].total, 349);  // negative delivery becomes 0
  await one(code, { action: 'save_bill', bill: { ...base, discount: { type: 'percent', value: 50 } } }); assert.equal(state.orders[0].total, 175);    // 349 x 50% rounds
  ok('edit bill: flat discount, no discount, an over-large discount and a negative delivery charge are all handled safely'); }
{ // refused edits
  reset(); await place(req('/api/order/place', good)); const code = state.orders[0].code;
  assert.equal((await one(code, { action: 'save_bill', bill: { items: [], discount: { type: 'none' } } })).status, 400);
  assert.equal((await one(code, { action: 'save_bill', bill: { items: [{ name: '', qty: 1, rate: 100 }] } })).status, 400);
  assert.equal(state.orders[0].total, 400);   // 2 plates x Rs 200: unchanged by the refused edits
  state.orders[0].payment_mode = 'online';
  assert.equal((await one(code, { action: 'save_bill', bill: { items: [{ name: 'X', qty: 1, rate: 1 }] } })).status, 409);
  state.orders[0].payment_mode = 'cod'; state.orders[0].status = 'cancelled';
  assert.equal((await one(code, { action: 'save_bill', bill: { items: [{ name: 'X', qty: 1, rate: 1 }] } })).status, 409);
  ok('edit bill: an empty bill is refused; orders paid online or already cancelled cannot be edited'); }

{ // the printed bill must equal the order total for every quantity and awkward price
  const { billModel } = await lib('bill');
  for (const price of ['349', '399', '400', '299']) {
    process.env.PLATE_PRICE = price;
    for (const qty of [1, 2, 3, 4, 5]) {
      reset(); process.env.PLATE_PRICE = price; process.env.ORDER_MAX_QTY = '5';
      const r = await place(req('/api/order/place', { ...good, qty })); assert.equal(r.status, 200);
      const o = state.orders[0]; const m = billModel(o);
      assert.equal(m.total, Number(o.total), `price ${price} x ${qty}: bill ${m.total} vs order ${o.total}`);
      await one(o.code, { action: 'save_bill', bill: o.bill || { items: m.items, discount: { type: m.discountType, value: m.discountValue }, deliveryFee: m.fee } });
      assert.equal(state.orders[0].total, Number(o.total) || state.orders[0].total);
    }
  }
  process.env.PLATE_PRICE = '400'; process.env.ORDER_MAX_QTY = '2';
  ok('consistency: for prices 299/349/399/400 and 1-5 plates the bill total equals the order total, before and after re-saving'); }
{ // staff orders work with only the database key: the price falls back to the one shown on the website (Rs 400)
  reset(); const saved = process.env.PLATE_PRICE; delete process.env.PLATE_PRICE;
  const r = await adminList.POST(req('/x', { name: 'Atishray', phone: '8448103549', address: 'Vamsiram Savurnadurga Park, C8FW+5GX, Nanakramguda Rd, Gachibowli, Hyderabad 500032', qty: 1, note: 'From waitlist' }, A));
  const d = await r.json(); assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(state.orders[0].total, 200); assert.equal(state.orders[0].mrp, 400);
  assert.equal(state.orders[0].source, 'manual'); assert.equal(state.orders[0].customer_phone, '918448103549');
  assert.equal((await one(d.code, { action: 'confirm' })).status, 200); assert.equal(state.orders[0].status, 'confirmed');
  process.env.PLATE_PRICE = saved;
  // public ordering is still closed while ORDERING_ENABLED is off, even though a price now exists
  process.env.ORDERING_ENABLED = '0'; assert.equal((await place(req('/api/order/place', good))).status, 503); process.env.ORDERING_ENABLED = '1';
  ok('waitlist order: created from a waitlist person (name, phone, address), confirmed, Rs 200 after 50% off; public ordering stays closed'); }
{ reset(); const g = await adminList.GET(new Request('http://localhost/x', { headers: A })); assert.equal(g.status, 200);
  ok('order list loads for the admin'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
