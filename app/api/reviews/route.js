import { supabase } from '@/lib/supabase';
import { sameSite, clientIp, rateLimited, bad } from '@/lib/apiGuard';

// A visitor sends a review. It is saved as "pending": nobody sees it on the website until you approve it in /admin.
export async function POST(request) {
  if (!sameSite(request)) return bad('Forbidden', 403);
  if (rateLimited('review', clientIp(request), 3, 30 * 60 * 1000)) {
    return bad('You have sent a few reviews already. Please try again later.', 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }
  if (body.website) return Response.json({ ok: true }); // hidden field only bots fill in: pretend it worked

  // Is the owner accepting reviews right now? (switch in /admin)
  const { data: s, error: sErr } = await supabase.from('settings').select('accept_reviews').eq('id', 1).maybeSingle();
  if (sErr || !s) return bad('Reviews are not open yet.', 503);
  if (!s.accept_reviews) return bad('Reviews are not open yet.', 403);

  const name = String(body.name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  const comment = String(body.comment || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 600);
  const rating = Number(body.rating);

  if (name.length < 2) return bad('Please enter your name.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad('Please choose a rating from 1 to 5 stars.');
  if (comment.length < 5) return bad('Please write a few words about your order.');
  if (/https?:\/\/|www\./i.test(comment) || /https?:\/\/|www\./i.test(name)) return bad('Please do not include links in a review.');

  const { error } = await supabase.from('reviews').insert([{ name, rating, comment }]);
  if (error) return bad('We could not save your review right now. Please try again.', 502);
  return Response.json({ ok: true });
}
