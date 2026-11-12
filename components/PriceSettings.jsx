'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const btn = 'px-4 py-2.5 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';
const field = 'w-28 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent';
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const MAX_PRICE = 5000;
const MAX_OFFER = 90;

// The plate price and the offer. Saved in the database and used at once by the order page, the home page, the
// order form and every new order (the server works out every amount). Orders already placed keep their own amounts.
export default function PriceSettings({ addToast }) {
  const [saved, setSaved] = useState(null); // { price, offer } as customers see them now
  const [form, setForm] = useState({ price: '', offer: '' });
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // Settings first (does the price SQL exist?), then the live price customers see (admin value, or the default).
    const probe = await supabase.from('settings').select('plate_price, offer_percent').eq('id', 1).maybeSingle();
    if (probe.error || !probe.data) return setMissing(true);
    setMissing(false);
    try {
      const res = await fetch('/api/order/context', { cache: 'no-store' });
      const ctx = await res.json();
      const price = Number(probe.data.plate_price) > 0 ? Number(probe.data.plate_price) : ctx.price;
      const offer = probe.data.offer_percent === null ? ctx.offerPercent : Number(probe.data.offer_percent);
      setSaved({ price, offer });
      setForm({ price: String(price ?? ''), offer: String(offer ?? 0) });
    } catch {
      setSaved({ price: Number(probe.data.plate_price) || null, offer: Number(probe.data.offer_percent) || 0 });
      setForm({ price: String(probe.data.plate_price ?? ''), offer: String(probe.data.offer_percent ?? 0) });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const price = Number(form.price);
  const offer = Number(form.offer);
  const priceOk = Number.isInteger(price) && price >= 1 && price <= MAX_PRICE;
  const offerOk = form.offer !== '' && Number.isInteger(offer) && offer >= 0 && offer <= MAX_OFFER;
  const net = priceOk && offerOk ? Math.round(price * (1 - offer / 100)) : null;
  const dirty = saved && (price !== saved.price || offer !== saved.offer);

  async function save(next) {
    const p = next?.price ?? price;
    const o = next?.offer ?? offer;
    if (!(Number.isInteger(p) && p >= 1 && p <= MAX_PRICE) || !(Number.isInteger(o) && o >= 0 && o <= MAX_OFFER)) {
      return addToast?.(`Enter a price from ₹1 to ₹${MAX_PRICE} and an offer from 0 to ${MAX_OFFER} (whole numbers).`, 'error');
    }
    const after = Math.round(p * (1 - o / 100));
    const text = `Customers will pay ${rupees(after)} per plate${o > 0 ? ` (${rupees(p)} minus ${o}% OFF)` : ''}. Orders already placed keep their old amounts. Save?`;
    if (!window.confirm(text)) return;
    setBusy(true);
    const { data, error } = await supabase.from('settings').update({ plate_price: p, offer_percent: o }).eq('id', 1).select('plate_price, offer_percent');
    setBusy(false);
    if (error || !data || data.length === 0) return addToast?.('Could not save. Run supabase-price-setup.sql in Supabase first.', 'error');
    setSaved({ price: Number(data[0].plate_price), offer: Number(data[0].offer_percent) });
    setForm({ price: String(data[0].plate_price), offer: String(data[0].offer_percent) });
    addToast?.(`Saved: ${rupees(after)} per plate${o > 0 ? ` with ${o}% OFF` : ''}.`, 'success');
  }

  if (missing) {
    return (
      <div className="border border-amber-400/30 bg-amber-400/5 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">Price and offer</h3>
        <p className="text-xs text-neutral-300 leading-relaxed">Not set up yet. Run <code className="text-accent">supabase-price-setup.sql</code> in Supabase, then reload. Until then the price comes from Vercel / the website settings.</p>
      </div>
    );
  }
  if (!saved) return null;

  return (
    <div className="border border-white/10 rounded-2xl p-5 grid gap-4">
      <h3 className="font-grotesk text-lg font-bold">Price and offer</h3>
      <p className="text-xs text-neutral-400 leading-relaxed -mt-2">
        The full price of one plate and the discount shown to customers. Changes apply to the whole website straight away and to every new order.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-xs text-neutral-400">Full price per plate (₹)
          <input inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d]/g, '') }))} className={field} placeholder="400" />
        </label>
        <label className="grid gap-1 text-xs text-neutral-400">Offer (% off, 0 = no offer)
          <input inputMode="numeric" value={form.offer} onChange={(e) => setForm((f) => ({ ...f, offer: e.target.value.replace(/[^\d]/g, '') }))} className={field} placeholder="50" />
        </label>
        <button onClick={() => save()} disabled={busy || !dirty || net === null} className={btn}>{busy ? 'Saving...' : 'Save price and offer'}</button>
        {saved.offer > 0 && <button onClick={() => save({ offer: 0 })} disabled={busy} className={btn}>Switch offer off</button>}
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm">
        {net === null ? (
          <span className="text-amber-300">Enter a price (₹1 to ₹{MAX_PRICE}) and an offer (0 to {MAX_OFFER}).</span>
        ) : (
          <>
            Customers will pay <b className="text-accent">{rupees(net)}</b> per plate
            {offer > 0 && <> <span className="text-neutral-500 line-through">{rupees(price)}</span> <span className="text-neutral-400">({offer}% OFF)</span></>}.
            {dirty && <span className="block text-xs text-amber-300 mt-1">Not saved yet.</span>}
          </>
        )}
      </div>
    </div>
  );
}
