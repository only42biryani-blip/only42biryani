'use client';

import { useState } from 'react';

const input =
  'w-full px-5 py-4 bg-black/40 text-[#F5F1E8] text-sm outline-none border border-white/15 focus:border-saffron focus:bg-saffron/5 transition-all placeholder:text-white/35 rounded-xl';

// "Write a review" form. The review is saved as pending and only appears after the owner approves it.
export default function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [trap, setTrap] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please choose a star rating.');
    setState('sending');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, comment, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return setState('idle');
      }
      setState('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="hud-box p-6 text-center">
        <div className="text-saffron text-2xl mb-2">★</div>
        <h3 className="font-grotesk text-xl font-extrabold text-[#F5F1E8] mb-1">Thank you!</h3>
        <p className="text-white/60 text-sm">Your review will appear on the website after we approve it.</p>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="hud-box p-6 flex flex-col gap-4 relative max-w-[520px]">
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1}
        autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] w-px h-px opacity-0" />
      <h3 className="font-grotesk text-xl font-extrabold text-[#F5F1E8]">Write a review</h3>

      <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            className={`text-3xl leading-none transition-colors ${n <= shown ? 'text-saffron' : 'text-white/20'}`}>
            ★
          </button>
        ))}
      </div>

      <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" required />
      <textarea className={input} rows={4} placeholder="How was your biryani?" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} required />

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={state === 'sending'}
        className="w-full py-4 rounded-full font-bold text-sm text-black tracking-wide bg-accent hover:bg-white transition-all disabled:opacity-50">
        {state === 'sending' ? 'Sending...' : 'Send review'}
      </button>
      <p className="text-[11px] text-white/40">Reviews are checked before they appear. Please do not include links or phone numbers.</p>
    </form>
  );
}
