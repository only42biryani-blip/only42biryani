'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const btn = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';
const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

async function api(method, body) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch('/api/admin/requests', {
    method, cache: 'no-store',
    headers: { Authorization: `Bearer ${s.session?.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

// "Requests" tab: people who asked us to contact them. Our own phone number is shown to a visitor only when you press
// "Show our number" (it then appears on their request page for 24 hours).
export default function ContactRequests({ addToast, onOpenCount }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const { res, data } = await api('GET');
      if (!res.ok) {
        setError(data.error || 'Could not load requests.');
        return;
      }
      setError('');
      setList(data.requests);
      onOpenCount?.(data.open || 0);
    } catch {
      setError('Could not load requests.');
    }
  }, [onOpenCount]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const id = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [load]);

  async function act(r, action, okMsg) {
    setBusyId(r.id);
    try {
      const { res, data } = await api('PATCH', { id: r.id, action });
      if (!res.ok) addToast?.(data.error || 'Could not update.', 'error');
      else {
        addToast?.(okMsg, 'success');
        await load();
      }
    } catch {
      addToast?.('Could not update.', 'error');
    }
    setBusyId('');
  }

  if (error) {
    return (
      <div className="border border-amber-400/30 bg-amber-400/5 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">Contact requests</h3>
        <p className="text-xs text-neutral-300 leading-relaxed">{error}</p>
      </div>
    );
  }
  if (!list) return <p className="text-xs text-neutral-500">Loading...</p>;

  const shown = list.filter((r) => showDone || r.status === 'new');
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-grotesk text-lg font-bold">Contact requests</h3>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
            People who need us urgently leave their number here. Call or WhatsApp them, or press <b className="text-white">Show our number</b> to let them see ours on their request page for 24 hours. Our number is never shown on the website otherwise.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[#D4FF3F]" /> Show finished
        </label>
      </div>

      {shown.length === 0 && <p className="text-sm text-neutral-500 border border-white/10 rounded-2xl p-6 text-center">No open requests.</p>}
      {shown.map((r) => (
        <div key={r.id} className={`rounded-2xl border p-4 grid gap-3 ${r.status === 'new' ? 'border-accent/40 bg-accent/[0.04]' : 'border-white/10 opacity-70'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-bold text-[#F5F1E8]">{r.name} <span className="text-xs font-normal text-neutral-500">· {ago(r.created_at)} · {r.code}</span></div>
              <a href={`tel:+${r.phone}`} className="text-sm text-white/80 hover:text-accent">+{r.phone}</a>
              {r.order_code && <div className="text-xs text-saffron mt-0.5">About order {r.order_code}</div>}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {r.status === 'done' && <span className="px-2 py-1 rounded-full bg-white/10">FINISHED</span>}
              {r.revealed && <span className="px-2 py-1 rounded-full bg-accent text-black">OUR NUMBER IS SHOWN</span>}
            </div>
          </div>
          {r.message && <p className="text-sm text-white/70 leading-relaxed">&quot;{r.message}&quot;</p>}
          <div className="flex flex-wrap gap-2">
            <a href={`tel:+${r.phone}`} className={btn}>Call them</a>
            <a href={`https://wa.me/${r.phone}?text=${encodeURIComponent(`Hello ${r.name}, this is Only42Biryani. You asked us to contact you${r.order_code ? ` about order ${r.order_code}` : ''}. How can we help?`)}`} target="_blank" rel="noopener noreferrer" className={`${btn} text-green-400`}>WhatsApp them</a>
            {r.status === 'new' && !r.revealed && <button disabled={busyId === r.id} onClick={() => act(r, 'show', 'Our number is now shown on their request page (24 hours).')} className={btn}>Show our number</button>}
            {r.revealed && <button disabled={busyId === r.id} onClick={() => act(r, 'hide', 'Our number is hidden again.')} className={btn}>Hide our number</button>}
            {r.status === 'new' ? (
              <button disabled={busyId === r.id} onClick={() => act(r, 'done', 'Marked as finished.')} className={btn}>Mark finished</button>
            ) : (
              <button disabled={busyId === r.id} onClick={() => act(r, 'reopen', 'Reopened.')} className={btn}>Reopen</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
