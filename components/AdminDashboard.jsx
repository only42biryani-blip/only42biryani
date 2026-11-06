'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAIL, ZOMATO_URL } from '@/lib/config';

const TOTAL = 42;
const SENT_KEY = 'only42-messaged';

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-medium border shadow-xl backdrop-blur-md text-white
      ${type === 'error' ? 'border-red-500/30 bg-[#1a0000]/90' : 'border-green-500/30 bg-[#001a00]/90'}`}>
      <span className={`w-2 h-2 rounded-full ${type === 'error' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-green-500 shadow-[0_0_8px_lime]'}`} />
      {message}
    </div>
  );
}

// Spreadsheets run cells that start with = + - @ as formulas. Waitlist values come
// from the public form, so neutralise them before they reach an exported CSV.
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function waNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative"
      style={{ background: 'radial-gradient(circle at top right, rgba(212,255,63,0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(255,107,0,0.05), transparent 35%), #050505' }}>
      {children}
    </div>
  );
}

const card = 'w-full bg-[#121212]/75 border border-[#232323] rounded-[30px] p-8 sm:p-10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]';
const input = 'w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent';
const ghostBtn = 'border border-white/10 bg-white/[0.03] text-white rounded-xl font-bold hover:bg-white/[0.12] disabled:opacity-50 transition-all';

function Brand({ subtitle }) {
  return (
    <div className="text-center mb-8">
      <h1 className="font-grotesk text-2xl font-bold tracking-wide">ONLY<span className="text-accent">42</span>BIRYANI</h1>
      <p className="text-neutral-500 text-xs tracking-[3px] mt-1 uppercase">{subtitle}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [inventory, setInventory] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncText, setSyncText] = useState('Loading live inventory...');
  const [toasts, setToasts] = useState([]);

  const [launch, setLaunch] = useState({ launched: false, launchAt: '', banner: '' });
  const [launchState, setLaunchState] = useState('loading'); // loading | ready | missing
  const [savingLaunch, setSavingLaunch] = useState(false);

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistState, setWaitlistState] = useState('idle');
  const [query, setQuery] = useState('');
  const [waMessage, setWaMessage] = useState(
    `Hi {name}! Only42Biryani is live today. Only 42 plates, order on Zomato before they're gone: ${ZOMATO_URL}`
  );
  const [sent, setSent] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SENT_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });
  const savingRef = useRef(false);

  const email = session?.user?.email?.toLowerCase() || '';
  const isAdmin = !!session && email === ADMIN_EMAIL.toLowerCase();

  const addToast = useCallback((message, type = 'success') => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) addToast('Could not start Google sign-in', 'error');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setShowWaitlist(false);
    setWaitlist([]);
  }

  // Inventory polling (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function poll(silent) {
      if (savingRef.current) return;
      try {
        const { data, error } = await supabase.from('inventory').select('*').eq('id', 1).single();
        if (error || !data) throw error;
        if (cancelled) return;
        setInventory(data.remaining);
        setSyncText('Connected & Active');
      } catch {
        if (cancelled) return;
        setSyncText('Connection lost');
        if (!silent) addToast('Database fetch failed', 'error');
      }
    }

    poll(false);
    const id = setInterval(() => poll(true), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAdmin, addToast]);

  // Launch settings (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setLaunchState('missing');
        return;
      }
      setLaunch({ launched: !!data.launched, launchAt: toLocalInput(data.launch_at), banner: data.banner || '' });
      setLaunchState('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function saveInventory(newVal, { confirmText } = {}) {
    if (confirmText && !window.confirm(confirmText)) return;
    const oldVal = inventory;
    savingRef.current = true;
    setSaving(true);
    setSyncText('Saving changes...');
    try {
      const { data, error } = await supabase
        .from('inventory').update({ remaining: newVal }).eq('id', 1).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update was not permitted');
      setInventory(newVal);
      addToast(`Inventory updated to ${newVal}`, 'success');
      setSyncText('Connected & Active');
      // Best-effort audit trail; ignored if the log table doesn't exist yet.
      supabase.from('inventory_log').insert([{ old_value: oldVal, new_value: newVal, actor: email }]).then(() => {});
    } catch {
      addToast('Failed to save changes', 'error');
      setSyncText('Failed to sync');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function saveLaunch() {
    const wasLive = launch.launched;
    if (wasLive && !window.confirm('Launch mode is ON. Save these settings?')) return;
    setSavingLaunch(true);
    const { data, error } = await supabase
      .from('settings')
      .update({
        launched: launch.launched,
        launch_at: launch.launchAt ? new Date(launch.launchAt).toISOString() : null,
        banner: launch.banner.trim() || null,
      })
      .eq('id', 1)
      .select();
    setSavingLaunch(false);
    if (error || !data || data.length === 0) {
      addToast('Could not save launch settings', 'error');
      return;
    }
    addToast('Saved. The public site updates within about a minute.', 'success');
  }

  function toggleLaunched() {
    const next = !launch.launched;
    const text = next
      ? 'Go LIVE? Visitors will see real Order buttons and the live plate count.'
      : 'Switch back to pre-launch mode? Order buttons will show "Launching soon".';
    if (window.confirm(text)) setLaunch((l) => ({ ...l, launched: next }));
  }

  // Waitlist (admin only, enforced by the database)
  async function loadWaitlist() {
    setWaitlistState('loading');
    const { data, error } = await supabase.from('waitlist').select('*');
    if (error) {
      setWaitlistState('error');
      addToast('Could not load waitlist', 'error');
      return;
    }
    setWaitlist([...(data || [])].reverse());
    setWaitlistState('ready');
  }

  function toggleWaitlist() {
    const next = !showWaitlist;
    setShowWaitlist(next);
    if (next) loadWaitlist();
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Remove ${entry.name || entry.email} from the waitlist?`)) return;
    const { data, error } = await supabase.from('waitlist').delete().eq('id', entry.id).select();
    if (error || !data || data.length === 0) {
      addToast('Could not delete (run supabase-launch-setup.sql?)', 'error');
      return;
    }
    setWaitlist((list) => list.filter((e) => e.id !== entry.id));
    addToast('Entry removed', 'success');
  }

  function markSent(id) {
    setSent((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(SENT_KEY, JSON.stringify([...next]));
      } catch {
        // Storage blocked; the mark just won't persist.
      }
      return next;
    });
  }

  function exportCsv() {
    if (!waitlist.length) {
      addToast('No waitlist data to export', 'error');
      return;
    }
    const rows = [
      ['Name', 'Phone', 'Email', 'Joined', 'Consent', 'Source'],
      ...waitlist.map((e) => [
        e.name, e.phone, e.email,
        e.created_at ? new Date(e.created_at).toISOString() : '',
        e.consent === true ? 'yes' : e.consent === false ? 'no' : '',
        e.source,
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'only42biryani-waitlist.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const percentage = (inventory / TOTAL) * 100;
  const color = inventory <= 0 ? '#ff3b30' : inventory <= 8 ? '#ff7b00' : '#D4FF3F';

  const q = query.trim().toLowerCase();
  const visible = q
    ? waitlist.filter((e) => [e.name, e.phone, e.email].some((v) => String(v || '').toLowerCase().includes(q)))
    : waitlist;

  const toastLayer = (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2.5 z-[9999] pointer-events-none w-[calc(100%-48px)] max-w-xs">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );

  if (!authReady) {
    return <Shell><p className="text-neutral-500 text-sm">Loading...</p>{toastLayer}</Shell>;
  }

  // Signed out
  if (!session) {
    return (
      <Shell>
        <div className={`${card} max-w-sm`}>
          <Brand subtitle="Admin sign-in" />
          <button onClick={signIn}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-accent transition-colors">
            Sign in with Google
          </button>
          <p className="text-neutral-500 text-xs text-center mt-5">Only the Only42Biryani admin account can continue.</p>
        </div>
        {toastLayer}
      </Shell>
    );
  }

  // Signed in with the wrong account
  if (!isAdmin) {
    return (
      <Shell>
        <div className={`${card} max-w-sm`}>
          <Brand subtitle="Not authorised" />
          <p className="text-neutral-400 text-sm text-center mb-6">{email} does not have admin access.</p>
          <button onClick={signOut} className={`w-full py-4 text-sm ${ghostBtn}`}>Sign out</button>
        </div>
        {toastLayer}
      </Shell>
    );
  }

  // Admin
  return (
    <Shell>
      <div className={`${card} max-w-lg`}>
        <Brand subtitle="Live Kitchen Dashboard" />

        {/* Plates */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border mb-3"
            style={{ color, borderColor: `${color}33`, background: `${color}11` }}>
            <span className="w-2 h-2 rounded-full bg-current animate-live-pulse" />
            {inventory <= 0 ? 'SOLD OUT' : inventory <= 8 ? 'WARNING: CAPACITY LOW' : 'LIVE KITCHEN STATE'}
          </span>

          <p className="text-neutral-500 text-[10px] tracking-[2px] uppercase">Active Capacity</p>
          <h2 className="font-grotesk text-[60px] font-bold leading-none tracking-[-2px] my-2 transition-colors" style={{ color }}>
            {inventory} / {TOTAL}
          </h2>
          <p className="text-xs tracking-[3px] text-neutral-400">{inventory <= 0 ? 'SOLD OUT' : 'PLATES REMAINING'}</p>

          <div className="w-full h-2 bg-[#181818] rounded-full overflow-hidden mt-4 mb-3 border border-white/5">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percentage}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
          </div>

          <div className="text-xs text-neutral-500 bg-white/[0.02] border border-white/[0.04] rounded-xl py-2 px-3">{syncText}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => inventory < TOTAL && saveInventory(inventory + 1)} disabled={saving}
            className="py-4 rounded-2xl border border-accent/15 bg-accent/[0.03] text-accent text-sm font-bold hover:bg-accent/[0.08] disabled:opacity-50 transition-all">
            Add 1 Plate
          </button>
          <button onClick={() => inventory > 0 && saveInventory(inventory - 1)} disabled={saving}
            className="py-4 rounded-2xl border border-fire/15 bg-fire/[0.03] text-fire text-sm font-bold hover:bg-fire/[0.08] disabled:opacity-50 transition-all">
            Subtract 1
          </button>
          <button
            onClick={() => saveInventory(TOTAL, { confirmText: `Start today's drop? This sets the count to ${TOTAL}.` })}
            disabled={saving}
            className={`col-span-2 py-4 rounded-2xl text-sm ${ghostBtn}`}>
            Start today&apos;s drop (reset to {TOTAL})
          </button>
          <button
            onClick={() => saveInventory(0, { confirmText: 'Declare SOLD OUT? Visitors will see the sold-out state.' })}
            disabled={saving}
            className="col-span-2 py-4 rounded-2xl border border-red-500/25 bg-red-500/[0.15] text-white text-sm font-bold hover:bg-red-500 disabled:opacity-50 transition-all">
            Declare Sold Out
          </button>
        </div>

        {/* Launch controls */}
        <div className="border border-white/10 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-grotesk text-lg font-bold">Launch controls</h3>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border tracking-widest
              ${launch.launched ? 'text-accent border-accent/30 bg-accent/10' : 'text-neutral-400 border-white/10'}`}>
              {launch.launched ? 'LIVE' : 'PRE-LAUNCH'}
            </span>
          </div>

          {launchState === 'missing' ? (
            <p className="text-xs text-neutral-400 leading-relaxed">
              Launch settings aren&apos;t set up yet. Run <code className="text-accent">supabase-launch-setup.sql</code> in
              the Supabase SQL Editor, then reload this page.
            </p>
          ) : (
            <div className="grid gap-3">
              <button onClick={toggleLaunched} disabled={launchState !== 'ready'}
                className={`py-3 text-sm ${launch.launched ? ghostBtn : 'rounded-xl bg-accent text-black font-bold hover:bg-white disabled:opacity-50 transition-all'}`}>
                {launch.launched ? 'Switch back to pre-launch' : 'Go live (launch mode)'}
              </button>

              <label className="grid gap-1.5 text-xs text-neutral-400">
                Launch date and time (shows a countdown before launch)
                <input type="datetime-local" value={launch.launchAt}
                  onChange={(e) => setLaunch((l) => ({ ...l, launchAt: e.target.value }))}
                  className={input} />
              </label>

              <label className="grid gap-1.5 text-xs text-neutral-400">
                Banner message (optional, replaces the default top bar text)
                <input type="text" maxLength={120} value={launch.banner} placeholder="e.g. Launching Saturday 12:30 PM"
                  onChange={(e) => setLaunch((l) => ({ ...l, banner: e.target.value }))}
                  className={input} />
              </label>

              <button onClick={saveLaunch} disabled={savingLaunch || launchState !== 'ready'}
                className={`py-3 text-sm ${ghostBtn}`}>
                {savingLaunch ? 'Saving...' : 'Save launch settings'}
              </button>
            </div>
          )}
        </div>

        {/* Waitlist */}
        <button onClick={toggleWaitlist} className={`w-full py-4 text-sm mb-4 ${ghostBtn} rounded-2xl`}>
          {showWaitlist ? 'Hide Waitlist' : 'View Waitlist'}
        </button>

        {showWaitlist && (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-3 text-xs text-neutral-400">
              <span>
                {waitlistState === 'loading' && 'Loading...'}
                {waitlistState === 'error' && 'Failed to load waitlist'}
                {waitlistState === 'ready' && `${visible.length} of ${waitlist.length} shown`}
              </span>
              <button onClick={exportCsv} className={`px-3 py-2 text-xs ${ghostBtn} rounded-lg`}>Export CSV</button>
            </div>

            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone or email" className={`${input} mb-3`} />

            <label className="grid gap-1.5 text-xs text-neutral-400 mb-3">
              WhatsApp message ({'{name}'} is replaced with each person&apos;s name)
              <textarea value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows={3} className={input} />
            </label>

            <div className="max-h-96 overflow-y-auto flex flex-col gap-2">
              {visible.map((e, i) => {
                const noConsent = e.consent === false;
                const link = `https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(waMessage.replaceAll('{name}', e.name || 'there'))}`;
                return (
                  <div key={e.id ?? i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{e.name || '—'}</div>
                        <div className="text-neutral-500 text-xs mt-0.5 break-all">{e.phone || '—'} · {e.email || '—'}</div>
                        <div className="text-neutral-600 text-[11px] mt-1">
                          {e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : 'date unknown'}
                          {e.source ? ` · via ${e.source}` : ''}
                          {e.consent === true ? ' · consent recorded' : e.consent === false ? ' · NO consent' : ' · joined before consent box'}
                        </div>
                      </div>
                      <button onClick={() => deleteEntry(e)} className="text-neutral-600 hover:text-red-500 text-xs shrink-0" aria-label="Remove entry">
                        Remove
                      </button>
                    </div>
                    {!noConsent && (
                      <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => markSent(e.id)}
                        className={`inline-block mt-3 text-xs font-bold px-3 py-2 rounded-lg border transition-colors
                          ${sent.has(e.id) ? 'border-white/10 text-neutral-500' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
                        {sent.has(e.id) ? 'Messaged ✓ (send again)' : 'Message on WhatsApp'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={signOut}
          className="w-full text-center text-xs text-neutral-500 tracking-[2px] uppercase hover:text-red-500 transition-colors mt-2">
          Sign out ({email})
        </button>
      </div>
      {toastLayer}
    </Shell>
  );
}
