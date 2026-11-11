// Server-only rules for direct ordering. Everything is controlled by environment variables so that
// nothing is invented and nothing goes live until you set it:
//   ORDERING_ENABLED   "1" to open direct ordering (anything else = closed)
//   PLATE_PRICE        price of one plate in rupees, e.g. 349
//   ORDER_MAX_QTY      most plates per order (default 2, max 5)
//   ORDER_HOURS        opening hours in IST as "HH:MM-HH:MM", e.g. "12:00-22:00" (empty = always)
//   MAX_DELIVERY_FEE   highest delivery price we accept; a longer trip is "outside our delivery area"
//   BORZO_THERMOBOX    "1" to request a thermal box on every booking
//   ORDER_MODE         "self" = customers pay cash/UPI on delivery (no Razorpay needed); anything else = customers pay online with Razorpay
//                      (works with Razorpay TEST keys too). In both modes you choose per order who delivers.
//   SELF_DELIVERY_FEE  delivery charge in rupees for self-delivery orders (default 0 = free delivery)
import crypto from 'node:crypto';
import { OFFER, PLATE } from '@/lib/config';
import { orderDb } from '@/lib/supabase-admin';

export function plateConfig() {
  // PLATE_PRICE in Vercel wins; otherwise use the price shown on the website (lib/config.js).
  const price = Number(process.env.PLATE_PRICE || String(PLATE?.price || '').replace(/[^\d.]/g, ''));
  const maxQty = Math.min(5, Math.max(1, Number(process.env.ORDER_MAX_QTY) || 2));
  const maxFee = Number(process.env.MAX_DELIVERY_FEE) || 0;
  const selfFee = Math.max(0, Number(process.env.SELF_DELIVERY_FEE) || 0);
  const offerPercent = Math.min(90, Math.max(0, Number(OFFER?.percent) || 0));
  return { price: Number.isFinite(price) && price > 0 ? price : null, maxQty, maxFee, selfFee, offerPercent, hours: (process.env.ORDER_HOURS || '').trim() };
}


// Works out every amount on the server. price = the full (MRP) price of one plate.
export function priceOrder(qty, cfg = plateConfig(), deliveryFee = cfg.selfFee) {
  const mrp = cfg.price;
  const net = Math.round(mrp * (1 - cfg.offerPercent / 100));
  const discountAmount = qty * (mrp - net);
  return { mrp, net, discountPercent: cfg.offerPercent, discountAmount, deliveryFee, subtotal: qty * mrp, total: qty * net + deliveryFee };
}

// Why ordering is closed, or null if it is open for configuration purposes.
export function orderingBlocker() {
  if (process.env.ORDERING_ENABLED !== '1') return 'closed';
  const c = plateConfig();
  if (!c.price) return 'no_price';
  if (!orderDb()) return 'no_database';
  return null; // Razorpay and the payment options are checked per order (see lib/payment.js)
}

function istMinutes(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

export function isOpenNow(date = new Date()) {
  const h = plateConfig().hours;
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(h);
  if (!m) return true;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  const now = istMinutes(date);
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

// Unambiguous characters only (no 0/O, 1/I), so a code is easy to read out.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

const PHONE = /^(\+91)?[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { ok:true, value } or { ok:false, error }.
export function validateOrder(body, maxQty) {
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').replace(/[\s-]/g, '');
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const address = String(body.address || '').trim().slice(0, 350);
  const note = String(body.note || '').trim().slice(0, 200);
  const qty = Number(body.qty);
  const lat = Number(body.lat), lng = Number(body.lng);
  const hasPin = body.lat !== undefined && body.lat !== null && body.lat !== '' && Number.isFinite(lat) && Number.isFinite(lng) && lat > 6 && lat < 38 && lng > 68 && lng < 98;
  if (name.length < 2) return { ok: false, error: 'Enter your name.' };
  if (!PHONE.test(phone)) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
  if (email && !EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address or leave it empty.' };
  if (address.length < 10) return { ok: false, error: 'Enter the full delivery address (flat or house, street, area).' };
  if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return { ok: false, error: `You can order 1 to ${maxQty} plates.` };
  const digits = phone.replace(/^\+/, '');
  return { ok: true, value: { name, phone: digits.length === 10 ? `91${digits}` : digits, email: email || null, address, note: note || null, qty, lat: hasPin ? lat : null, lng: hasPin ? lng : null } };
}

export const STATUS_LABEL = {
  new: 'Order received',
  confirmed: 'Order confirmed',
  pending_payment: 'Waiting for payment',
  paid: 'Payment received',
  preparing: 'Being prepared',
  ready: 'Packed, rider on the way to the kitchen',
  dispatched: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Payment not completed',
  paid_needs_refund: 'Refund in progress',
  refunded: 'Refunded',
};
