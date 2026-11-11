// Bill maths, shared by the admin bill page (live preview) and the server (so the saved total is always
// worked out by the server, never trusted from the browser). Plain functions, no React.
import { OFFER } from '@/lib/config';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Cleans and totals a bill. `bill` = { items:[{name,qty,rate}], discount:{type,value}, deliveryFee, ... }
// type: "percent" (value = %), "flat" (value = rupees) or "none".
export function computeBill(bill) {
  const items = (Array.isArray(bill?.items) ? bill.items : [])
    .map((it) => ({
      name: String(it?.name || '').trim().slice(0, 40),
      qty: Math.min(99, Math.max(0, Math.round(num(it?.qty)))),
      rate: Math.min(100000, Math.max(0, r2(num(it?.rate)))),
    }))
    .filter((it) => it.name && it.qty > 0)
    .slice(0, 10);

  const subtotal = r2(items.reduce((s, it) => s + it.qty * it.rate, 0));
  const type = bill?.discount?.type === 'percent' || bill?.discount?.type === 'flat' ? bill.discount.type : 'none';
  const value = Math.max(0, num(bill?.discount?.value));
  let discountAmount = 0;
  let discountLabel = '';
  if (type === 'percent') {
    const pct = Math.min(100, value);
    // Round the price of ONE unit after the discount to whole rupees, exactly as the order page does
    // (a Rs 349 plate at 50% off is Rs 175), so a saved bill never differs from the order total by a rupee.
    discountAmount = items.reduce((sum, it) => sum + it.qty * (it.rate - Math.round(it.rate * (1 - pct / 100))), 0);
    discountLabel = Number(pct) === Number(OFFER?.percent) && OFFER?.label ? OFFER.label : `${pct}% discount`;
  } else if (type === 'flat') {
    discountAmount = Math.min(subtotal, r2(value));
    discountLabel = 'Discount';
  }
  const fee = Math.min(100000, Math.max(0, r2(num(bill?.deliveryFee))));
  const total = Math.max(0, r2(subtotal - discountAmount + fee));
  return { items, subtotal, discountAmount, discountLabel, discountType: type, discountValue: value, fee, total };
}

// The editable bill that matches an order as it stands (used until a bill has been edited and saved).
export function defaultBill(o) {
  const mrp = num(o.mrp) > 0 ? num(o.mrp) : num(o.plate_price);
  const pct = num(o.discount_percent);
  const amt = num(o.discount_amount);
  return {
    items: [{ name: 'Chicken Dum Biryani', qty: num(o.qty, 1), rate: mrp }],
    discount: pct > 0 ? { type: 'percent', value: pct } : amt > 0 ? { type: 'flat', value: amt } : { type: 'none', value: 0 },
    deliveryFee: num(o.delivery_fee),
    note: '',
    paymentText: '',
    customer: {},
  };
}

export function paymentText(o, bill) {
  if (bill?.paymentText) return String(bill.paymentText).slice(0, 60);
  if (o.payment_mode === 'cod') return o.paid_by ? `PAID - ${String(o.paid_by).toUpperCase()} on delivery` : 'TO PAY on delivery (cash / UPI)';
  return 'PAID online';
}

// Everything the printed bill shows, from the order plus an (optionally edited) bill.
export function billModel(o, billInput) {
  const bill = billInput || (o.bill && typeof o.bill === 'object' ? o.bill : defaultBill(o));
  const c = computeBill(bill);
  return {
    ...c,
    code: o.code,
    createdAt: o.created_at,
    customer: {
      name: bill.customer?.name || o.customer_name,
      phone: String(bill.customer?.phone || o.customer_phone || ''),
      address: bill.customer?.address || o.address,
    },
    note: String(bill.note || '').slice(0, 120),
    payment: paymentText(o, bill),
    orderNote: o.note || '',
  };
}

const rs = (n) => `Rs ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export { rs };

// Server-side validation for a saved bill. Returns { ok, bill, model } or { ok:false, error }.
export function sanitizeBill(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Missing bill.' };
  const c = computeBill(input);
  if (c.items.length === 0) return { ok: false, error: 'Add at least one item with a name and quantity.' };
  const phone = String(input.customer?.phone || '').replace(/[^\d]/g, '').slice(-12);
  const bill = {
    items: c.items,
    discount: { type: c.discountType, value: c.discountValue },
    deliveryFee: c.fee,
    note: String(input.note || '').trim().slice(0, 120),
    paymentText: String(input.paymentText || '').trim().slice(0, 60),
    customer: {
      name: String(input.customer?.name || '').trim().slice(0, 80),
      phone: phone.length === 10 ? `91${phone}` : phone,
      address: String(input.customer?.address || '').trim().slice(0, 350),
    },
  };
  return { ok: true, bill, totals: c };
}
