'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function Tile({ label, value, sub, tone }) {
  const color = tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-red-400' : tone === 'good' ? 'text-accent' : 'text-white';
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      <div className="text-[10px] tracking-[2px] uppercase text-neutral-500">{label}</div>
      <div className={`font-grotesk text-3xl font-bold leading-tight mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

// The "Today" tab: what is happening now, money, and a checklist of what still needs setting up.
export default function AdminSummary({ inventory, total, onGoTab, reviewsWaiting, waitlistCount }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/admin/summary', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!res.ok) throw new Error('bad');
      setData(await res.json());
      setError('');
    } catch {
      setError('Could not load the summary. Check your internet and press Refresh.');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const id = setInterval(load, 30000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [load]);

  const s = data?.summary;
  const checks = data?.checks || [];
  const todo = checks.filter((c) => !c.ok && !c.optional);

  return (
    <div className="grid gap-4">
      {error && <p className="text-xs text-red-400 border border-red-500/30 rounded-xl p-3">{error}</p>}

      {s && s.waitingToConfirm > 0 && (
        <button onClick={() => onGoTab('orders')} className="text-left rounded-2xl bg-accent text-black p-4 font-bold">
          {s.waitingToConfirm} new order{s.waitingToConfirm > 1 ? 's' : ''} waiting for you to confirm →
        </button>
      )}
      {s && s.needsRefund > 0 && (
        <button onClick={() => onGoTab('orders')} className="text-left rounded-2xl bg-red-600 text-white p-4 font-bold">
          {s.needsRefund} paid order{s.needsRefund > 1 ? 's' : ''} need a refund →
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Plates left" value={`${inventory}/${total}`} sub={inventory <= 0 ? 'Sold out' : 'for today'} tone={inventory <= 0 ? 'bad' : inventory <= 8 ? 'warn' : 'good'} />
        <Tile label="Orders today" value={s ? s.orders : '…'} sub={s ? `${s.platesSold} plates · ${s.active} in progress` : ''} />
        <Tile label="Delivered" value={s ? s.delivered : '…'} sub={s ? `${s.cancelled} cancelled` : ''} />
        <Tile label="Collected today" value={s ? rs(s.collectedTotal) : '…'} tone="good"
          sub={s ? `cash ${rs(s.cashCollected)} · UPI ${rs(s.upiCollected)}${s.onlineCollected ? ` · online ${rs(s.onlineCollected)}` : ''}` : ''} />
      </div>

      {s && s.toCollectCount > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
          <b>{rs(s.toCollect)}</b> still to collect from {s.toCollectCount} cash / UPI order{s.toCollectCount > 1 ? 's' : ''} on delivery.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onGoTab('reviews')} className="text-left bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08]">
          <div className="text-[10px] tracking-[2px] uppercase text-neutral-500">Reviews waiting</div>
          <div className={`font-grotesk text-3xl font-bold mt-1 ${reviewsWaiting > 0 ? 'text-amber-300' : ''}`}>{reviewsWaiting ?? '…'}</div>
        </button>
        <button onClick={() => onGoTab('waitlist')} className="text-left bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08]">
          <div className="text-[10px] tracking-[2px] uppercase text-neutral-500">On the waitlist</div>
          <div className="font-grotesk text-3xl font-bold mt-1">{waitlistCount ?? '…'}</div>
        </button>
      </div>

      <div className="border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-grotesk text-lg font-bold">Is everything ready for orders?</h3>
          <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10">Refresh</button>
        </div>
        {!data && !error && <p className="text-xs text-neutral-500">Checking...</p>}
        {data && (
          <>
            <p className={`text-sm font-bold mb-3 ${data.blocker ? 'text-amber-300' : 'text-green-400'}`}>
              {data.blocker ? 'Customers cannot order yet. Fix the red items below.' : 'Ordering is set up. Customers can order whenever you are online.'}
            </p>
            <ul className="grid gap-2">
              {checks.map((c) => (
                <li key={c.key} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${c.ok ? 'bg-green-500/20 text-green-400' : c.optional ? 'bg-white/10 text-neutral-400' : 'bg-red-500/20 text-red-400'}`}>
                    {c.ok ? '✓' : c.optional ? '–' : '✗'}
                  </span>
                  <span>
                    <span className={c.ok ? '' : 'font-bold'}>{c.label}</span>
                    {!c.ok && c.fix && <span className="block text-[11px] text-neutral-500">{c.fix}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {todo.length === 0 && data.setup && <p className="text-[11px] text-neutral-500 mt-3">Order numbers need supabase-orders-setup.sql to be run.</p>}
          </>
        )}
      </div>
    </div>
  );
}
