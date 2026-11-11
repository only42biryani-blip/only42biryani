'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const btn = 'px-4 py-2.5 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';
const OPTIONS = [
  ['off', 'Off', 'Customers can only choose cash / UPI on delivery.'],
  ['test', 'Test only', 'Only you can pay online, through your private test link. Customers still see cash / UPI only.'],
  ['on', 'On for everyone', 'Customers can choose to pay online. Use only after Razorpay approves you and you add the LIVE keys.'],
];

// How customers can pay. Saved in the database; takes effect straight away (admin login only).
export default function PaymentSettings({ addToast }) {
  const [state, setState] = useState(null); // { accept_cod, online_pay }
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('accept_cod, online_pay').eq('id', 1).maybeSingle();
    if (error || !data) return setMissing(true);
    setMissing(false);
    setState({ accept_cod: data.accept_cod !== false, online_pay: ['test', 'on'].includes(data.online_pay) ? data.online_pay : 'off' });
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(patch, okMessage) {
    const next = { ...state, ...patch };
    if (!next.accept_cod && next.online_pay !== 'on') {
      if (!window.confirm('With cash on delivery off and online payment not "On for everyone", customers cannot order at all. Continue?')) return;
    }
    if (patch.online_pay === 'on' && !window.confirm('Turn online payment ON for every customer? Only do this with approved LIVE Razorpay keys. With test keys customers would pay fake money.')) return;
    setBusy(true);
    const { data, error } = await supabase.from('settings').update(patch).eq('id', 1).select('accept_cod, online_pay');
    setBusy(false);
    if (error || !data || data.length === 0) return addToast?.('Could not save. Run supabase-payment-setup.sql in Supabase first.', 'error');
    setState({ accept_cod: data[0].accept_cod !== false, online_pay: data[0].online_pay });
    addToast?.(okMessage, 'success');
  }

  async function makeLink() {
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/test-link', { headers: { Authorization: `Bearer ${s.session?.access_token}` }, cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return addToast?.(d.error || 'Could not make the test link', 'error');
    setLink(d.url);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      addToast?.('Test link copied', 'success');
    } catch {
      addToast?.('Copy failed. Select the link and copy it.', 'error');
    }
  }

  if (missing) {
    return (
      <div className="border border-amber-400/30 bg-amber-400/5 rounded-2xl p-5">
        <h3 className="font-grotesk text-lg font-bold mb-1">How customers pay</h3>
        <p className="text-xs text-neutral-300 leading-relaxed">Not set up yet. Run <code className="text-accent">supabase-payment-setup.sql</code> in Supabase, then reload. Until then customers can pay cash / UPI on delivery only.</p>
      </div>
    );
  }
  if (!state) return null;

  return (
    <div className="border border-white/10 rounded-2xl p-5 grid gap-4">
      <h3 className="font-grotesk text-lg font-bold">How customers pay</h3>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={state.accept_cod} disabled={busy} onChange={(e) => save({ accept_cod: e.target.checked }, e.target.checked ? 'Cash / UPI on delivery is ON.' : 'Cash / UPI on delivery is OFF.')} className="mt-1 h-5 w-5 accent-[#D4FF3F]" />
        <span className="text-sm"><b>Cash / UPI on delivery</b>
          <span className="block text-xs text-neutral-400">Customers place the order and pay you when it arrives. Keep this ON for launch.</span>
        </span>
      </label>

      <div>
        <div className="text-sm font-bold mb-2">Online payment (Razorpay)</div>
        <div className="grid gap-2">
          {OPTIONS.map(([key, label, help]) => (
            <label key={key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${state.online_pay === key ? 'border-accent bg-accent/5' : 'border-white/10'}`}>
              <input type="radio" name="online_pay" checked={state.online_pay === key} disabled={busy} onChange={() => save({ online_pay: key }, `Online payment: ${label}.`)} className="mt-1 accent-[#D4FF3F]" />
              <span className="text-sm"><b>{label}</b><span className="block text-xs text-neutral-400">{help}</span></span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
        <div className="text-sm font-bold mb-1">Your private test link</div>
        <p className="text-xs text-neutral-400 leading-relaxed mb-3">
          Needs Razorpay keys in Vercel and online payment set to <b>Test only</b>. The link shows the &quot;Pay online&quot; choice to you alone and works until midnight (India time). Orders made with it are marked TEST ORDER. Never share it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={makeLink} className={btn}>Make today&apos;s test link</button>
          {link && <button onClick={copyLink} className={btn}>Copy link</button>}
          {link && <a href={link} target="_blank" rel="noopener noreferrer" className={btn}>Open it</a>}
        </div>
        {link && <p className="text-[11px] text-neutral-500 break-all mt-2">{link}</p>}
      </div>
    </div>
  );
}
