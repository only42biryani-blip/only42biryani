// Contact requests: our phone number is never public; it is shown to one visitor only after the admin approves. FAKE database.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_contacttest');
fs.rmSync(T, { recursive: true, force: true });
for (const d of ['lib', 'routes']) fs.mkdirSync(path.join(T, d), { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
const rewrite = (src, rel) => src.replace(/from 'next\/server'/g, "from 'next/server.js'").replace(/from '@\/lib\/([\w-]+)'/g, (_, n) => `from '${rel}${n}.js'`);
for (const f of ['orders', 'apiGuard', 'config', 'contactRequests', 'kitchenContact', 'telegram']) {
  fs.writeFileSync(path.join(T, 'lib', f + '.js'), rewrite(fs.readFileSync(`${REPO}/lib/${f}.js`, 'utf8'), './'));
}
const routes = { create: 'app/api/contact/request/route.js', status: 'app/api/contact/request/[code]/route.js', admin: 'app/api/admin/requests/route.js' };
for (const [k, f] of Object.entries(routes)) fs.writeFileSync(path.join(T, 'routes', k + '.js'), rewrite(fs.readFileSync(`${REPO}/${f}`, 'utf8'), '../lib/'));
fs.writeFileSync(path.join(T, 'lib', 'adminAuth.js'), `export async function requireAdmin(r){ return r.headers.get('authorization')==='Bearer ADMIN' ? null : Response.json({error:'x'},{status:403}); }`);
fs.writeFileSync(path.join(T, 'lib', 'supabase-admin.js'), `
export const rows = [];
let n = 0;
function query(table) {
  const f = []; let ord = null, lim = null, mode = 'select', patch = null, ins = null;
  const q = {
    select: () => q, eq: (c, v) => { f.push((r) => r[c] === v); return q; }, gte: (c, v) => { f.push((r) => r[c] >= v); return q; },
    order: (c, o) => { ord = [c, o.ascending]; return q; }, limit: (x) => { lim = x; return q; },
    update: (p) => { mode = 'update'; patch = p; return q; }, insert: (r) => { mode = 'insert'; ins = r; return q; },
    maybeSingle: async () => { const r = rows.filter((x) => f.every((g) => g(x)))[0]; return { data: r || null, error: null }; },
    then: (res, rej) => (async () => {
      if (mode === 'insert') { for (const r of ins) rows.push({ id: '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'), created_at: new Date().toISOString(), status: 'new', approved_at: null, ...r }); return { data: ins, error: null }; }
      let list = rows.filter((x) => f.every((g) => g(x)));
      if (mode === 'update') { list.forEach((r) => Object.assign(r, patch)); return { data: list.map((r) => ({ id: r.id })), error: null }; }
      if (ord) list = [...list].sort((a, b) => (a[ord[0]] < b[ord[0]] ? 1 : -1) * (ord[1] ? -1 : 1));
      if (lim) list = list.slice(0, lim);
      return { data: list, error: null };
    })().then(res, rej),
  };
  return q;
}
export const orderDb = () => (process.env.SUPABASE_SERVICE_ROLE_KEY ? { from: query, rpc: async () => ({ data: 0, error: null }) } : null);`);

Object.assign(process.env, { SUPABASE_SERVICE_ROLE_KEY: 'fake' });
delete process.env.CONTACT_PHONE;
const imp = (rel) => import(pathToFileURL(path.join(T, rel)).href);
const create = (await imp('routes/create.js')).POST, status = (await imp('routes/status.js')).GET, admin = await imp('routes/admin.js');
const { rows } = await imp('lib/supabase-admin.js');
const CR = await imp('lib/contactRequests.js');
const KITCHEN = '8999449765';

let passed = 0; const ok = (m) => { passed++; console.log('  ok  ' + m); };
let ip = 0;
const post = (body) => new Request('http://localhost/api/contact/request', { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', 'x-forwarded-for': '10.7.0.' + ++ip }, body: JSON.stringify(body) });
const get = (code) => status(new Request('http://localhost/x', { headers: { 'x-forwarded-for': '10.8.0.1' } }), { params: Promise.resolve({ code }) });
const A = { authorization: 'Bearer ADMIN', 'content-type': 'application/json' };
const patch = (id, action) => admin.PATCH(new Request('http://localhost/x', { method: 'PATCH', headers: A, body: JSON.stringify({ id, action }) }));
const good = { name: 'Ravi Kumar', phone: '98765 43210', message: 'Need to change my address urgently', orderCode: 'zhwjb4pz' };

console.log('Contact requests');
{ assert.equal((await create(post({ ...good, name: 'R' }))).status, 400); assert.equal((await create(post({ ...good, phone: '12345' }))).status, 400); assert.equal(rows.length, 0);
  const sent = []; const realFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = '1:a'; process.env.TELEGRAM_CHAT_ID = '5';
  globalThis.fetch = async (u, o) => { if (String(u).startsWith('https://api.telegram.org/')) { sent.push(JSON.parse(o.body).text); return new Response('{"ok":true}'); } return realFetch(u, o); };
  try {
    const r = await create(post(good)); const txt = await r.text(); const d = JSON.parse(txt);
    assert.equal(r.status, 200); assert.match(d.code, /^[A-Z2-9]{8}$/); assert.ok(!txt.includes(KITCHEN)); // our number is never in the answer
    assert.equal(rows.length, 1); assert.equal(rows[0].phone, '919876543210'); assert.equal(rows[0].order_code, 'ZHWJB4PZ'); assert.equal(rows[0].status, 'new'); assert.equal(rows[0].approved_at, null);
    assert.equal(sent.length, 1); assert.ok(sent[0].includes(d.code) && sent[0].includes('Ravi Kumar') && sent[0].includes('919876543210') && sent[0].includes('ZHWJB4PZ')); assert.ok(!sent[0].includes(KITCHEN));
  } finally { globalThis.fetch = realFetch; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
  ok('a request needs a name and a valid mobile; it is saved and sent to Telegram; our number is not in the answer or the alert'); }

{ const before = rows.length; const r = await create(post(good)); const d = await r.json(); assert.equal(d.code, rows[0].code); assert.equal(rows.length, before); // same phone again = same request
  const hp = await create(post({ ...good, phone: '9000000001', website: 'bot' })); assert.equal(hp.status, 200); assert.equal(rows.length, before); // honeypot saves nothing
  const bad = new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', host: 'localhost' }, body: JSON.stringify(good) });
  assert.equal((await create(bad)).status, 403);
  ok('asking twice (same phone) does not create duplicates; the bot trap and other sites are refused'); }

const code = rows[0].code;
{ const r = await get(code); const txt = await r.text(); const d = JSON.parse(txt);
  assert.equal(r.status, 200); assert.equal(d.status, 'new'); assert.equal(d.approved, false); assert.equal(d.phone, undefined); assert.ok(!txt.includes(KITCHEN)); assert.ok(!txt.includes('Ravi')); assert.ok(!txt.includes('9876543210'));
  assert.equal((await get('lowercase')).status, 404); assert.equal((await get('ZZZZZZZZ')).status, 404);
  ok('before approval the visitor sees only "received": no phone number, no personal data; wrong or unknown codes are 404'); }

{ assert.equal((await admin.GET(new Request('http://localhost/x'))).status, 403); assert.equal((await admin.PATCH(new Request('http://localhost/x', { method: 'PATCH', body: '{}' }))).status, 403);
  const l = await (await admin.GET(new Request('http://localhost/x', { headers: A }))).json(); assert.equal(l.open, 1); assert.equal(l.requests[0].phone, '919876543210'); assert.equal(l.requests[0].revealed, false);
  assert.equal((await patch('not-an-id', 'show')).status, 400); assert.equal((await patch(rows[0].id, 'explode')).status, 400);
  ok('only the admin can list or change requests; bad actions are refused'); }

{ assert.equal((await patch(rows[0].id, 'show')).status, 200);
  const d = await (await get(code)).json(); assert.equal(d.approved, true); assert.equal(d.phone, '+' + '91' + KITCHEN.slice(0)); assert.equal(d.tel, 'tel:+91' + KITCHEN); assert.equal(d.whatsapp, 'https://wa.me/91' + KITCHEN); assert.ok(d.expiresAt);
  assert.equal((await (await admin.GET(new Request('http://localhost/x', { headers: A }))).json()).requests[0].revealed, true);
  ok('after "Show our number" that visitor (and only a request with its code) gets the number, for a limited time'); }

{ const realNow = rows[0].approved_at; rows[0].approved_at = new Date(Date.now() - (CR.REVEAL_HOURS + 1) * 3600e3).toISOString();
  assert.equal((await (await get(code)).json()).approved, false); // 25 hours later: hidden again
  rows[0].approved_at = realNow; assert.equal((await (await get(code)).json()).approved, true);
  await patch(rows[0].id, 'hide'); assert.equal((await (await get(code)).json()).approved, false);
  await patch(rows[0].id, 'show'); await patch(rows[0].id, 'done'); const d = await (await get(code)).json(); assert.equal(d.approved, false); assert.equal(d.status, 'done'); assert.equal(d.phone, undefined);
  await patch(rows[0].id, 'reopen'); assert.equal((await (await get(code)).json()).status, 'new');
  ok('the number hides again after 24 hours, when you press Hide, and when the request is finished; Reopen works'); }

{ process.env.CONTACT_PHONE = '919123456789'; await patch(rows[0].id, 'show');
  const d = await (await get(code)).json(); assert.equal(d.phone, '+919123456789'); delete process.env.CONTACT_PHONE;
  ok('the number can be changed with CONTACT_PHONE in Vercel'); }

{ // The number must not appear anywhere in the website code except the server-only file.
  const skip = new Set(['node_modules', '.next', '.git', '_backup', '.claude', 'tests']); // tests hold the number only to check for it
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name) || e.name.startsWith('.tmp_')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(jsx?|mjs|json|md|txt|xml|html|css|sql|webmanifest)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes(KITCHEN)) hits.push(path.relative(REPO, p).replace(/\\/g, '/'));
  } };
  walk(REPO); assert.deepEqual(hits, ['lib/kitchenContact.js']);
  const importers = []; for (const d of ['app', 'components', 'lib']) { const w = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) w(p); else if (/\.jsx?$/.test(e.name)) { const s = fs.readFileSync(p, 'utf8'); if (/from '@\/lib\/kitchenContact'/.test(s)) importers.push(path.relative(REPO, p).replace(/\\/g, '/')); } } }; w(path.join(REPO, d)); }
  for (const f of importers) assert.ok(!fs.readFileSync(path.join(REPO, f), 'utf8').trimStart().startsWith("'use client'"), f + ' must not be a client component');
  assert.deepEqual(importers, ['app/api/contact/request/[code]/route.js']);
  ok('audit: the phone number is only in the server-only file, and only the approved-reveal route uses it'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
