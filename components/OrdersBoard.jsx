'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ACTIVE = ['paid', 'preparing', 'ready', 'dispatched', 'paid_needs_refund'];

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

// Kitchen order board (admin only; every call is checked on the server against the Google admin login).
export default function OrdersBoard({ addToast }) {
  const [orders, setOrders] = useState(null);
  const [setup, setSetup] = useState(false);
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState('');
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
      const ids = new Set(data.orders.filter((o) => o.status === 'paid').map((o) => o.code));
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
    } finally {
      setBusy('');
    }
  }

  function cancel(o) {
    if (!window.confirm(`Cancel order ${o.code} and refund ₹${o.total}? This cannot be undone.`)) return;
    const restore = window.confirm('Put the plate(s) back in stock?\n\nOK = yes (food was NOT cooked for this order)\nCancel = no');
    act(o, 'cancel', { restore });
  }

  const list = (orders || []).filter((o) => ACTIVE.includes(o.status));
  const done = (orders || []).filter((o) => !ACTIVE.includes(o.status)).slice(0, 10);

  const Btn = ({ o, action, children, primary }) => (
    <button
      onClick={() => act(o, action)}
      disabled={Boolean(busy)}
      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50 ${
        primary ? 'bg-accent text-black border-accent hover:bg-white' : 'border-white/15 text-neutral-300 hover:bg-white/5'
      }`}
    >
      {busy === `${o.code}:${action}` ? '...' : children}
    </button>
  );

  return (
    <div className="border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-grotesk text-lg font-bold">Direct orders</h3>
        <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
          <input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); if (e.target.checked) beep(); }} />
          Sound on new order
        </label>
      </div>

      {setup && (
        <p className="text-xs text-neutral-400 leading-relaxed">
          Direct ordering is not set up yet. Run <code className="text-accent">supabase-orders-setup.sql</code> in Supabase and add
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
                <div className="font-bold">{o.code} · {o.qty} plate{o.qty > 1 ? 's' : ''} · ₹{o.total}</div>
                <div className="text-[11px] text-neutral-500">
                  {new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {o.label}
                </div>
              </div>
              {o.status === 'paid' && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-accent text-black">NEW</span>}
            </div>

            <dl className="mt-2 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-neutral-500">Name</dt><dd>{o.customer_name}</dd>
              <dt className="text-neutral-500">Phone</dt><dd><a href={`tel:+${o.customer_phone}`} className="hover:text-accent">+{o.customer_phone}</a></dd>
              <dt className="text-neutral-500">Address</dt><dd className="break-words">{o.address}</dd>
              {o.note && (<><dt className="text-neutral-500">Note</dt><dd className="break-words">{o.note}</dd></>)}
              {o.borzo_order_id && (<><dt className="text-neutral-500">Rider</dt><dd>Borzo #{o.borzo_order_id} · {o.borzo_status || 'booked'}{o.courier_name ? ` · ${o.courier_name}` : ''}</dd></>)}
            </dl>

            <div className="flex flex-wrap gap-2 mt-3">
              {o.status === 'paid' && <Btn o={o} action="preparing">Start cooking</Btn>}
              {['paid', 'preparing'].includes(o.status) && <Btn o={o} action="dispatch" primary>Food ready: book rider</Btn>}
              {['ready', 'dispatched'].includes(o.status) && <Btn o={o} action="delivered">Mark delivered</Btn>}
              {o.status !== 'paid_needs_refund' && (
                <button onClick={() => cancel(o)} disabled={Boolean(busy)}
                  className="px-3 py-2 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50">Cancel + refund</button>
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
            {done.map((o) => (<li key={o.code}>{o.code} · {o.customer_name} · ₹{o.total} · {o.label}</li>))}
          </ul>
        </details>
      )}
    </div>
  );
}
