'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import OrderForm from './OrderForm';

const Ctx = createContext({ ctx: null, token: '', failed: false });
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// The order page itself is static (opens instantly). This loads the live state (kitchen online, plates, payment
// choices, pre-booking days) from one fast cached request and lets the parts below show it.
export function OrderProvider({ children }) {
  const [state, setState] = useState({ ctx: null, token: '', failed: false });

  useEffect(() => {
    let stop = false;
    const token = new URLSearchParams(window.location.search).get('t') || '';
    async function load() {
      try {
        const res = await fetch(`/api/order/context${token ? `?t=${encodeURIComponent(token)}` : ''}`, { cache: token ? 'no-store' : 'default' });
        if (!res.ok) throw new Error();
        const ctx = await res.json();
        if (!stop) setState({ ctx, token, failed: false });
      } catch {
        if (!stop) setState((s) => ({ ...s, token, failed: !s.ctx }));
      }
    }
    load();
    return () => { stop = true; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

function Closed({ children }) {
  return (
    <div className="hud-box p-8 text-center">
      <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8] mb-2">{children}</h2>
      <p className="text-white/60 text-sm">You can already order on Zomato, or join the waitlist to hear about each drop.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/#terminal" className="rounded-full bg-accent text-black font-bold text-sm px-7 py-4">Join the waitlist</Link>
        <Link href="/" className="rounded-full border border-white/25 text-white font-semibold text-sm px-7 py-4 hover:border-saffron hover:text-saffron">Back to home</Link>
      </div>
    </div>
  );
}

// "Delivery and payment" card: the delivery charge text depends on your live settings.
export function DeliveryCard({ area }) {
  const { ctx } = useContext(Ctx);
  const maxFee = ctx?.rules?.maxFee;
  const delivery = !ctx ? 'Delivery charge is shown before you order.'
    : maxFee === null || maxFee === undefined
      ? (ctx.selfFee > 0 ? `${rupees(ctx.selfFee)} delivery` : 'Delivery charge is shown before you order.')
      : `Delivery from free up to ${rupees(maxFee)}, depending on distance. Never more than ${rupees(maxFee)}.`;
  const payText = !ctx ? 'cash or UPI when your order arrives' : `${ctx.cod ? 'cash or UPI when your order arrives' : 'online'}${ctx.canPayOnline && ctx.cod ? ', or pay online now' : ''}`;

  return (
    <div className="hud-box p-6 grid gap-3 text-sm">
      <h3 className="font-grotesk text-lg font-bold text-[#F5F1E8]">Delivery and payment</h3>
      <p className="text-white/70"><b className="text-white">Where:</b> Hyderabad. Our kitchen is {area}.</p>
      <p className="text-white/70"><b className="text-white">Delivery:</b> {delivery}</p>
      <p className="text-white/70"><b className="text-white">When:</b> {ctx?.hours ? `Ordering hours ${ctx.hours} (IST), while plates last.` : 'While the kitchen is online and plates last. When it is offline you can pre-book for another day.'}</p>
      <p className="text-white/70"><b className="text-white">Pay:</b> {payText}.</p>
      <p className="text-[11px] text-white/45">If we cannot deliver to you, we will tell you and refund any online payment in full. See our <Link href="/delivery-policy" className="underline">Delivery policy</Link> and <Link href="/refund-policy" className="underline">Refund policy</Link>.</p>
    </div>
  );
}

// The right-hand side: the order form, or why ordering is closed, or a pre-booking form.
export function OrderSection() {
  const { ctx, token, failed } = useContext(Ctx);

  if (failed) return <Closed>Could not load the order form. Please refresh.</Closed>;
  if (!ctx) {
    return (
      <div className="hud-box p-8 animate-pulse grid gap-4" aria-busy="true" aria-label="Loading the order form">
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="h-14 rounded-xl bg-white/10" />
        <div className="h-14 rounded-xl bg-white/10" />
        <div className="h-14 rounded-xl bg-white/10" />
        <div className="h-24 rounded-xl bg-white/10" />
        <div className="h-14 rounded-full bg-white/10" />
      </div>
    );
  }
  if (ctx.blocker) return <Closed>Online ordering opens soon</Closed>;
  if (ctx.prebook) {
    return (
      <OrderForm price={ctx.price} maxQty={ctx.maxQty} remaining={null} hoursText={ctx.hours}
        cod online={false} testToken="" prebook={ctx.prebook} reason={ctx.reason}
        offerPercent={ctx.offerPercent} selfFee={ctx.selfFee} initialRules={ctx.rules} />
    );
  }
  if (!ctx.online) return <Closed>The kitchen is offline right now</Closed>;
  if (!ctx.open) return <Closed>We are closed right now{ctx.hours ? ` (hours ${ctx.hours} IST)` : ''}</Closed>;
  if (!ctx.cod && !ctx.canPayOnline) return <Closed>Ordering is paused for now</Closed>;
  return (
    <OrderForm price={ctx.price} maxQty={ctx.maxQty} remaining={ctx.remaining} hoursText={ctx.hours}
      cod={ctx.cod} online={ctx.canPayOnline} testToken={ctx.testMode ? token : ''}
      offerPercent={ctx.offerPercent} selfFee={ctx.selfFee} initialRules={ctx.rules} />
  );
}
