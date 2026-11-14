// Delivery range and charges. Pure functions (safe on the server and in the browser); the numbers come from
// the settings you edit in /admin -> Delivery.

// maxFee = the most a customer ever pays for delivery (null = no cap). limitRange = flag orders beyond maxKm as TOO FAR.
export const DEFAULT_RULES = { kitchenLat: null, kitchenLng: null, maxKm: 5, freeKm: 2, baseFee: 0, perKmFee: 10, requirePin: true, maxFee: 40, limitRange: false, cityOnly: true, cityRadiusKm: 35 };

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
    // Column missing (SQL not run yet) = the default cap of 40. A saved empty value = no cap.
    maxFee: r.max_fee === undefined ? DEFAULT_RULES.maxFee : r.max_fee === null ? null : Math.max(0, num(r.max_fee, DEFAULT_RULES.maxFee)),
    limitRange: r.range_limit === true,
    // We deliver only inside Hyderabad (on unless you switch it off). Column missing (SQL not run) = on.
    cityOnly: r.city_only !== false,
    cityRadiusKm: Math.min(100, Math.max(10, num(r.city_radius_km, DEFAULT_RULES.cityRadiusKm))),
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
  return capFee(Math.round(rules.baseFee + extra * rules.perKmFee), rules);
}

// Never more than your maximum delivery charge (for example Rs 40 from anywhere).
export function capFee(fee, rules) {
  return rules.maxFee === null || rules.maxFee === undefined ? fee : Math.min(fee, rules.maxFee);
}

export const hasKitchenPin = (rules) => Number.isFinite(rules.kitchenLat) && Number.isFinite(rules.kitchenLng) && rules.kitchenLat !== null && rules.kitchenLng !== null;

// ---- Hyderabad only -------------------------------------------------------------------------------------------
// The city centre and a radius around it (default 35 km: covers the whole city, Secunderabad, Cyberabad, the airport,
// Medchal, Patancheru and Ghatkesar). A shared live location is checked against it; a typed address is checked for a
// pincode outside Hyderabad (500xxx to 502xxx) or another city's name.
export const CITY = { name: 'Hyderabad', lat: 17.385, lng: 78.4867 };
const OTHER_CITIES = /\b(mumbai|pune|bengaluru|bangalore|chennai|delhi|noida|gurgaon|gurugram|kolkata|ahmedabad|jaipur|lucknow|vijayawada|visakhapatnam|vizag|warangal|karimnagar|nizamabad|khammam|tirupati|guntur|nellore|kurnool|mysore|mysuru|kochi|coimbatore|nagpur|indore|bhopal|surat|vadodara|chandigarh|patna|ranchi|bhubaneswar|sangareddy|siddipet|nalgonda|mahbubnagar|mahabubnagar|vikarabad|bhongir|shadnagar|medak)\b/i;
const OUR_CITY = /\b(hyderabad|secunderabad|cyberabad|hyd)\b/i;
const SORRY = 'Sorry, we deliver only inside Hyderabad.';

// { ok, reason, message, km }. pin = { lat, lng } or null; address = the typed address (may be empty).
export function cityCheck(rules, { pin = null, address = '' } = {}) {
  if (rules && rules.cityOnly === false) return { ok: true, reason: 'ok', message: '', km: null };
  const radius = Number(rules?.cityRadiusKm) > 0 ? Number(rules.cityRadiusKm) : DEFAULT_RULES.cityRadiusKm;
  const hasPin = pin && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));
  if (hasPin) {
    const km = Math.round(haversineKm(CITY, { lat: Number(pin.lat), lng: Number(pin.lng) }));
    if (km > radius) return { ok: false, reason: 'outside_city', km, message: `${SORRY} Your shared location is about ${km} km from the city centre, outside our delivery area.` };
    return { ok: true, reason: 'ok', message: '', km };
  }
  const text = String(address || '');
  const pincode = /(?:^|[^\d])(\d{6})(?!\d)/.exec(text)?.[1];
  if (pincode && !/^50[012]/.test(pincode)) {
    return { ok: false, reason: 'outside_city', km: null, message: `${SORRY} The pincode ${pincode} is outside our delivery area (Hyderabad pincodes start with 500, 501 or 502). Please check it.` };
  }
  const other = OTHER_CITIES.exec(text)?.[1];
  if (other && !OUR_CITY.test(text)) {
    const name = other.charAt(0).toUpperCase() + other.slice(1).toLowerCase();
    return { ok: false, reason: 'outside_city', km: null, message: `${SORRY} This address mentions ${name}. If it is in Hyderabad, please add "Hyderabad" to the address.` };
  }
  return { ok: true, reason: 'ok', message: '', km: null };
}

// Works out distance and delivery charge for a place. pin = { lat, lng } or null.
// Returns { ok, checked, outside, km, fee, reason, message }. ok is false only when a live location is required but missing. fee is null when it cannot be worked out (use your default).
export function checkDelivery(rules, pin, address = '') {
  const city = cityCheck(rules, { pin, address });
  if (!city.ok) return { ok: false, checked: false, km: null, fee: null, reason: 'outside_city', message: city.message };
  if (!hasKitchenPin(rules)) return { ok: true, checked: false, km: null, fee: null, reason: 'not_configured', message: '' };
  const hasPin = pin && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));
  if (!hasPin) {
    if (rules.requirePin && rules.limitRange) { // a location is only required when the range limit is on
      return { ok: false, checked: false, km: null, fee: null, reason: 'need_location', message: `Please share your live location so we can work out the distance and the delivery charge.` };
    }
    return { ok: true, checked: false, km: null, fee: capFee(rules.maxFee ?? rules.baseFee, rules), reason: 'unchecked', message: '' };
  }
  const km = roadKm(rules, { lat: Number(pin.lat), lng: Number(pin.lng) });
  const fee = feeFor(km, rules);
  // Beyond the usual range we still ACCEPT the order (no hard limit). It is flagged "outside" so you can decide:
  // deliver anyway, or cancel it and refund in full.
  if (rules.limitRange && km > rules.maxKm) {
    return { ok: true, checked: true, outside: true, km, fee, reason: 'outside_range', message: `You are about ${km} km away, beyond our usual ${rules.maxKm} km range. You can still order. If we cannot deliver to you, we will cancel and refund you in full.` };
  }
  return { ok: true, checked: true, outside: false, km, fee, reason: 'ok', message: '' };
}
