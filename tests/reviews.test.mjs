// Review submission rules, tested with a FAKE database.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_reviewtest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'lib'), { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
fs.writeFileSync(path.join(T, 'lib', 'apiGuard.js'), fs.readFileSync(`${REPO}/lib/apiGuard.js`, 'utf8'));
fs.writeFileSync(path.join(T, 'route.js'), fs.readFileSync(`${REPO}/app/api/reviews/route.js`, 'utf8').replace(/from '@\/lib\/([\w-]+)'/g, (_, n) => `from './lib/${n}.js'`));
fs.writeFileSync(path.join(T, 'lib', 'supabase.js'), `
export const store = { settings: { accept_reviews: true }, settingsError: false, inserted: [], insertError: false };
export const supabase = { from: (t) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => store.settingsError ? { data: null, error: { message: 'x' } } : { data: store.settings, error: null } }) }),
  insert: async (rows) => { if (store.insertError) return { error: { message: 'x' } }; store.inserted.push(...rows); return { error: null }; },
}) };`);

const { POST } = await import(pathToFileURL(path.join(T, 'route.js')).href);
const { store } = await import(pathToFileURL(path.join(T, 'lib', 'supabase.js')).href);
let n = 0;
const req = (body, headers = {}, ip) => new Request('http://localhost/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', 'x-forwarded-for': ip || '10.5.0.' + ++n, ...headers }, body: JSON.stringify(body) });
const good = { name: 'Ali Khan', rating: 5, comment: 'Best dum biryani, rice was perfect.' };
let passed = 0; const ok = (m) => { passed++; console.log('  ok  ' + m); };
const reset = () => { store.settings = { accept_reviews: true }; store.settingsError = false; store.inserted.length = 0; store.insertError = false; };

console.log('Review submission rules (fake database)');
{ reset(); const r = await POST(req(good)); assert.equal(r.status, 200);
  assert.deepEqual(store.inserted[0], { name: 'Ali Khan', rating: 5, comment: 'Best dum biryani, rice was perfect.' });
  assert.ok(!('status' in store.inserted[0]));      // no status sent: the database makes it "pending", never "approved"
  ok('a valid review is saved with only name, rating and comment (the database makes it pending)'); }
{ reset(); store.settings = { accept_reviews: false }; const r = await POST(req(good)); assert.equal(r.status, 403); assert.equal(store.inserted.length, 0);
  store.settingsError = true; assert.equal((await POST(req(good))).status, 503);
  ok('nothing is saved while you have reviews switched off, or before the database is set up'); }
{ reset(); const bads = [{ ...good, name: 'A' }, { ...good, rating: 0 }, { ...good, rating: 6 }, { ...good, rating: 4.5 }, { ...good, rating: 'five' }, { ...good, comment: 'ok' },
    { ...good, comment: 'Great, see www.spam.com now' }, { ...good, comment: 'visit https://spam.example' }, { ...good, name: 'http://x.co' }, {}];
  for (const b of bads) assert.equal((await POST(req(b))).status, 400, JSON.stringify(b));
  assert.equal(store.inserted.length, 0);
  ok('too-short names or comments, ratings outside 1-5 or fractional, and links are all refused'); }
{ reset(); await POST(req({ name: '  Zoya\u0007  ', rating: 4, comment: 'x'.repeat(900) })); const row = store.inserted[0];
  assert.equal(row.name, 'Zoya'); assert.equal(row.comment.length, 600);
  ok('names are cleaned and very long comments are cut to 600 characters'); }
{ reset(); const r = await POST(req({ ...good, website: 'bot' })); assert.equal((await r.json()).ok, true); assert.equal(store.inserted.length, 0);
  assert.equal((await POST(req(good, { origin: 'https://evil.example' }))).status, 403); assert.equal(store.inserted.length, 0);
  ok('bots (hidden field) and other websites are blocked without saving anything'); }
{ reset(); const ip = '7.7.7.7'; const codes = []; for (let i = 0; i < 4; i++) codes.push((await POST(req(good, {}, ip))).status);
  assert.deepEqual(codes, [200, 200, 200, 429]); assert.equal(store.inserted.length, 3);
  ok('the same visitor can send only 3 reviews per 30 minutes'); }
{ reset(); store.insertError = true; assert.equal((await POST(req(good))).status, 502);
  ok('a database error gives a friendly message, not a crash'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
