'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TABS = [['pending', 'Waiting'], ['approved', 'Shown'], ['hidden', 'Hidden'], ['all', 'All']];
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function Switch({ checked, disabled, onChange, title, help }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-[11px] text-neutral-500 leading-relaxed">{help}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-[#D4FF3F] shrink-0" />
    </label>
  );
}

// Admin controls for reviews. Everything here is enforced by the database: only the admin Google account can
// read unapproved reviews, approve, hide or delete them, or change the two switches.
export default function ReviewsAdmin({ addToast }) {
  const [reviews, setReviews] = useState(null);
  const [flags, setFlags] = useState({ show_reviews: true, accept_reviews: false });
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('settings').select('show_reviews, accept_reviews').eq('id', 1).maybeSingle(),
    ]);
    if (r.error || s.error || !s.data) {
      setMissing(true);
      setReviews([]);
      return;
    }
    setMissing(false);
    setReviews(r.data || []);
    setFlags({ show_reviews: s.data.show_reviews !== false, accept_reviews: s.data.accept_reviews === true });
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function setFlag(key, value) {
    setBusy(key);
    const { data, error } = await supabase.from('settings').update({ [key]: value }).eq('id', 1).select();
    setBusy('');
    if (error || !data || data.length === 0) return addToast?.('Could not save that setting', 'error');
    setFlags((f) => ({ ...f, [key]: value }));
    addToast?.(value ? 'Switched on (the website updates within a minute)' : 'Switched off', 'success');
  }

  async function setStatus(r, status) {
    setBusy(r.id);
    const { data, error } = await supabase.from('reviews').update({ status }).eq('id', r.id).select();
    setBusy('');
    if (error || !data || data.length === 0) return addToast?.('Could not update the review', 'error');
    setReviews((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)));
    addToast?.(status === 'approved' ? 'Now shown on the website (within a minute)' : 'Hidden from the website', 'success');
  }

  async function remove(r) {
    if (!window.confirm(`Delete the review from ${r.name} for good? This cannot be undone.`)) return;
    setBusy(r.id);
    const { data, error } = await supabase.from('reviews').delete().eq('id', r.id).select();
    setBusy('');
    if (error || !data || data.length === 0) return addToast?.('Could not delete the review', 'error');
    setReviews((list) => list.filter((x) => x.id !== r.id));
    addToast?.('Review deleted', 'success');
  }

  const list = (reviews || []).filter((r) => tab === 'all' || r.status === tab);
  const count = (s) => (reviews || []).filter((r) => r.status === s).length;
  const small = 'px-3 py-1.5 text-[11px] font-bold rounded-md border transition-colors disabled:opacity-50';

  return (
    <div className="border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="font-grotesk text-lg font-bold">Customer reviews</h3>
        {count('pending') > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent text-black">{count('pending')} WAITING</span>}
      </div>

      {missing ? (
        <p className="text-xs text-neutral-400 leading-relaxed">
          Reviews are not set up yet. Run <code className="text-accent">supabase-reviews-setup.sql</code> in Supabase, then reload this page.
        </p>
      ) : (
        <>
          <div className="divide-y divide-white/5 mb-3">
            <Switch checked={flags.show_reviews} disabled={busy === 'show_reviews'} onChange={(v) => setFlag('show_reviews', v)}
              title="Show the reviews section on the website"
              help="Off = the whole section is hidden, even approved reviews." />
            <Switch checked={flags.accept_reviews} disabled={busy === 'accept_reviews'} onChange={(v) => setFlag('accept_reviews', v)}
              title="Let visitors write reviews"
              help="Off = no review form. Switch on after you have real customers. New reviews never appear until you approve them." />
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`${small} ${tab === k ? 'bg-accent text-black border-accent' : 'border-white/15 text-neutral-300 hover:bg-white/5'}`}>
                {label}{k !== 'all' ? ` (${count(k)})` : ` (${(reviews || []).length})`}
              </button>
            ))}
          </div>

          {reviews === null && <p className="text-xs text-neutral-500">Loading...</p>}
          {reviews !== null && list.length === 0 && <p className="text-xs text-neutral-500">Nothing here.</p>}

          <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
            {list.map((r) => (
              <div key={r.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-saffron tracking-wider">{stars(r.rating)}</div>
                    <div className="font-bold">{r.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      {new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    r.status === 'approved' ? 'text-green-400 border-green-500/30' : r.status === 'pending' ? 'text-amber-300 border-amber-400/30' : 'text-neutral-400 border-white/15'}`}>
                    {r.status === 'approved' ? 'SHOWN' : r.status === 'pending' ? 'WAITING' : 'HIDDEN'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-neutral-300 break-words whitespace-pre-wrap">{r.comment}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.status !== 'approved' && (
                    <button onClick={() => setStatus(r, 'approved')} disabled={busy === r.id}
                      className={`${small} bg-accent text-black border-accent hover:bg-white`}>Show on website</button>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => setStatus(r, 'hidden')} disabled={busy === r.id}
                      className={`${small} border-white/15 text-neutral-300 hover:bg-white/5`}>Hide</button>
                  )}
                  {r.status === 'pending' && (
                    <button onClick={() => setStatus(r, 'hidden')} disabled={busy === r.id}
                      className={`${small} border-white/15 text-neutral-300 hover:bg-white/5`}>Reject</button>
                  )}
                  <button onClick={() => remove(r)} disabled={busy === r.id}
                    className={`${small} border-red-500/30 text-red-400 hover:bg-red-500/10`}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
