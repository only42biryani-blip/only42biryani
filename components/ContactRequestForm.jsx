'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const input = 'w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-accent';

// "Need us urgently?" form. We never print our phone number on the website: this asks for yours, and you see it in
// /admin -> Requests. After sending, the visitor lands on their own request page (our number may appear there once approved).
export default function ContactRequestForm() {
  const router = useRouter();
  const [v, setV] = useState({ name: '', phone: '', message: '', orderCode: '' });
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('order') || '';
    const t = setTimeout(() => { if (order) setV((x) => ({ ...x, orderCode: order.toUpperCase().slice(0, 12) })); }, 0);
    return () => clearTimeout(t);
  }, []);

  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/contact/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, website: trap }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not send your request.');
      router.push(`/contact/request/${d.code}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="hud-box p-6 md:p-8 grid gap-3 relative">
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] w-px h-px opacity-0" />
      <h2 className="font-grotesk text-xl font-bold text-[#F5F1E8]">Need us urgently?</h2>
      <p className="text-white/60 text-sm leading-relaxed -mt-1">
        Leave your name and mobile number. We will call or WhatsApp you as soon as we can. For an urgent matter we may also show you our phone number.
      </p>
      <input className={input} name="name" placeholder="Your name" value={v.name} onChange={set('name')} autoComplete="name" required />
      <input className={input} name="tel" placeholder="Your mobile number (10-digit)" value={v.phone} onChange={set('phone')} type="tel" inputMode="numeric" autoComplete="tel" required />
      <input className={input} name="order" placeholder="Order code (optional)" value={v.orderCode} onChange={set('orderCode')} maxLength={12} autoComplete="off" />
      <textarea className={input} name="message" rows={3} placeholder="What do you need? (optional)" value={v.message} onChange={set('message')} maxLength={300} />
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={busy || v.name.trim().length < 2 || v.phone.replace(/\D/g, '').length < 10}
        className="w-full py-4 rounded-full font-bold text-sm text-black tracking-wide bg-accent hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {busy ? 'Sending...' : 'Request a call back'}
      </button>
      <p className="text-[11px] text-white/45 leading-relaxed">We use your number only to reply to this request.</p>
    </form>
  );
}
