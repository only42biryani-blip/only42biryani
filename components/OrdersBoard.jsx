'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapsLink } from '@/lib/maps';

const ACTIVE = ['new', 'confirmed', 'paid', 'preparing', 'ready', 'dispatched', 'paid_needs_refund'];

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
  } catch {
    // Sound is only a convenience.
  }
}

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const isCod = (o) => o.payment_mode === 'cod';

async function copy(text, addToast, what = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    addToast?.(what, 'success');
  } catch {
    window.prompt('Copy this:', text);
  }
}

const EMPTY = { name: '', phone: '', address: '', qty: 1, note: '', discountPercent: '', deliveryFee: '' };
const field = 'w-full px-3 py-2 bg-black/40 text-white text-xs outline-none border border-white/15 focus:border-accent rounded-lg placeholder:text-white/30';

// Kitchen order board (admin only; every call is checked on the server against the Google admin login).
export default function OrdersBoard({ addToast }) {
  const [orders, setOrders] = useState(null);
  const [borzoOn, setBorzoOn] = useState(false);
  const [maxKm, setMaxKm] = useState(null);
  const [setup, setSetup] = useState(false);
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const seen = useRef(null);
  const soundRef = useRef(false);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token || '', []);

  const load = useCallback(async () => {
    const t = await token();
    if (!t) return;
    try {
      const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSetup(Boolean(data.setup));
        setOrders([]);
        return;
      }
      setSetup(false);
      setBorzoOn(Boolean(data.borzo));
      setMaxKm(data.maxKm ?? null);
      const ids = new Set(data.orders.filter((o) => ['new', 'paid'].includes(o.status)).map((o) => o.code));
      if (seen.current && soundRef.current && [...ids].some((c) => !seen.current.has(c))) beep();
      seen.current = ids;
      setOrders(data.orders);
    } catch {
      // Keep showing the last list.
    }
  }, [token]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  async function act(o, action, extra = {}) {
    setBusy(`${o.code}:${action}`);
    try {
      const res = await fetch(`/api/admin/orders/${o.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) addToast?.(data.error || 'Action failed', 'error');
      else addToast?.(data.note ? `Done. ${data.note}` : 'Done', 'success');
      await load();
      return res.ok;
    } finally {
      setBusy('');
    }
  }

  // Confirm the order, then open its bill ready to print. The tab is opened first so the browser does not block it.
  // Shows Borzo's price first; books the rider only after you agree.
  async function sendWithBorzo(o) {
    setBusy(`${o.code}:borzo`);
    try {
      const res = await fetch(`/api/admin/orders/${o.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ action: 'borzo_quote' }),
      });
      const q = await res.json().catch(() => ({}));
      if (!res.ok) return addToast?.(q.error || 'Could not get the Borzo price', 'error');
      const cod = isCod(o) ? '\n\nBorzo does not collect cash for you. Ask the customer to pay you by UPI.' : '';
      const text = `Borzo will charge you about ${money(q.price)} to deliver order ${o.code}.\nThe customer pays you ${money(o.delivery_fee || 0)} for delivery.${cod}\n\nBook the Borzo rider now?`;
      if (!window.confirm(text)) return;
    } finally {
      setBusy('');
    }
    await act(o, 'dispatch');
  }

  function outWithSomeone(o) {
    const by = window.prompt('Who is delivering this order? (a name, or Rapido / Porter / friend)');
    if (by === null) return;
    if (!by.trim()) return addToast?.('Type a name so it is recorded.', 'error');
    act(o, 'out', { by: by.trim() });
  }

  async function confirmAndPrint(o) {
    const w = window.open('', '_blank');
    const ok = await act(o, 'confirm');
    if (w) {
      if (ok) w.location.href = `/admin/bill?code=${o.code}&print=1`;
      else w.close();
    }
  }

  async function createManual(e) {
    e.preventDefault();
    setBusy('manual');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return addToast?.(data.error || 'Could not save the order', 'error');
      addToast?.(`Order ${data.code} saved · ${money(data.total)}`, 'success');
      setDraft(EMPTY);
      setShowNew(false);
      await load();
    } finally {
      setBusy('');
    }
  }

  function cancel(o) {
    const refundText = o.razorpay_payment_id ? ` and refund ${money(o.total)}` : '';
    if (!window.confirm(`Cancel order ${o.code}${refundText}? This cannot be undone.`)) return;
    const restore = window.confirm('Put the plate(s) back in stock?\n\nOK = yes (food was NOT cooked for this order)\nCancel = no');
    act(o, 'cancel', { restore });
  }

  const list = (orders || []).filter((o) => ACTIVE.includes(o.status));
  const done = (orders || []).filter((o) => !ACTIVE.includes(o.status)).slice(0, 10);

  function copyList() {
    const text = list
      .filter((o) => ['new', 'confirmed', 'paid', 'preparing', 'ready', 'dispatched'].includes(o.status))
      .map((o, i) => [
        `${i + 1}) ${o.customer_name} - ${o.customer_phone.replace(/^91/, '')}`,
        `   ${o.address}`,
        `   Map: ${mapsLink(o)}`,
        `   ${o.qty} plate${o.qty > 1 ? 's' : ''} · ${isCod(o) ? `COLLECT ${money(o.total)} (cash/UPI)` : 'PAID online'}${o.note ? ` · Note: ${o.note}` : ''}`,
      ].join('\n'))
      .join('\n\n');
    if (!text) return addToast?.('No open orders to copy', 'error');
    copy(text, addToast, 'Delivery list copied');
  }

  const Btn = ({ o, action, children, primary, extra }) => (
    <button
      onClick={() => act(o, action, extra)}
      disabled={Boolean(busy)}
      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50 ${
        primary ? 'bg-accent text-black border-accent hover:bg-white' : 'border-white/15 text-neutral-300 hover:bg-white/5'
      }`}
    >
      {busy === `${o.code}:${action}` ? '...' : children}
    </button>
  );

  const small = 'px-2.5 py-1 text-[11px] rounded-md border border-white/15 text-neutral-300 hover:bg-white/5';

  return (
    <div className="border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-grotesk text-lg font-bold">Direct orders</h3>
        <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
          <input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); if (e.target.checked) beep(); }} />
          Sound on new order
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setShowNew((v) => !v)} className="px-3 py-2 text-xs font-bold rounded-lg bg-accent text-black hover:bg-white">
          {showNew ? 'Close' : '+ New order (WhatsApp / phone)'}
        </button>
        <button onClick={copyList} className="px-3 py-2 text-xs font-bold rounded-lg border border-white/15 text-neutral-300 hover:bg-white/5">
          Copy delivery list
        </button>
      </div>

      {showNew && (
        <form onSubmit={createManual} className="grid gap-2 mb-4 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-[11px] text-neutral-500">For orders that came on WhatsApp or a call. Paste the address or the Google Maps link they sent.</p>
          <input className={field} placeholder="Customer name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <input className={field} placeholder="Mobile number (10-digit)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} type="tel" required />
          <textarea className={field} rows={3} placeholder="Address or Google Maps link (paste what they sent)" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} required />
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-[10px] text-neutral-500">Plates
              <select className={field} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[10px] text-neutral-500">Offer % (blank = usual)
              <input className={field} inputMode="numeric" value={draft.discountPercent} onChange={(e) => setDraft({ ...draft, discountPercent: e.target.value })} placeholder="auto" />
            </label>
            <label className="grid gap-1 text-[10px] text-neutral-500">Delivery ₹ (blank = usual)
              <input className={field} inputMode="numeric" value={draft.deliveryFee} onChange={(e) => setDraft({ ...draft, deliveryFee: e.target.value })} placeholder="auto" />
            </label>
          </div>
          <input className={field} placeholder="Note (landmark, flat number...) optional" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <button type="submit" disabled={busy === 'manual'} className="px-3 py-2 text-xs font-bold rounded-lg bg-accent text-black hover:bg-white disabled:opacity-50">
            {busy === 'manual' ? 'Saving...' : 'Save order'}
          </button>
        </form>
      )}

      {setup && (
        <p className="text-xs text-neutral-400 leading-relaxed">
          Direct ordering is not set up yet. Run <code className="text-accent">supabase-orders-setup.sql</code> and{' '}
          <code className="text-accent">supabase-selfdelivery-setup.sql</code> in Supabase and add
          <code className="text-accent"> SUPABASE_SERVICE_ROLE_KEY</code> in Vercel.
        </p>
      )}
      {!setup && orders === null && <p className="text-xs text-neutral-500">Loading...</p>}
      {!setup && orders !== null && list.length === 0 && <p className="text-xs text-neutral-500">No open orders right now.</p>}

      <div className="grid gap-3">
        {list.map((o) => (
          <div key={o.code} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{o.code} · {o.qty} plate{o.qty > 1 ? 's' : ''} · {money(o.total)}</div>
                <div className="text-[11px] text-neutral-500">
                  {new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {o.label}
                  {o.source === 'manual' ? ' · typed in' : ''}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {['new', 'paid'].includes(o.status) && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-accent text-black">NEW</span>}
                {o.scheduled_for && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-saffron text-black">PRE-BOOKED · {new Date(`${o.scheduled_for}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>}
                {o.source === 'test' && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400 text-black">TEST ORDER</span>}
                {maxKm !== null && Number(o.distance_km) > maxKm && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-600 text-white">TOO FAR · {Number(o.distance_km)} km</span>}
              </div>
            </div>

            <div className={`mt-2 text-xs font-bold ${isCod(o) ? 'text-amber-300' : 'text-green-400'}`}>
              {isCod(o) ? `Collect ${money(o.total)} on delivery (cash or UPI)` : 'Paid online'}
              {Number(o.discount_amount) > 0 && <span className="font-normal text-neutral-400"> · {Number(o.discount_percent)}% off saved {money(o.discount_amount)}</span>}
            </div>

            <dl className="mt-2 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-neutral-500">Name</dt><dd>{o.customer_name}</dd>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="flex flex-wrap gap-x-3">
                <a href={`tel:+${o.customer_phone}`} className="hover:text-accent">+{o.customer_phone}</a>
                <a href={`https://wa.me/${o.customer_phone}`} target="_blank" rel="noopener noreferrer" className="text-green-400">WhatsApp</a>
              </dd>
              <dt className="text-neutral-500">Address</dt><dd className="break-words whitespace-pre-wrap">{o.address}</dd>
              {o.note && (<><dt className="text-neutral-500">Note</dt><dd className="break-words">{o.note}</dd></>)}
              {o.distance_km !== null && o.distance_km !== undefined
                ? (<><dt className="text-neutral-500">Distance</dt><dd>~{Number(o.distance_km)} km from the kitchen</dd></>)
                : (<><dt className="text-neutral-500">Distance</dt><dd className="text-amber-300">not checked{o.lat ? '' : ' (no location shared)'}: look at the map</dd></>)}
              {o.delivered_by && (<><dt className="text-neutral-500">Delivery</dt><dd>{o.delivered_by}</dd></>)}
              {o.borzo_order_id && (<><dt className="text-neutral-500">Rider</dt><dd>Borzo #{o.borzo_order_id} · {o.borzo_status || 'booked'}{o.courier_name ? ` · ${o.courier_name}` : ''}</dd></>)}
            </dl>

            <div className="flex flex-wrap gap-2 mt-2">
              <button className={small} onClick={() => copy(`${o.customer_name} - ${o.customer_phone.replace(/^91/, '')}\n${o.address}\n${mapsLink(o)}`, addToast, 'Address copied')}>Copy address</button>
              <a className={small} href={mapsLink(o)} target="_blank" rel="noopener noreferrer">Open in Maps</a>
              <a className={small} href={`/admin/bill?code=${o.code}`} target="_blank" rel="noopener noreferrer">Print bill</a>
              {isCod(o) && <a className={small} href={`/admin/bill?code=${o.code}&edit=1`} target="_blank" rel="noopener noreferrer">Edit bill</a>}
              {maxKm !== null && Number(o.distance_km) > maxKm && !['delivered', 'cancelled', 'refunded'].includes(o.status) && (
                <a className={`${small} border-red-500/40 text-red-300`} target="_blank" rel="noopener noreferrer"
                  href={`https://wa.me/${o.customer_phone}?text=${encodeURIComponent(`Hello ${o.customer_name}, sorry, your address for Only42Biryani order ${o.code} is about ${Number(o.distance_km)} km away, which is outside our delivery range. ${isCod(o) ? 'We have to cancel this order.' : 'We will cancel it and refund your full payment.'} Sorry for the trouble.`)}`}>
                  WhatsApp: too far
                </a>
              )}
              {o.status === 'confirmed' && (
                <a className={small} target="_blank" rel="noopener noreferrer"
                  href={`https://wa.me/${o.customer_phone}?text=${encodeURIComponent(`Hello ${o.customer_name}, your Only42Biryani order ${o.code} is confirmed${o.scheduled_for ? ` for ${new Date(`${o.scheduled_for}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}` : ''}. ${o.qty} plate${o.qty > 1 ? 's' : ''}, total ${money(o.total)}${isCod(o) ? '. Please keep cash or UPI ready.' : '.'} We will deliver soon. Thank you!`)}`}>
                  WhatsApp: confirmed
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {['new', 'paid'].includes(o.status) && (
                <>
                  <Btn o={o} action="confirm" primary>Confirm order</Btn>
                  <button onClick={() => confirmAndPrint(o)} disabled={Boolean(busy)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-white text-black border border-white hover:bg-accent disabled:opacity-50">
                    Confirm + print bill
                  </button>
                </>
              )}
              {['new', 'paid', 'confirmed'].includes(o.status) && <Btn o={o} action="preparing">Start cooking</Btn>}
              {isCod(o) ? (
                <>
                  {['confirmed', 'preparing', 'ready'].includes(o.status) && <Btn o={o} action="out" primary>Out for delivery (me)</Btn>}
                  {['confirmed', 'preparing'].includes(o.status) && (
                    <button onClick={() => outWithSomeone(o)} disabled={Boolean(busy)} className="px-3 py-2 text-xs font-bold rounded-lg border border-white/15 text-neutral-300 hover:bg-white/5 disabled:opacity-50">Someone else delivers</button>
                  )}
                  {borzoOn && !o.borzo_order_id && ['confirmed', 'preparing'].includes(o.status) && (
                    <button onClick={() => sendWithBorzo(o)} disabled={Boolean(busy)} className="px-3 py-2 text-xs font-bold rounded-lg border border-saffron/40 text-saffron hover:bg-saffron/10 disabled:opacity-50">Send with Borzo</button>
                  )}
                  {['confirmed', 'preparing', 'ready', 'dispatched'].includes(o.status) && (
                    <>
                      <Btn o={o} action="delivered" extra={{ paid_by: 'cash' }}>Delivered · got cash</Btn>
                      <Btn o={o} action="delivered" extra={{ paid_by: 'upi' }}>Delivered · got UPI</Btn>
                    </>
                  )}
                </>
              ) : (
                <>
                  {['paid', 'confirmed', 'preparing'].includes(o.status) && <Btn o={o} action="dispatch" primary>Food ready: book rider</Btn>}
                  {['paid', 'confirmed', 'preparing'].includes(o.status) && <Btn o={o} action="out">I deliver it myself</Btn>}
                  {['ready', 'dispatched'].includes(o.status) && <Btn o={o} action="delivered">Mark delivered</Btn>}
                </>
              )}
              {o.status !== 'paid_needs_refund' && (
                <button onClick={() => cancel(o)} disabled={Boolean(busy)}
                  className="px-3 py-2 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                  {isCod(o) ? 'Cancel order' : 'Cancel + refund'}
                </button>
              )}
              {o.status === 'paid_needs_refund' && <span className="text-xs text-red-400">Refund this payment in the Razorpay dashboard.</span>}
            </div>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <details className="mt-4 text-xs text-neutral-500">
          <summary className="cursor-pointer">Recently closed ({done.length})</summary>
          <ul className="mt-2 grid gap-1">
            {done.map((o) => (
              <li key={o.code}>
                {o.code} · {o.customer_name} · {money(o.total)} · {o.label}
                {o.paid_by ? ` (${o.paid_by})` : ''} ·{' '}
                <a className="underline" href={`/admin/bill?code=${o.code}`} target="_blank" rel="noopener noreferrer">bill</a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
