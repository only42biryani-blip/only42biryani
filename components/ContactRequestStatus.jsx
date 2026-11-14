'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// The visitor's own request page. It checks every few seconds. Our phone number appears here only after we approve it.
export default function ContactRequestStatus({ code }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let stop = false;
    async function load() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/contact/request/${code}`, { cache: 'no-store' });
        if (res.status === 404) return !stop && setState({ missing: true });
        const d = await res.json();
        if (!stop && res.ok) setState(d);
      } catch {
        // Keep showing the last known state.
      }
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [code]);

  if (state.loading) return <div className="hud-box p-8 animate-pulse h-48" aria-busy="true" />;
  if (state.missing) {
    return (
      <div className="hud-box p-8">
        <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8] mb-2">Request not found</h2>
        <p className="text-white/60 text-sm">This link is not valid. You can send a new request from the contact page.</p>
        <Link href="/contact" className="inline-block mt-5 rounded-full bg-accent text-black font-bold text-sm px-7 py-4">Contact us</Link>
      </div>
    );
  }

  return (
    <div className="hud-box p-8 grid gap-4">
      <div>
        <div className="text-saffron text-xs font-semibold tracking-[3px] uppercase mb-1">Request {code}</div>
        <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8]">{state.status === 'done' ? 'This request is closed' : 'We got your request'}</h2>
      </div>
      {state.approved ? (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
          <p className="text-sm text-white/70 mb-3">You can call us now:</p>
          <a href={state.tel} className="block font-grotesk text-3xl font-extrabold text-accent">{state.phone}</a>
          <div className="flex flex-wrap gap-3 mt-4">
            <a href={state.tel} className="rounded-full bg-accent text-black font-bold text-sm px-6 py-3">Call us</a>
            <a href={state.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 text-white font-semibold text-sm px-6 py-3 hover:border-accent hover:text-accent">WhatsApp us</a>
          </div>
          <p className="text-[11px] text-white/45 mt-3">This number is shown for you only, for a limited time.</p>
        </div>
      ) : state.status === 'done' ? (
        <p className="text-white/60 text-sm">If you still need help, send a new request from the contact page.</p>
      ) : (
        <>
          <p className="text-white/70 text-sm leading-relaxed">
            Our team will call or WhatsApp you on the number you gave, as soon as we can. If your matter is urgent, keep this page open: our phone number appears here if we approve it.
          </p>
          <p className="text-xs text-white/40">Checking for updates automatically…</p>
        </>
      )}
      <Link href="/" className="text-accent text-xs font-mono tracking-widest uppercase hover:text-white">← Back to Only42Biryani</Link>
    </div>
  );
}
