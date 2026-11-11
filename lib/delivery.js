// Delivery range and charges. Pure functions (safe on the server and in the browser); the numbers come from
// the settings you edit in /admin -> Delivery.

export const DEFAULT_RULES = { kitchenLat: null, kitchenLng: null, maxKm: 5, freeKm: 2, baseFee: 0, perKmFee: 10, requirePin: true };

// Straight-line distance on a map is shorter than the real road. This is a typical city factor.
export const ROAD_FACTOR = 1.3;

const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));

// Turns a row of the settings table into rules, with safe defaults for anything missing.
export function rulesFromRow(row) {
  const r = row || {};
  return {
    kitchenLat: r.kitchen_lat === null || r.kitchen_lat === undefined ? null : Number(r.kitchen_lat),
    kitchenLng: r.kitchen_lng === null || r.kitchen_lng === undefined ? null : Number(r.kitchen_lng),
    maxKm: Math.max(0.5, num(r.max_km, DEFAULT_RULES.maxKm)),
    freeKm: Math.max(0, num(r.free_km, DEFAULT_RULES.freeKm)),
    baseFee: Math.max(0, num(r.base_fee, DEFAULT_RULES.baseFee)),
    perKmFee: Math.max(0, num(r.per_km_fee, DEFAULT_RULES.perKmFee)),
    requirePin: r.require_pin !== false,
  };
}

export function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Approximate road distance in km (one decimal) from the kitchen to a map pin.
export function roadKm(rules, pin) {
  const km = haversineKm({ lat: rules.kitchenLat, lng: rules.kitchenLng }, pin) * ROAD_FACTOR;
  return Math.round(km * 10) / 10;
}

// The delivery charge for a distance: base fee up to freeKm, then perKmFee for each extra (started) km.
export function feeFor(km, rules) {
  const extra = km > rules.freeKm ? Math.ceil(km - rules.freeKm) : 0;
  return Math.round(rules.baseFee + extra * rules.perKmFee);
}

export const hasKitchenPin = (rules) => Number.isFinite(rules.kitchenLat) && Number.isFinite(rules.kitchenLng) && rules.kitchenLat !== null && rules.kitchenLng !== null;

// Works out distance and delivery charge for a place. pin = { lat, lng } or null.
// Returns { ok, checked, outside, km, fee, reason, message }. ok is false only when a live location is required but missing. fee is null when it cannot be worked out (use your default).
export function checkDelivery(rules, pin) {
  if (!hasKitchenPin(rules)) return { ok: true, checked: false, km: null, fee: null, reason: 'not_configured', message: '' };
  const hasPin = pin && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));
  if (!hasPin) {
    if (rules.requirePin) {
      return { ok: false, checked: false, km: null, fee: null, reason: 'need_location', message: `Please share your live location so we can work out the distance and the delivery charge.` };
    }
    return { ok: true, checked: false, km: null, fee: rules.baseFee, reason: 'unchecked', message: '' };
  }
  const km = roadKm(rules, { lat: Number(pin.lat), lng: Number(pin.lng) });
  const fee = feeFor(km, rules);
  // Beyond the usual range we still ACCEPT the order (no hard limit). It is flagged "outside" so you can decide:
  // deliver anyway, or cancel it and refund in full.
  if (km > rules.maxKm) {
    return { ok: true, checked: true, outside: true, km, fee, reason: 'outside_range', message: `You are about ${km} km away, beyond our usual ${rules.maxKm} km range. You can still order. If we cannot deliver to you, we will cancel and refund you in full.` };
  }
  return { ok: true, checked: true, outside: false, km, fee, reason: 'ok', message: '' };
}
