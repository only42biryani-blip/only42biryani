'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const input =
  'w-full px-5 py-4 bg-black/40 text-[#F5F1E8] text-sm outline-none border border-white/15 focus:border-saffron focus:bg-saffron/5 transition-all placeholder:text-white/35 rounded-xl';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(s);
  });
}

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Order form: details -> delivery price -> pay. All prices are re-checked by the server before payment.
export default function OrderForm({ price, maxQty, remaining, hoursText, mode = 'online', offerPercent = 0, selfFee = 0 }) {
  const [v, setV] = useState({ name: '', phone: '', email: '', address: '', note: '', qty: 1 });
  const self = mode === 'self';
  const [fee, setFee] = useState(self ? selfFee : null);
  const [pin, setPin] = useState(null); // { lat, lng } from the phone's location
  const [locating, setLocating] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [trap, setTrap] = useState('');
  const router = useRouter();

  const set = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    if (k === 'address' && !self) setFee(null);
  };
  const qty = Math.min(Number(v.qty) || 1, maxQty);
  const net = Math.round(price * (1 - offerPercent / 100)); // price after the offer, as the server will charge it
  const total = fee === null ? null : qty * net + fee;
  const saved = qty * (price - net);
  const soldOut = remaining !== null && remaining <= 0;

  async function getQuote() {
    setError('');
    setQuoting(true);
    try {
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: v.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || 'Could not get the delivery price.');
      setFee(data.fee);
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setQuoting(false);
    }
  }

  function shareLocation() {
    setError('');
    if (!navigator.geolocation) return setError('Your browser cannot share location. Please type the address.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setError('Could not get your location. Allow location access, or just type the address.'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function placeSelfOrder() {
    setError('');
    setPaying(true);
    try {
      const res = await fetch('/api/order/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, qty, lat: pin?.lat, lng: pin?.lng, website: trap }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not place your order.');
      router.push(`/order/${d.code}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  async function pay(e) {
    e.preventDefault();
    if (self) return placeSelfOrder();
    if (fee === null) return getQuote();
    setError('');
    setPaying(true);
    try {
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, qty, lat: pin?.lat, lng: pin?.lng, website: trap }),
      });
      const o = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(o.error || 'Could not start your order.');
      if (o.fee !== fee) setFee(o.fee); // the server's price is the one that counts

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: o.keyId,
        amount: o.amountPaise,
        currency: 'INR',
        name: 'Only42Biryani',
        description: `${qty} × chicken dum biryani + delivery`,
        order_id: o.razorpayOrderId,
        prefill: { name: o.name, contact: o.phone, email: o.email || undefined },
        theme: { color: '#F2A93B' },
        handler: async (resp) => {
          try {
            const r = await fetch('/api/order/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: o.code, ...resp }),
            });
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              setError(d.error || 'We could not confirm the payment yet.');
            }
          } finally {
            router.push(`/order/${o.code}`);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setError('Payment not completed. Nothing was charged. Press the button to try again.');
          },
        },
      });
      rzp.on('payment.failed', () => setError('The payment failed. Try again or use another method.'));
      rzp.open();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  if (soldOut) {
    return (
      <div className="hud-box p-8 text-center">
        <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8] mb-2">Sold out for today</h2>
        <p className="text-white/60 text-sm">All 42 plates are gone. Join the waitlist to hear about the next drop.</p>
        <Link href="/#terminal" className="inline-block mt-5 rounded-full bg-accent text-black font-bold text-sm px-7 py-4">Join the waitlist</Link>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="hud-box p-6 md:p-8 flex flex-col gap-4 relative">
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1}
        autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] w-px h-px opacity-0" />

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-saffron text-xs font-semibold tracking-[3px] uppercase">Chicken dum biryani</div>
          <div className="font-grotesk text-3xl font-extrabold text-[#F5F1E8]">
            {offerPercent > 0 && <span className="text-xl text-white/40 line-through mr-2">{rupees(price)}</span>}
            {rupees(net)} <span className="text-base text-white/50 font-normal">per plate</span>
          </div>
          {offerPercent > 0 && <div className="inline-block mt-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-accent text-black">{offerPercent}% OFF</div>}
        </div>
        {remaining !== null && <div className="text-xs text-white/60">{remaining} left today</div>}
      </div>

      <label className="grid gap-1.5 text-xs text-white/60">
        Plates
        <select value={qty} onChange={set('qty')} className={input}>
          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <input className={input} placeholder="Your name" value={v.name} onChange={set('name')} autoComplete="name" required />
      <input className={input} placeholder="Mobile number (10-digit)" value={v.phone} onChange={set('phone')} type="tel" autoComplete="tel" required />
      <input className={input} placeholder="Email (optional)" value={v.email} onChange={set('email')} type="email" autoComplete="email" />
      <textarea className={input} rows={3} placeholder="Full delivery address: flat or house, street, area, Hyderabad" value={v.address} onChange={set('address')} autoComplete="street-address" required />
      <div className="flex flex-wrap items-center gap-3 -mt-2">
        <button type="button" onClick={shareLocation} disabled={locating}
          className="rounded-full border border-white/25 text-white text-xs font-semibold px-4 py-2 hover:border-saffron hover:text-saffron transition-all disabled:opacity-50">
          {locating ? 'Getting location...' : pin ? 'Update my location' : '📍 Use my current location'}
        </button>
        {pin && <span className="text-xs text-saffron">Location saved ✓ <button type="button" onClick={() => setPin(null)} className="underline text-white/50 ml-1">remove</button></span>}
        {!pin && <span className="text-[11px] text-white/40">Helps us find you faster (optional)</span>}
      </div>
      <input className={input} placeholder="Landmark or gate code (optional)" value={v.note} onChange={set('note')} maxLength={200} />

      {fee !== null ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm grid gap-1.5">
          <div className="flex justify-between text-white/70"><span>{qty} × biryani</span><span>{rupees(qty * price)}</span></div>
          {saved > 0 && <div className="flex justify-between text-saffron"><span>{offerPercent}% OFF offer</span><span>- {rupees(saved)}</span></div>}
          <div className="flex justify-between text-white/70"><span>Delivery</span><span>{fee === 0 ? 'Free' : rupees(fee)}</span></div>
          <div className="flex justify-between font-bold text-[#F5F1E8] border-t border-white/10 pt-2 mt-1"><span>Total</span><span>{rupees(total)}</span></div>
        </div>
      ) : (
        <p className="text-xs text-white/50">Enter your address, then check the delivery price.</p>
      )}

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={paying || quoting || v.address.trim().length < 10}
        className="w-full py-4 rounded-full font-bold text-sm text-black tracking-wide bg-accent hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {quoting ? 'Checking delivery...' : paying ? (self ? 'Placing order...' : 'Opening payment...') : fee === null ? 'Check delivery price' : self ? `Place order · ${rupees(total)}` : `Pay ${rupees(total)}`}
      </button>

      <p className="text-[11px] text-white/45 leading-relaxed">
        {self
          ? 'Pay cash or UPI when your order arrives. No advance payment needed.'
          : 'Pay securely online (UPI, card, netbanking). Your plates are held for 10 minutes while you pay.'}
        {hoursText ? ` Ordering hours (IST): ${hoursText}.` : ''}{' '}
        {self ? 'By placing your order you agree to our' : 'By paying you agree to our'} <Link href="/terms" className="underline">Terms</Link>,{' '}
        <Link href="/refund-policy" className="underline">Refund policy</Link> and{' '}
        <Link href="/delivery-policy" className="underline">Delivery policy</Link>.
      </p>
    </form>
  );
}
