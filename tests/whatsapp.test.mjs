// The ready-to-send WhatsApp messages on the Orders board: wording, tracking link, cash vs online, cancelled, no number of ours.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(REPO, '.tmp_watest');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T, { recursive: true });
fs.writeFileSync(path.join(T, 'package.json'), '{"type":"module"}');
fs.writeFileSync(path.join(T, 'config.js'), fs.readFileSync(`${REPO}/lib/config.js`, 'utf8'));
fs.writeFileSync(path.join(T, 'whatsappMessages.js'), fs.readFileSync(`${REPO}/lib/whatsappMessages.js`, 'utf8').replace(/from '@\/lib\/config'/, "from './config.js'"));
const { MESSAGES, waLink, trackUrl } = await import(pathToFileURL(path.join(T, 'whatsappMessages.js')).href);

let passed = 0; const ok = (m) => { passed++; console.log('  ok  ' + m); };
const cod = { code: 'ZHWJB4PZ', customer_name: 'Shadab Sheikh', customer_phone: '919876543210', qty: 2, total: 440, payment_mode: 'cod', scheduled_for: null, razorpay_payment_id: null, distance_km: 12 };
const online = { ...cod, payment_mode: 'online', razorpay_payment_id: 'pay_X' };
const pre = { ...cod, scheduled_for: '2026-11-15' };

console.log('WhatsApp messages');
{ assert.equal(trackUrl(cod), 'https://only42biryani.com/order/ZHWJB4PZ');
  for (const k of ['received', 'confirmed', 'outForDelivery']) assert.ok(MESSAGES[k](cod).includes('https://only42biryani.com/order/ZHWJB4PZ'), k + ' has the tracking link');
  assert.ok(MESSAGES.received(cod).includes('Hello Shadab,') && MESSAGES.received(cod).includes('2 plates') && MESSAGES.received(cod).includes('₹440'));
  ok('received / confirmed / out for delivery all carry the tracking link, the first name, the plates and the total'); }
{ assert.match(MESSAGES.confirmed(cod), /keep cash or UPI ready/); assert.match(MESSAGES.confirmed(online), /Already paid/);
  assert.match(MESSAGES.outForDelivery(cod), /keep ₹440 ready/); assert.match(MESSAGES.outForDelivery(online), /already paid/);
  ok('cash orders ask for cash or UPI; online orders say they are already paid'); }
{ assert.match(MESSAGES.confirmed(pre), /for Sunday, 15 November/); assert.match(MESSAGES.received(pre), /pre-booked for Sunday, 15 November/);
  ok('a pre-booked order names the day'); }
{ assert.match(MESSAGES.cancelled(cod), /You have not been charged anything/); assert.ok(!/refund/i.test(MESSAGES.cancelled(cod)));
  assert.match(MESSAGES.cancelled(online), /₹440 is being refunded in full/); assert.match(MESSAGES.cancelled(online), /5 to 7 working days/);
  ok('cancelled: a cash order says nothing was charged; an online order promises the full refund in 5 to 7 working days (as in the refund policy)'); }
{ assert.match(MESSAGES.delivered(cod), /thank you for ordering/i); assert.ok(MESSAGES.delivered(cod).includes('https://only42biryani.com/#reviews'));
  assert.match(MESSAGES.tooFar(cod), /12 km away/); assert.match(MESSAGES.tooFar(cod), /cancel this order/); assert.match(MESSAGES.tooFar(online), /refund your full payment/);
  ok('thank-you carries the review link; too-far message unchanged in meaning'); }
{ const l = waLink('919876543210', 'Hello & welcome #1\nline 2'); assert.ok(l.startsWith('https://wa.me/919876543210?text=')); assert.equal(decodeURIComponent(l.split('?text=')[1]), 'Hello & welcome #1\nline 2');
  assert.ok(waLink('+91 98765-43210', 'x').startsWith('https://wa.me/919876543210?text='));
  for (const k of Object.keys(MESSAGES)) assert.ok(!MESSAGES[k](cod).includes('8999449765'), k + ' must not contain the kitchen number');
  ok('the link opens WhatsApp to the customer with the text encoded; no message contains the kitchen phone number'); }

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n${passed} scenarios passed`);
