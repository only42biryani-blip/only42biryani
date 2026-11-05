'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ShareFollow from './ShareFollow';

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
  const [values, setValues] = useState({ name: '', phone: '', email: '' });
  const [trap, setTrap] = useState('');
  const [consent, setConsent] = useState(false);
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
        body: JSON.stringify({ ...values, consent, source, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setLiveCount((c) => (c > 0 ? c + 1 : c));
      setShowModal(true);
      setValues({ name: '', phone: '', email: '' });
      setConsent(false);
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
        <div className="inline-flex items-center gap-2 mb-8 border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono tracking-widest text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#D4FF3F]" />
          <span><strong className="text-accent">{liveCount}</strong> PEOPLE ON THE WAITLIST</span>
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
            className="w-full px-5 py-4 bg-black text-accent font-mono text-xs tracking-widest outline-none border border-white/10
              focus:border-accent focus:bg-accent/5 focus:shadow-[0_0_15px_rgba(212,255,63,0.15)]
              transition-all placeholder:text-white/30 rounded-none"
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

        <label className="flex items-start gap-3 text-left text-xs text-white/60 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-0.5 accent-[#D4FF3F]"
          />
          <span>
            I agree to receive launch updates and offers from Only42Biryani on WhatsApp, SMS and email. I can opt out at any time.{' '}
            <Link href="/privacy" className="underline hover:text-accent" target="_blank">Privacy policy</Link>
          </span>
        </label>

        {error && <p role="alert" className="text-red-500 text-xs font-mono mt-[-8px] text-left">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 font-mono font-bold text-xs text-black tracking-widest uppercase mt-2
            bg-accent border border-accent transition-all duration-300
            hover:bg-accent/80 hover:shadow-[0_0_30px_rgba(212,255,63,0.3)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? 'SAVING...' : 'JOIN THE WAITLIST'}
        </button>
      </form>

      {/* Success popup: turn every signup into shares and follows */}
      {showModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all"
          onClick={() => setShowModal(false)}
        >
          <div
            className="hud-box p-8 sm:p-12 max-w-md w-[90%] text-center shadow-[0_0_50px_rgba(212,255,63,0.1)] animate-modal-appear"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 border border-accent bg-accent/10 text-accent flex items-center justify-center
              text-2xl font-mono mx-auto mb-6 shadow-[0_0_20px_rgba(212,255,63,0.2)]">
              ✓
            </div>
            <h3 className="font-grotesk text-2xl tracking-widest uppercase mb-3 text-white">YOU&apos;RE ON THE LIST</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              We&apos;ll message you the moment the day&apos;s 42 plates go live. Know someone who loves real Hyderabadi biryani? Bring them in.
            </p>
            <ShareFollow className="justify-center mb-6" />
            <button
              onClick={() => setShowModal(false)}
              className="text-white/50 font-mono text-xs tracking-widest uppercase hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
