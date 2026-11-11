// Small shared helpers for public API routes: same-site check and a best-effort per-IP rate limit
// (in memory, so it resets when the serverless instance recycles; it only slows down casual abuse).
const buckets = new Map();

export function sameSite(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

export function rateLimited(name, ip, max, windowMs) {
  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
  return false;
}

export const bad = (message, status = 400) => Response.json({ error: message }, { status });
