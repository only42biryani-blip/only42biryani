// Server-only Razorpay helpers (REST, no SDK). Keys live in environment variables:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
import crypto from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const raw = `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

async function rzp(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

export async function createRazorpayOrder({ totalRupees, receipt, notes }) {
  const { ok, data } = await rzp('/orders', {
    amount: toPaise(totalRupees),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes: notes || {},
  });
  return ok ? { ok: true, id: data.id, amountPaise: data.amount } : { ok: false, error: data?.error?.description || 'razorpay_error' };
}

export async function refundPayment(paymentId, totalRupees) {
  const { ok, data } = await rzp(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    amount: toPaise(totalRupees),
    speed: 'normal',
  });
  return ok ? { ok: true, id: data.id } : { ok: false, error: data?.error?.description || 'refund_failed' };
}

function safeEqualHex(a, b) {
  try {
    const x = Buffer.from(String(a), 'hex');
    const y = Buffer.from(String(b), 'hex');
    return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

// Checkout success: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

// Webhook: signature = HMAC_SHA256(raw request body, webhook_secret)
export function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
