'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  ['paid', 'Order received'],
  ['confirmed', 'Order confirmed'],
  ['preparing', 'Being prepared'],
  ['ready', 'Packed'],
  ['dispatched', 'Out for delivery'],
  ['delivered', 'Delivered'],
];

// Live order status. Refreshes every 8 seconds while the page is open.
export default function OrderTracker({ code }) {
  const [o, setO] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    async function load() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/order/${code}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!stop) { setO(data); setError(''); }
      } catch {
        if (!stop) setError('Could not load your order. Check the code and try again.');
      }
    }
    load();
    const id = setInterval(load, 8000);
    document.addEventListener('visibilitychange', load);
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', load); };
  }, [code]);

  if (error && !o) return <p className="text-red-400 text-sm">{error}</p>;
  if (!o) return <p className="text-white/60 text-sm">Loading your order...</p>;

  const idx = STEPS.findIndex(([s]) => s === (o.status === 'new' ? 'paid' : o.status));
  const closed = ['cancelled', 'refunded', 'expired', 'paid_needs_refund'].includes(o.status);

  return (
    <div className="hud-box p-6 md:p-8">
      <div className="text-saffron text-xs font-semibold tracking-[3px] uppercase mb-1">Order {o.code}</div>
      <h2 className="font-grotesk text-3xl font-extrabold text-[#F5F1E8] mb-1">
        {o.firstName ? `Thanks, ${o.firstName}!` : 'Thanks!'}
      </h2>
      <p className="text-white/60 text-sm mb-6">
        {o.qty} × chicken dum biryani · ₹{Number(o.total).toLocaleString('en-IN')} · {o.label}
      </p>

      {closed ? (
        <p className="text-white/70 text-sm">
          {o.status === 'refunded' || o.status === 'paid_needs_refund'
            ? 'Your payment is being refunded to the original payment method. It usually takes 5 to 7 working days.'
            : o.status === 'expired'
            ? 'The payment was not completed, so nothing was charged. You can place a new order.'
            : 'This order was cancelled.'}
        </p>
      ) : (
        <ol className="grid gap-3">
          {STEPS.map(([s, label], i) => (
            <li key={s} className={`flex items-center gap-3 text-sm ${i <= idx ? 'text-[#F5F1E8]' : 'text-white/35'}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${i <= idx ? 'border-saffron bg-saffron/20 text-saffron' : 'border-white/20'}`}>
                {i <= idx ? '✓' : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {!closed && o.trackingUrl && (
        <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer"
          className="inline-block mt-6 rounded-full bg-accent text-black font-bold text-sm px-6 py-3">Track your rider</a>
      )}
      {!closed && o.courierName && (
        <p className="text-white/60 text-sm mt-4">
          Your rider: {o.courierName}
          {o.courierPhone && <> · <a href={`tel:+${o.courierPhone.replace(/^\+/, '')}`} className="underline">call</a></>}
        </p>
      )}
      {!closed && o.paymentMode === 'cod' && o.status !== 'delivered' && (
        <p className="text-sm text-saffron mt-5">
          Please keep ₹{Number(o.total).toLocaleString('en-IN')} ready. Pay in cash or UPI when your order arrives.
        </p>
      )}
      <p className="text-[11px] text-white/40 mt-6">Keep this page or your order code ({o.code}). It updates by itself.</p>
    </div>
  );
}
