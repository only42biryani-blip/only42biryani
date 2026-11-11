import { supabase } from '@/lib/supabase';
import ReviewCards from './ReviewCards';
import ReviewForm from './ReviewForm';

// Reviews section for the home page. Shows only reviews you approved in /admin. If the database is not set up
// yet, or you switched reviews off, or there is nothing to show, the whole section simply does not appear.
export default async function Reviews() {
  let show = false;
  let accept = false;
  let reviews = [];
  try {
    const signal = AbortSignal.timeout(4000);
    const [s, r] = await Promise.all([
      supabase.from('settings').select('show_reviews, accept_reviews').eq('id', 1).abortSignal(signal).maybeSingle(),
      supabase.from('reviews').select('id, name, rating, comment, created_at').eq('status', 'approved')
        .order('created_at', { ascending: false }).limit(60).abortSignal(signal),
    ]);
    if (s.error || !s.data || r.error) return null;
    show = s.data.show_reviews !== false;
    accept = s.data.accept_reviews === true;
    reviews = r.data || [];
  } catch {
    return null;
  }
  if (!show || (reviews.length === 0 && !accept)) return null;

  const count = reviews.length;
  const average = count ? reviews.reduce((n, x) => n + x.rating, 0) / count : 0;

  return (
    <section id="reviews" className="pt-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight">What customers say</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-saffron/50 to-transparent" />
      </div>
      <ReviewCards reviews={reviews.slice(0, 9)} average={average} count={count} />
      {accept && (
        <div className={count ? 'mt-8' : ''}>
          {count === 0 && <p className="text-white/60 text-sm mb-4">Be the first to tell others how your biryani was.</p>}
          <ReviewForm />
        </div>
      )}
    </section>
  );
}
