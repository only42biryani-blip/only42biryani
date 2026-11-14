import { SITE_URL } from '@/lib/config';

// Ready-to-send WhatsApp messages for the Orders board. They are free: one tap opens WhatsApp with the text already
// typed, and you press send from your own phone. Every message carries the customer's tracking link, which updates by
// itself (order confirmed, out for delivery, delivered), so they can check without asking you.
// Pure functions (no phone number of ours inside): safe to use in the browser.
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const first = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const plates = (o) => `${o.qty} plate${o.qty > 1 ? 's' : ''}`;
const cod = (o) => o.payment_mode === 'cod';
export const trackUrl = (o) => `${SITE_URL}/order/${o.code}`;
const day = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export const MESSAGES = {
  // A new order has arrived and you have not confirmed it yet.
  received: (o) =>
    `Hello ${first(o.customer_name)}, thank you for your Only42Biryani order ${o.code}${o.scheduled_for ? ` (pre-booked for ${day(o.scheduled_for)})` : ''}: ${plates(o)}, total ${money(o.total)}. ` +
    `We will confirm it shortly. Track it here: ${trackUrl(o)}`,

  confirmed: (o) =>
    `Hello ${first(o.customer_name)}, your Only42Biryani order ${o.code} is confirmed${o.scheduled_for ? ` for ${day(o.scheduled_for)}` : ''}. ` +
    `${plates(o)}, total ${money(o.total)}${cod(o) ? '. Please keep cash or UPI ready.' : '. Already paid, thank you.'} We will deliver soon. Track it here: ${trackUrl(o)}`,

  outForDelivery: (o) =>
    `Hello ${first(o.customer_name)}, your Only42Biryani order ${o.code} is out for delivery and will reach you soon. ` +
    `${cod(o) ? `Please keep ${money(o.total)} ready (cash or UPI).` : 'It is already paid.'} Track it here: ${trackUrl(o)}`,

  delivered: (o) =>
    `Hello ${first(o.customer_name)}, thank you for ordering from Only42Biryani! We hope you enjoyed it. ` +
    `If you liked it, a quick review helps a small kitchen a lot: ${SITE_URL}/#reviews`,

  cancelled: (o) =>
    `Hello ${first(o.customer_name)}, sorry, your Only42Biryani order ${o.code} has been cancelled. ` +
    `${o.razorpay_payment_id ? `Your payment of ${money(o.total)} is being refunded in full to the same payment method (usually in 5 to 7 working days).` : 'You have not been charged anything.'} ` +
    'Sorry for the trouble. You are always welcome to order again.',

  tooFar: (o) =>
    `Hello ${first(o.customer_name)}, sorry, your address for Only42Biryani order ${o.code} is about ${Number(o.distance_km)} km away, which is outside our delivery range. ` +
    `${cod(o) ? 'We have to cancel this order.' : 'We will cancel it and refund your full payment.'} Sorry for the trouble.`,
};

// A wa.me link that opens WhatsApp to this customer with the message typed in. phone = digits with 91, as saved.
export const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
