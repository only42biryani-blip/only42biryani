'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { feeFor, rulesFromRow, hasKitchenPin } from '@/lib/delivery';
import { mapsLink } from '@/lib/maps';

const COLS = 'kitchen_lat, kitchen_lng, max_km, free_km, base_fee, per_km_fee, require_pin';
const field = 'w-28 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent';
const btn = 'px-4 py-2.5 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';

// Delivery range and charges. Everything here is editable and saved to the database (admin login only).
export default function DeliverySettings({ addToast }) {
  const [form, setForm] = useState(null); // strings for the inputs
  const [kitchen, setKitchen] = useState({ lat: null, lng: null });
  const [saved, setSaved] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select(COLS).eq('id', 1).maybeSingle();
    if (error || !data) return setMissing(true);
    const r = rulesFromRow(data);
    setMissing(false);
    setSaved(r);
    setKitchen({ lat: r.kitchenLat, lng: r.kitchenLng });
    setForm({ maxKm: String(r.maxKm), freeKm: String(r.freeKm), baseFee: String(r.baseFee), perKmFee: String(r.perKmFee), requirePin: r.requirePin });
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const edit = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pinKitchenHere() {
    if (!navigator.geolocation) return addToast?.('This browser cannot share location.', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setKitchen({ lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        addToast?.('Could not get the location. Allow location access and try again.', 'error');
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  }

  const nums = form && {
    maxKm: Number(form.maxKm), freeKm: Number(form.freeKm), baseFee: Number(form.baseFee), perKmFee: Number(form.perKmFee),
  };
  const valid = nums && Object.values(nums).every((n) => Number.isFinite(n) && n >= 0) && nums.maxKm >= 0.5 && nums.maxKm <= 100;
  const dirty = form && saved && (
    nums.maxKm !== saved.maxKm || nums.freeKm !== saved.freeKm || nums.baseFee !== saved.baseFee || nums.perKmFee !== saved.perKmFee ||
    form.requirePin !== saved.requirePin || kitchen.lat !== saved.kitchenLat || kitchen.lng !== saved.kitchenLng
  );

  async function save() {
    if (!valid) return addToast?.('Check the numbers: distances 0.5 to 100 km, charges 0 or more.', 'error');
    setBusy(true);
    const { data, error } = await supabase.from('settings').update({
      kitchen_lat: kitchen.lat, kitchen_lng: kitchen.lng, max_km: nums.maxKm, free_km: nums.freeKm,
      base_fee: nums.baseFee, per_km_fee: nums.perKmFee, require_pin: form.requirePin,
    }).eq('id', 1).select(COLS);
    setBusy(false);
    if (error || !data || data.length === 0) return addToast?.('Could not save. Run supabase-delivery-setup.sql in Supabase first.', 'error');
    const r = rulesFromRow(data[0]);
    setSaved(r);
    addToast?.('Delivery settings saved. New orders use them straight away.', 'success');
  }

  if (missing) {
    return (
      <div className="border border-amber-400/30 bg-amber-400/5 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">Delivery range and charges</h3>
        <p className="text-xs text-neutral-300 leading-relaxed">Not set up yet. Run <code className="text-accent">supabase-delivery-setup.sql</code> in Supabase, then reload.</p>
      </div>
    );
  }
  if (!form) return <p className="text-xs text-neutral-500">Loading...</p>;

  const rules = { kitchenLat: kitchen.lat, kitchenLng: kitchen.lng, maxKm: nums.maxKm, freeKm: nums.freeKm, baseFee: nums.baseFee, perKmFee: nums.perKmFee, requirePin: form.requirePin };
  const steps = [];
  if (valid) {
    const max = Math.min(Math.ceil(nums.maxKm), 30);
    for (let km = 1; km <= max; km++) steps.push([km, feeFor(km, rules)]);
  }

  return (
    <div className="grid gap-5">
      <div className="border border-white/10 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">1. Where is your kitchen?</h3>
        <p className="text-xs text-neutral-400 leading-relaxed mb-3">
          Stand at the kitchen and press the button. Distances to customers are measured from this point. Without it, no distance check happens and any address can order.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={pinKitchenHere} disabled={locating} className={btn}>{locating ? 'Getting location...' : '📍 Use my current location as the kitchen'}</button>
          {hasKitchenPin(rulesFromRow({ kitchen_lat: kitchen.lat, kitchen_lng: kitchen.lng })) ? (
            <span className="text-xs text-green-400">
              Kitchen pin set ✓ <a className="underline" href={mapsLink({ lat: kitchen.lat, lng: kitchen.lng })} target="_blank" rel="noopener noreferrer">check on map</a>
            </span>
          ) : <span className="text-xs text-amber-300">Not set yet, so there is no range check</span>}
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">2. How far do you deliver?</h3>
        <p className="text-xs text-neutral-400 leading-relaxed mb-3">
          Customers farther than this are told on the order page <b>before</b> they order, so nobody pays and then gets refused. Change it any time (for example 5 km now, 15 km later).
        </p>
        <label className="grid gap-1 text-xs text-neutral-400 w-fit">Deliver up to (km)
          <input className={field} inputMode="decimal" value={form.maxKm} onChange={edit('maxKm')} />
        </label>
        <p className="text-[11px] text-neutral-500 mt-2">Distance is the approximate road distance (straight line × 1.3), measured from the customer&apos;s shared live location.</p>
      </div>

      <div className="border border-white/10 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">3. What do customers pay for delivery?</h3>
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="grid gap-1 text-xs text-neutral-400">Base charge ₹
            <input className={field} inputMode="decimal" value={form.baseFee} onChange={edit('baseFee')} />
          </label>
          <label className="grid gap-1 text-xs text-neutral-400">…for the first (km)
            <input className={field} inputMode="decimal" value={form.freeKm} onChange={edit('freeKm')} />
          </label>
          <label className="grid gap-1 text-xs text-neutral-400">Then ₹ per extra km
            <input className={field} inputMode="decimal" value={form.perKmFee} onChange={edit('perKmFee')} />
          </label>
        </div>
        <p className="text-xs text-neutral-400 mb-2">Base charge 0 means delivery is free for the first {nums.freeKm || 0} km.</p>
        {steps.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            {steps.map(([km, fee]) => (
              <span key={km} className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10">{km} km: {fee === 0 ? 'free' : `₹${fee}`}</span>
            ))}
          </div>
        )}
      </div>

      <div className="border border-white/10 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">4. Live location</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.requirePin} onChange={(e) => setForm((f) => ({ ...f, requirePin: e.target.checked }))} className="mt-1 h-5 w-5 accent-[#D4FF3F]" />
          <span className="text-sm">
            <b>Customers must share their live location</b>
            <span className="block text-xs text-neutral-400 leading-relaxed">
              Recommended. It is the only way to measure the distance for sure. If you switch it off, customers can order without it and you must check each address yourself (the order shows &quot;distance not checked&quot;).
            </span>
          </span>
        </label>
      </div>

      <button onClick={save} disabled={busy || !valid || !dirty}
        className={`py-3.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${dirty ? 'bg-accent text-black hover:bg-white' : 'border border-white/10 text-white'}`}>
        {busy ? 'Saving...' : dirty ? 'Save delivery settings (unsaved changes)' : 'Saved'}
      </button>

      <div className="border border-white/10 rounded-2xl p-5 text-xs text-neutral-400 leading-relaxed">
        <h3 className="font-grotesk text-lg font-bold text-white mb-1">Who delivers each order?</h3>
        You decide for every order on the <b className="text-white">Orders</b> tab:
        <ul className="list-disc pl-5 mt-2 grid gap-1">
          <li><b className="text-white">Out for delivery</b>: you or your own staff deliver.</li>
          <li><b className="text-white">Send with Borzo</b>: shows Borzo&apos;s price first, then books a rider. Use it when you are busy. Borzo charges you; the customer still pays your delivery charge above.</li>
          <li><b className="text-white">Someone else</b>: type the name (for example a friend, Rapido, Porter) so it is recorded.</li>
        </ul>
        <p className="mt-2">Borzo does not collect cash for you, so for Borzo orders ask the customer to pay by UPI to you.</p>
      </div>
    </div>
  );
}
