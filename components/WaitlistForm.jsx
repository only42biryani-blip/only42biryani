'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ShareFollow from './ShareFollow';
import { useStatus } from './StatusProvider';

function animateCount(target, setter) {
  const steps = 40;
  const increment = Math.max(1, Math.ceil(target / steps));
  let current = 0;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    setter(current);
  }, 30);
}

const fields = [
  { key: 'name', type: 'text', placeholder: 'Your name', id: 'waitlistName', autoComplete: 'name' },
  { key: 'phone', type: 'tel', placeholder: 'WhatsApp number (10-digit)', id: 'waitlistPhone', autoComplete: 'tel' },
  { key: 'email', type: 'email', placeholder: 'Email address', id: 'waitlistEmail', autoComplete: 'email' },
];

export default function WaitlistForm() {
  const { launched } = useStatus();
  const [values, setValues] = useState({ name: '', phone: '', email: '' });
  const [trap, setTrap] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/waitlist')
      .then((r) => r.json())
      .then(({ count }) => {
        if (!cancelled && count) animateCount(count, setLiveCount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Remember which link brought them here (e.g. ?utm_source=instagram).
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || params.get('ref') || '';

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, source, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setLiveCount((c) => (c > 0 ? c + 1 : c));
      setShowModal(true);
      setValues({ name: '', phone: '', email: '' });
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Real signup count, shown only once it is a meaningful number */}
      {liveCount >= 10 && (
        <div className="inline-flex items-center gap-2 mb-8 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs tracking-wide text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span><strong className="text-saffron">{liveCount}</strong> {launched ? 'people get our drop alerts' : 'people on the waitlist'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-[420px] mx-auto w-full relative z-10">
        {fields.map(({ key, type, placeholder, id, autoComplete }) => (
          <input
            key={id}
            id={id}
            type={type}
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required
            className="w-full px-5 py-4 bg-black/40 text-[#F5F1E8] text-sm outline-none border border-white/15
              focus:border-saffron focus:bg-saffron/5
              transition-all placeholder:text-white/35 rounded-xl"
          />
        ))}

        {/* Honeypot: invisible to people, tempting to bots */}
        <input
          type="text"
          name="website"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] w-px h-px opacity-0"
        />

        <p className="text-left text-xs text-white/60 leading-relaxed">
          By joining, you agree to get drop alerts and updates from Only42Biryani on WhatsApp, SMS and email.
          Reply STOP any time to opt out.{' '}
          <Link href="/privacy" className="underline hover:text-accent" target="_blank" rel="noopener noreferrer">Privacy policy</Link>
        </p>

        {error && <p role="alert" className="text-red-400 text-sm mt-[-8px] text-left">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full font-bold text-sm text-black tracking-wide mt-2
            bg-accent transition-all duration-300
            hover:bg-white hover:shadow-[0_8px_30px_rgba(212,255,63,0.25)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? 'Saving...' : 'Join the waitlist'}
        </button>
      </form>

      {/* Success popup: turn every signup into shares and follows */}
      {showModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all"
          onClick={() => setShowModal(false)}
        >
          <div
            className="hud-box p-8 sm:p-12 max-w-md w-[90%] text-center shadow-[0_0_60px_rgba(242,169,59,0.12)] animate-modal-appear"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full border border-saffron/50 bg-saffron/10 text-saffron flex items-center justify-center
              text-2xl mx-auto mb-6">
              ✓
            </div>
            <h3 className="font-grotesk font-extrabold text-3xl tracking-tight mb-3 text-[#F5F1E8]">You&apos;re on the list</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              {launched
                ? 'We will message you on WhatsApp when a day’s plates go live. This is not an order, so no plate is reserved yet.'
                : 'We’ll message you the moment the day’s 42 plates go live.'}
            </p>
            {launched && (
              <Link href="/order" className="inline-block mb-5 rounded-full bg-accent text-black font-bold text-sm px-6 py-3 hover:bg-white transition-colors">
                Want a plate for sure? Order or pre-book
              </Link>
            )}
            <p className="text-white/50 text-xs mb-5">Know someone who loves real Hyderabadi biryani? Bring them in.</p>
            <ShareFollow className="justify-center mb-6" />
            <button
              onClick={() => setShowModal(false)}
              className="text-white/55 text-sm hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
