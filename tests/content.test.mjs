// The public wording: live site explains pre-booking and the waitlist; pre-launch wording stays only before launch.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_contenttest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T, { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
fs.writeFileSync(path.join(T, 'faq.js'), fs.readFileSync(`${REPO}/lib/faq.js`, 'utf8'));
const { getFaqItems } = await import(pathToFileURL(path.join(T, 'faq.js')).href);

let passed = 0; const ok = (m) => { passed++; console.log('  ok  ' + m); };
const live = getFaqItems(true), pre = getFaqItems(false);
const text = (items) => items.map((i) => `${i.q} ${i.a}`).join('\n');

console.log('Public wording');
{ const t = text(live);
  assert.ok(!/haven't opened orders|go live on Zomato|launch/i.test(t.replace(/goes live|go live/g, '')), 'no pre-launch wording once live');
  for (const q of ['What is pre-booking?', 'What is the waitlist for?', 'Where do you deliver', 'How do I pay?', 'Can I order more than one plate?', 'Can I cancel my order?', 'How do I contact you?']) assert.ok(live.some((i) => i.q.startsWith(q)), q);
  assert.match(live.find((i) => i.q === 'How do I order?').a, /Order page/);
  assert.match(live.find((i) => i.q.startsWith('What is the waitlist for')).a, /not an order/);
  ok('live FAQ: ordering on the site, pre-booking, what the waitlist is (and is not), delivery area, payment, plates, cancelling, contact'); }
{ assert.match(pre.find((i) => i.q === 'How do I order?').a, /haven't opened orders/); assert.ok(!pre.some((i) => i.q === 'What is pre-booking?'));
  ok('before launch the FAQ still tells people to join the waitlist'); }
{ const all = [...live, ...pre].map((i) => i.a + i.q).join(' '); assert.ok(!all.includes('8999449765'));
  assert.ok(!/\+91|call us on|phone number is/i.test(text(live)));
  ok('no phone number in the FAQ'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
