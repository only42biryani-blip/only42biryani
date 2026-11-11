// Server-only Borzo (delivery) client. Never import this from a client component:
// it reads secrets from environment variables that must stay on the server.
//
// Environment variables (set in Vercel, and in .env.local for local testing):
//   BORZO_TOKEN         secret API token (test token while BORZO_ENV is "test")
//   BORZO_ENV           "test" (default) or "production"
//   KITCHEN_ADDRESS     pickup address shown to the rider, e.g. "Khairtabad, Hyderabad, Telangana"
//   KITCHEN_PHONE       phone of someone at the kitchen (digits, with 91), e.g. "919XXXXXXXXX"
//   DELIVERY_MARGIN     optional extra rupees added to the quote shown to customers (default 0)
//   BORZO_SMS           "1" to let Borzo text the customer the rider's name and phone (costs about Rs 3 per booking; default off)
//   BORZO_PAYMENT_METHOD how Borzo is paid for each booking: "balance" (default, your prepaid Borzo balance) or "cash"

const HOSTS = {
  test: 'https://robotapitest-in.borzodelivery.com/api/business/1.8',
  production: 'https://robot-in.borzodelivery.com/api/business/1.8',
};

export function borzoConfigured() {
  return Boolean(process.env.BORZO_TOKEN && process.env.KITCHEN_ADDRESS && process.env.KITCHEN_PHONE);
}

function base() {
  return process.env.BORZO_ENV === 'production' ? HOSTS.production : HOSTS.test;
}

async function call(method, path, body) {
  const url = `${base()}/${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'X-DV-Auth-Token': process.env.BORZO_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { is_successful: false, errors: ['non_json_response'] };
  }
  return data;
}

// Builds the two-point route: first point is the kitchen (pickup), second is the customer.
function route({ dropAddress, dropPhone, dropName, note, clientOrderId }) {
  return [
    {
      address: process.env.KITCHEN_ADDRESS,
      contact_person: { phone: process.env.KITCHEN_PHONE, name: 'Only42Biryani kitchen' },
      ...(clientOrderId ? { client_order_id: String(clientOrderId).slice(0, 32) } : {}),
    },
    {
      address: dropAddress,
      contact_person: { phone: dropPhone || process.env.KITCHEN_PHONE, ...(dropName ? { name: dropName } : {}) },
      ...(note ? { note: String(note).slice(0, 500) } : {}),
      ...(clientOrderId ? { client_order_id: String(clientOrderId).slice(0, 32) } : {}),
    },
  ];
}

// Quote and booking must use the same options, or the price the customer sees would not match what Borzo charges.
const smsOn = () => process.env.BORZO_SMS === '1';

const MATTER = 'Hot chicken dum biryani in a sealed takeaway box. Keep upright and deliver fast.';

// Price check before anything is booked. Safe to call as often as needed.
export async function quoteDelivery({ dropAddress, thermobox = false }) {
  const r = await call('POST', 'calculate-order', {
    matter: MATTER,
    vehicle_type_id: 8, // motorbike, up to 20 kg
    total_weight_kg: 1,
    is_thermobox_required: Boolean(thermobox),
    is_client_notification_enabled: smsOn(),
    is_contact_person_notification_enabled: smsOn(),
    points: route({ dropAddress }),
  });
  if (!r.is_successful) return { ok: false, errors: r.errors || ['unknown'], parameterErrors: r.parameter_errors || null };
  const price = Number(r.order?.payment_amount);
  if (!Number.isFinite(price)) return { ok: false, errors: ['no_price'] };
  const margin = Number(process.env.DELIVERY_MARGIN || 0) || 0;
  return {
    ok: true,
    borzoPrice: price,
    // What we show to the customer: Borzo's price plus an optional margin, rounded up to whole rupees.
    customerFee: Math.ceil(price + margin),
    warnings: r.warnings || [],
  };
}

// Books a rider. Call this only after the customer has paid and the kitchen is nearly ready.
export async function bookDelivery({ dropAddress, dropPhone, dropName, note, clientOrderId, thermobox = false }) {
  const r = await call('POST', 'create-order', {
    matter: MATTER,
    vehicle_type_id: 8,
    total_weight_kg: 1,
    is_thermobox_required: Boolean(thermobox),
    is_client_notification_enabled: smsOn(),
    is_contact_person_notification_enabled: smsOn(),
    payment_method: process.env.BORZO_PAYMENT_METHOD === 'cash' ? 'cash' : 'balance',
    points: route({ dropAddress, dropPhone, dropName, note, clientOrderId }),
  });
  if (!r.is_successful) return { ok: false, errors: r.errors || ['unknown'], parameterErrors: r.parameter_errors || null };
  return { ok: true, orderId: r.order.order_id, status: r.order.status, price: r.order.payment_amount, order: r.order };
}

export async function cancelDelivery(orderId) {
  const r = await call('POST', 'cancel-order', { order_id: Number(orderId) });
  return r.is_successful ? { ok: true, status: r.order?.status } : { ok: false, errors: r.errors || ['unknown'] };
}

export async function courierInfo(orderId) {
  const r = await call('GET', `courier?order_id=${encodeURIComponent(orderId)}`);
  return r.is_successful ? { ok: true, courier: r.courier } : { ok: false, errors: r.errors || ['unknown'] };
}
