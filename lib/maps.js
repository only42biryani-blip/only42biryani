// A link that opens a customer's place in Google Maps: an exact pin if we have one, a Maps link they pasted,
// or a search for the address text.
export function mapsLink(o) {
  if (o.lat && o.lng) return `https://www.google.com/maps?q=${o.lat},${o.lng}`;
  const url = String(o.address || '').match(/https?:\/\/\S+/);
  if (url) return url[0];
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address || '')}`;
}
