import { requireAdmin } from '@/lib/adminAuth';
import { telegramConfigured, sendTelegram } from '@/lib/telegram';

// Admin only. GET: are the Telegram keys set? POST: send a test message to your phone.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return Response.json({ configured: telegramConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!telegramConfigured()) return Response.json({ ok: false, error: 'Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel, then redeploy.' }, { status: 409 });
  const r = await sendTelegram('✅ Only42Biryani alerts work. You will get a message here for every new order and every waitlist signup.');
  return Response.json(r.ok ? { ok: true } : { ok: false, error: `Telegram said: ${r.error}. Check the chat ID, and press Start in the bot chat first.` }, { status: r.ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } });
}
