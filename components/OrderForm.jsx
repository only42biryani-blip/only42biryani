'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mapsLink } from '@/lib/maps';

const SAVED_KEY = 'only42-saved-address';

// Details remembered on THIS phone only (never sent anywhere except with an order).
function readSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    return s && typeof s.address === 'string' && s.address.trim().length >= 10 ? s : null;
  } catch {
    return null;
  }
}
function writeSaved(data) {
  try {
    if (data) localStorage.setItem(SAVED_KEY, JSON.stringify(data));
    else localStorage.removeItem(SAVED_KEY);
  } catch {
    // Storage blocked: the order still works, we just cannot remember it.
  }
}

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

function StepHead({ n, title, note }) {
  return (
    <div className="flex items-center gap-3 mt-2 first:mt-0">
      <span className="w-7 h-7 shrink-0 rounded-full bg-accent text-black text-sm font-extrabold flex items-center justify-center">{n}</span>
      <h2 className="font-grotesk text-lg font-bold text-[#F5F1E8]">{title}</h2>
      {note && <span className="ml-auto text-xs text-saffron">{note}</span>}
    </div>
  );
}

// Order form: details -> delivery price -> pay. All prices are re-checked by the server before payment.
export default function OrderForm({ price, maxQty, remaining, hoursText, cod = true, online = false, testToken = '', offerPercent = 0, selfFee = 0, prebook = null, reason = '', initialRules = null }) {
  const [v, setV] = useState({ name: '', phone: '', email: '', address: '', note: '', qty: 1 });
  const [method, setMethod] = useState(cod ? 'cod' : 'online'); // how the customer pays
  const self = method === 'cod'; // cash / UPI on delivery
  // Delivery charge: worked out by the server. The order page hands us the first answer so the form is ready at once.
  const [fee, setFee] = useState(initialRules ? initialRules.defaultFee ?? selfFee : null);
  const [date, setDate] = useState(prebook ? prebook[0].value : ''); // pre-booking: tomorrow by default
  const dateLabel = prebook ? (prebook.find((d) => d.value === date)?.label || '').replace('Tomorrow · ', 'tomorrow, ').replace('Today · ', 'today, ') : '';
  const [pin, setPin] = useState(null); // { lat, lng } from the phone's location
  const [locating, setLocating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [trap, setTrap] = useState('');
  const [savedAddr, setSavedAddr] = useState(null); // address remembered on this phone
  const [remember, setRemember] = useState(true);
  const [rules, setRules] = useState(initialRules); // { configured, maxKm, requirePin } from your Delivery settings
  const [range, setRange] = useState(null); // result of the distance check for the shared location
  const router = useRouter();

  // Delivery range and charge, from your settings: checked as soon as a live location is shared.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        if (!pin && initialRules) { // nothing to ask the server yet: use the answer we already have
          setRange(null);
          setFee(initialRules.defaultFee ?? selfFee);
          return;
        }
        const res = await fetch('/api/delivery/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pin ? { lat: pin.lat, lng: pin.lng } : {}),
        });
        const d = await res.json().catch(() => null);
        if (cancelled || !res.ok || !d) return;
        setRules({ configured: d.configured, maxKm: d.maxKm, requirePin: d.requirePin, limitRange: d.limitRange, defaultFee: d.defaultFee, maxFee: d.maxFee });
        if (pin) {
          setRange(d);
          if (d.ok && d.fee !== null && d.fee !== undefined) setFee(d.fee);
        } else {
          setRange(null);
          setFee(d.defaultFee ?? selfFee);
        }
      } catch {
        setFee((f) => (f === null ? selfFee : f)); // the server works out the real charge when the order is placed
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pin, selfFee, initialRules]);

  useEffect(() => {
    const t = setTimeout(() => setSavedAddr(readSaved()), 0);
    return () => clearTimeout(t);
  }, []);

  function applySaved() {
    if (!savedAddr) return;
    const a = savedAddr;
    setV((x) => ({ ...x, name: a.name || x.name, phone: a.phone || x.phone, email: a.email || x.email, address: a.address, note: a.note || '' }));
    if (a.lat && a.lng) setPin({ lat: a.lat, lng: a.lng });
    setSavedAddr(null);
  }

  function forgetSaved() {
    writeSaved(null);
    setSavedAddr(null);
  }

  // Called after an order is placed or payment started, so next time it is one tap.
  function rememberDetails() {
    if (!remember) return;
    writeSaved({ name: v.name, phone: v.phone, email: v.email, address: v.address, note: v.note, lat: pin?.lat, lng: pin?.lng });
  }

  const set = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
  };
  const qty = Math.min(Number(v.qty) || 1, maxQty);
  const net = Math.round(price * (1 - offerPercent / 100)); // price after the offer, as the server will charge it
  const total = fee === null ? null : qty * net + fee;
  const saved = qty * (price - net);
  const soldOut = !prebook && remaining !== null && remaining <= 0;
  const needLocation = Boolean(rules?.configured && rules.requirePin && !pin);

  function shareLocation() {
    setError('');
    // The live location IS the delivery place (distance and charge come from it), so make sure the
    // customer is really there: ordering for another address must be typed instead.
    if (!pin && !window.confirm('Are you at the delivery address right now?\n\nOK = yes, deliver to where I am now.\nCancel = no, I will type the delivery address.')) return;
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
        body: JSON.stringify({ ...v, qty, lat: pin?.lat, lng: pin?.lng, website: trap, scheduledFor: prebook ? date : undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not place your order.');
      rememberDetails();
      router.push(`/order/${d.code}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  async function pay(e) {
    e.preventDefault();
    if (self) return placeSelfOrder();
    setError('');
    setPaying(true);
    try {
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, qty, lat: pin?.lat, lng: pin?.lng, website: trap, t: testToken }),
      });
      const o = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(o.error || 'Could not start your order.');
      if (o.fee !== fee) setFee(o.fee); // the server's price is the one that counts
      rememberDetails();

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

      {prebook && (
        <div role="status" className="rounded-xl border border-saffron/50 bg-saffron/10 p-4 text-sm">
          <div className="font-bold text-saffron">
            {reason === 'soldout' ? 'Today is sold out' : reason === 'closed' ? 'We are closed right now' : 'The kitchen is offline right now'}: pre-book for the next day
          </div>
          <p className="text-white/70 text-xs mt-1 leading-relaxed">Pick a day below. We will confirm your booking and deliver it fresh that day. Pay cash or UPI on delivery.</p>
        </div>
      )}
      <StepHead n={1} title="Your order" note={!prebook && remaining !== null ? `${remaining} plates left today` : ''} />
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#F5F1E8]">Hyderabadi chicken dum biryani</div>
          <div className="text-[11px] text-white/50">One plate, one person</div>
        </div>
        <div className="text-right">
          {offerPercent > 0 && <div className="text-xs text-white/40 line-through">{rupees(price)}</div>}
          <div className="font-grotesk text-xl font-extrabold text-[#F5F1E8]">{rupees(net)}</div>
          {offerPercent > 0 && <div className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-black">{offerPercent}% OFF</div>}
        </div>
      </div>

      {prebook && (
        <fieldset className="grid gap-2">
          <legend className="text-xs text-white/60 mb-1">Which day?</legend>
          <div className="flex flex-wrap gap-2">
            {prebook.map((d) => (
              <button type="button" key={d.value} onClick={() => setDate(d.value)} aria-pressed={date === d.value} disabled={d.left === 0}
                className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${date === d.value ? 'bg-accent text-black border-accent' : 'border-white/25 text-white/80 hover:border-saffron'}`}>
                {d.label}
                <span className="block text-[10px] font-normal opacity-70">{d.left === 0 ? 'fully booked' : `${d.left} of 42 left`}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="grid gap-1.5 text-xs text-white/60">
        Plates
        <select value={qty} onChange={set('qty')} className={input}>
          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <StepHead n={2} title="Delivery details" />
      {savedAddr && (
        <div className="rounded-xl border border-saffron/40 bg-saffron/5 p-4 text-sm">
          <div className="text-[11px] tracking-[2px] uppercase text-saffron font-semibold mb-1">Saved on this phone</div>
          <div className="text-[#F5F1E8] font-semibold">{savedAddr.name}{savedAddr.phone ? ` · ${savedAddr.phone}` : ''}</div>
          <div className="text-white/70 text-xs mt-1 leading-relaxed">{savedAddr.address}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={applySaved} className="rounded-full bg-accent text-black text-xs font-bold px-5 py-2.5">Use this address</button>
            <button type="button" onClick={forgetSaved} className="rounded-full border border-white/25 text-white/80 text-xs font-semibold px-4 py-2.5 hover:border-saffron">Type a new one</button>
          </div>
        </div>
      )}

      <input className={input} name="name" placeholder="Your name" value={v.name} onChange={set('name')} autoComplete="name" required />
      <input className={input} name="tel" placeholder="Mobile number (10-digit)" value={v.phone} onChange={set('phone')} type="tel" inputMode="numeric" autoComplete="tel" required />
      <input className={input} name="email" placeholder="Email (optional)" value={v.email} onChange={set('email')} type="email" autoComplete="email" />

      <button type="button" onClick={shareLocation} disabled={locating}
        className="rounded-xl border border-saffron/50 bg-saffron/10 text-saffron text-sm font-bold px-4 py-3.5 hover:bg-saffron/20 transition-all disabled:opacity-50">
        {locating ? 'Getting your location...' : pin ? '📍 Update my live location' : "📍 I'm at the delivery place – use my location"}
      </button>
      {rules?.configured && rules.limitRange && (
        <p className="text-[11px] text-white/50 -mt-2">
          Our usual delivery range is {rules.maxKm} km{rules.requirePin ? '. Please share your live location (at the delivery place) so we can check the distance and delivery charge.' : '.'}
        </p>
      )}
      {range?.outside && <p role="alert" className="text-sm text-amber-300 -mt-1">{range.message}{range.fee !== null && range.fee !== undefined ? ` Delivery for your distance: ${rupees(range.fee)}.` : ''}</p>}
      {range?.ok && !range.outside && range.km !== null && range.km !== undefined && (
        <p className="text-xs text-green-400 -mt-1">About {range.km} km away. We deliver to you ✓{range.fee !== null && range.fee !== undefined ? ` · delivery ${range.fee === 0 ? 'free' : rupees(range.fee)}` : ''}</p>
      )}
      {pin && (
        <p className="text-xs text-saffron -mt-2">
          Delivering to where you are now ✓{' '}
          <a href={mapsLink(pin)} target="_blank" rel="noopener noreferrer" className="underline">check on map</a>
          <button type="button" onClick={() => setPin(null)} className="underline text-white/50 ml-2">remove</button>
          <span className="block text-white/50 mt-1">Now just type your flat or house number and street below. Ordering for a different address? Tap remove and type that address.</span>
        </p>
      )}

      <textarea className={input} name="street-address" rows={3} value={v.address} onChange={set('address')} autoComplete="street-address" required
        placeholder={pin ? 'Flat / house number, building, street, area' : 'Full address: flat or house, street, area, Hyderabad (tap here: your phone may suggest a saved address)'} />
      <input className={input} name="landmark" placeholder="Landmark or gate code (optional)" value={v.note} onChange={set('note')} maxLength={200} autoComplete="off" />

      <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#D4FF3F]" />
        Remember my details on this phone for next time
      </label>

      <StepHead n={3} title="Payment and confirm" />
      {cod && online && (
        <fieldset className="grid gap-2">
          <legend className="text-xs text-white/60 mb-1">How do you want to pay?</legend>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${method === 'cod' ? 'border-saffron bg-saffron/10' : 'border-white/15'}`}>
            <input type="radio" name="method" checked={method === 'cod'} onChange={() => setMethod('cod')} className="mt-1 accent-[#D4FF3F]" />
            <span className="text-sm text-[#F5F1E8]">Cash or UPI on delivery<span className="block text-[11px] text-white/50">Pay when your order arrives. No advance payment.</span></span>
          </label>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${method === 'online' ? 'border-saffron bg-saffron/10' : 'border-white/15'}`}>
            <input type="radio" name="method" checked={method === 'online'} onChange={() => setMethod('online')} className="mt-1 accent-[#D4FF3F]" />
            <span className="text-sm text-[#F5F1E8]">Pay online now<span className="block text-[11px] text-white/50">UPI, card or netbanking. Your plates are held for 10 minutes while you pay.</span></span>
          </label>
        </fieldset>
      )}
      {testToken && method === 'online' && (
        <p className="text-xs rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-200 p-3">TEST MODE: only you see this. Use Razorpay test details (card 4111 1111 1111 1111, UPI success@razorpay). No real money moves.</p>
      )}

      {fee !== null ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm grid gap-1.5">
          <div className="flex justify-between text-white/70"><span>{qty} × biryani</span><span>{rupees(qty * price)}</span></div>
          {saved > 0 && <div className="flex justify-between text-saffron"><span>{offerPercent}% OFF offer</span><span>- {rupees(saved)}</span></div>}
          <div className="flex justify-between text-white/70">
            <span>{pin && range?.km !== null && range?.km !== undefined ? `Delivery (about ${range.km} km)` : rules?.configured && rules?.maxFee !== null && rules?.maxFee !== undefined ? 'Delivery (maximum)' : 'Delivery'}</span>
            <span>{fee === 0 ? 'Free' : rupees(fee)}</span>
          </div>
          {!pin && rules?.configured && fee > 0 && <div className="text-[11px] text-saffron">Share your live location above to get the exact charge for your distance. It can be less.</div>}
          <div className="flex justify-between font-bold text-[#F5F1E8] border-t border-white/10 pt-2 mt-1"><span>Total</span><span>{rupees(total)}</span></div>
        </div>
      ) : (
        <p className="text-xs text-white/50">Working out your delivery charge...</p>
      )}

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={paying || fee === null || v.address.trim().length < 10 || needLocation}
        className="w-full py-4 rounded-full font-bold text-sm text-black tracking-wide bg-accent hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {total === null ? 'Working out delivery...' : paying ? (self ? 'Placing order...' : 'Opening payment...') : prebook ? `Pre-book for ${dateLabel} · ${rupees(total)}` : self ? `Place order · ${rupees(total)}` : `Pay ${rupees(total)}`}
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
