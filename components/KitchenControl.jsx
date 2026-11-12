'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { autoEnabled, autoOnlineNow, bellDue, closingInstant, isOnline, istNow, kitchenOpenNow, mins, prettyClock as clock, prettyTime, validTime, RING_WINDOW_MIN } from '@/lib/kitchenTime';


const SNOOZE_MIN = 10;
const QUIET_KEY = 'only42-bell-quiet-day';

function readQuietDay() {
  try {
    return localStorage.getItem(QUIET_KEY) || '';
  } catch {
    return '';
  }
}

// A three-beep bell with the browser's built-in audio. The browser needs one tap on the page first.
function useBell() {
  const ctxRef = useRef(null);
  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    } catch {
      // No audio support: the banner and notification still work.
    }
  }, []);
  const ring = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return false;
    [0, 0.45, 0.9].forEach((offset) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + offset);
      o.stop(ctx.currentTime + offset + 0.4);
    });
    return true;
  }, []);
  return { unlock, ring };
}

// The daily switch: customers can order only while the kitchen is ONLINE. It switches itself off at the closing
// time, so every morning starts offline and you press Go online again. While you are still offline after the
// reminder time, this page rings a bell (while the admin page is open) and shows a red banner.
export default function KitchenControl({ addToast }) {
  const [row, setRow] = useState(null); // { online_until, close_time, reminder_time }
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [quietDay, setQuietDay] = useState('');
  const [times, setTimes] = useState({ close: '22:00', reminder: '10:30', auto: '11:00', autoOn: true });
  const [timesDirty, setTimesDirty] = useState(false);
  const [notif, setNotif] = useState('unsupported');
  const [audioOk, setAudioOk] = useState(false);
  const bell = useBell();
  const lastRing = useRef(0);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data || data.online_until === undefined) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setRow(data);
    if (!dirtyRef.current) {
      setTimes({
        close: data.close_time || '22:00', reminder: data.reminder_time || '10:30',
        auto: validTime(data.auto_online_time) ? data.auto_online_time : '11:00', autoOn: autoEnabled(data),
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const id = setInterval(load, 60000); // pick up changes made from another device
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setNotif(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); setQuietDay(readQuietDay()); }, 0);
    const onTap = () => {
      bell.unlock();
      setAudioOk(true);
    };
    window.addEventListener('pointerdown', onTap, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onTap);
    };
  }, [bell]);

  const online = row ? kitchenOpenNow(row, now) : false;
  const today = istNow(now).date;
  const autoReady = row ? row.auto_online_time !== undefined : false; // the automatic-opening SQL has been run
  const autoOn = row ? autoEnabled(row) : false;
  const closedToday = autoOn && row.auto_off_day === today; // you pressed Go offline / Stay closed today
  const manualOnline = row ? isOnline(row.online_until, now) : false;
  // With automatic opening on, the kitchen opens by itself, so the morning bell is not needed.
  const due = row && !autoOn ? bellDue({ onlineUntil: row.online_until, reminderTime: row.reminder_time || '10:30', closeTime: row.close_time || '22:00', now }) : false;
  const quietToday = quietDay === today;
  const ringing = due && !quietToday && now.getTime() >= snoozedUntil;

  function stayOfflineToday() {
    const day = istNow(new Date()).date;
    try {
      localStorage.setItem(QUIET_KEY, day);
    } catch {
      // Not saved; it still stays quiet until you reload.
    }
    setQuietDay(day);
  }

  // Ring every 25 seconds while due; change the tab title so a background tab is noticed too.
  useEffect(() => {
    if (!ringing) {
      document.title = 'Admin | Only42Biryani';
      return;
    }
    document.title = '🔔 GO ONLINE! | Only42Biryani';
    if (Date.now() - lastRing.current >= 25000) {
      lastRing.current = Date.now();
      bell.ring();
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Only42Biryani is OFFLINE', { body: 'Open the dashboard and press Go online so customers can order.', tag: 'go-online' });
        }
      } catch {
        // Notifications can be blocked; the banner stays.
      }
    }
  }, [ringing, now, bell]);

  async function save(patch, okMessage) {
    setBusy(true);
    const { data, error } = await supabase.from('settings').update(patch).eq('id', 1).select('*');
    setBusy(false);
    if (error || !data || data.length === 0) {
      addToast?.('Could not save. Run supabase-kitchen-setup.sql in Supabase first.', 'error');
      return false;
    }
    setRow(data[0]);
    addToast?.(okMessage, 'success');
    return true;
  }

  async function goOnline() {
    bell.unlock();
    const closeAt = row?.close_time || times.close;
    const until = closingInstant(closeAt, new Date());
    if (!until) {
      addToast?.(`Closing time ${closeAt} has already passed today. Set a later closing time below.`, 'error');
      return;
    }
    await save({ online_until: until.toISOString(), ...(autoReady ? { auto_off_day: null } : {}) }, `You are ONLINE until ${prettyTime(until)}. Customers can order now.`);
  }

  async function goOffline() {
    const tomorrow = autoOn ? ' Automatic opening starts again tomorrow.' : '';
    if (!window.confirm(`Go offline? Customers will not be able to place new orders for the rest of today.${tomorrow}`)) return;
    await save({ online_until: null, ...(autoReady ? { auto_off_day: today } : {}) }, `You are OFFLINE for today.${tomorrow}`);
  }

  // Before the automatic opening time: keep the kitchen closed for the whole day (a holiday).
  async function closeToday() {
    if (!window.confirm('Keep the kitchen closed for the rest of today? It will open by itself again tomorrow.')) return;
    await save({ online_until: null, auto_off_day: today }, 'Closed for today. It opens by itself again tomorrow.');
  }

  async function saveTimes() {
    if (!validTime(times.close) || !validTime(times.reminder) || (autoReady && times.autoOn && !validTime(times.auto))) {
      addToast?.('Enter times like 22:00 (24-hour).', 'error');
      return;
    }
    if (autoReady && times.autoOn && mins(times.auto) >= mins(times.close)) {
      addToast?.('The automatic opening time must be earlier than the closing time.', 'error');
      return;
    }
    const patch = { close_time: times.close.trim(), reminder_time: times.reminder.trim() };
    if (autoReady) patch.auto_online_time = times.autoOn ? times.auto.trim() : null;
    if (await save(patch, 'Times saved.')) {
      dirtyRef.current = false;
      setTimesDirty(false);
    }
  }

  function editTime(key, value) {
    setTimes((t) => ({ ...t, [key]: value }));
    dirtyRef.current = true;
    setTimesDirty(true);
  }

  async function askNotifications() {
    bell.unlock();
    try {
      setNotif(await Notification.requestPermission());
    } catch {
      setNotif('denied');
    }
  }

  function testBell() {
    bell.unlock();
    setAudioOk(true);
    setTimeout(() => {
      if (!bell.ring()) addToast?.('Your browser blocked sound. Tap the page once and try again.', 'error');
    }, 120);
  }

  const small = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';
  const field = 'w-24 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent';

  if (missing) {
    return (
      <div className="border border-amber-400/30 bg-amber-400/5 rounded-2xl p-5 mb-6">
        <h3 className="font-grotesk text-lg font-bold mb-1">Daily Go online switch</h3>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Not set up yet. Run <code className="text-accent">supabase-kitchen-setup.sql</code> in Supabase, then reload. Until then customers
          are not blocked by this switch.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-5 mb-6 border-2 ${online ? 'border-green-500/50 bg-green-500/[0.06]' : ringing ? 'border-red-500 bg-red-500/10' : 'border-red-500/40 bg-red-500/[0.05]'}`}>
      {ringing && (
        <div role="alert" className="mb-4 rounded-xl bg-red-600 text-white px-4 py-3 text-sm font-bold flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <span>🔔 You are OFFLINE. Customers cannot order. Press Go online!</span>
          <button onClick={() => setSnoozedUntil(Date.now() + SNOOZE_MIN * 60000)} className="text-xs px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60">
            Snooze {SNOOZE_MIN} min
          </button>
          <button onClick={stayOfflineToday} className="text-xs px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60">
            Stay offline today (stop bell)
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-red-500'}`} />
            <h3 className="font-grotesk text-xl font-bold">{row === null ? 'Checking...' : online ? 'Kitchen is ONLINE' : 'Kitchen is OFFLINE'}</h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {row === null ? '' : online
              ? (manualOnline && !autoOnlineNow(row, now)
                ? `Customers can order until ${prettyTime(row.online_until)}, then it switches off by itself.`
                : `Opened automatically at ${clock(row.auto_online_time)}. Customers can order until ${clock(row.close_time || '22:00')}, then it switches off by itself.`)
              : closedToday
                ? 'Closed for today (you pressed Go offline). It opens by itself again tomorrow. Customers can pre-book.'
                : autoOn && autoReady && istNow(now).minutes < mins(row.auto_online_time)
                  ? `Opens by itself today at ${clock(row.auto_online_time)}. Customers can pre-book until then.`
                  : 'Customers see "kitchen offline" and cannot place orders. Your own manual orders still work.'}
          </p>
        </div>
        {row !== null && (online ? (
          <button onClick={goOffline} disabled={busy} className="px-6 py-4 rounded-2xl border border-red-500/40 text-red-300 font-bold text-sm hover:bg-red-500/10 disabled:opacity-50">
            Go offline
          </button>
        ) : (
          <div className="flex flex-wrap gap-3 items-center">
            {autoOn && !closedToday && istNow(now).minutes < mins(row.auto_online_time) && (
              <button onClick={closeToday} disabled={busy} className="px-4 py-3 rounded-2xl border border-white/15 text-neutral-300 font-bold text-xs hover:bg-white/10 disabled:opacity-50">
                Stay closed today
              </button>
            )}
            <button onClick={goOnline} disabled={busy} className="px-8 py-4 rounded-2xl bg-green-500 text-black font-extrabold text-base hover:bg-green-400 disabled:opacity-50">
              {busy ? 'Saving...' : autoOn ? 'OPEN NOW' : 'GO ONLINE'}
            </button>
          </div>
        ))}
      </div>

      <details className="mt-4 text-xs text-neutral-400">
        <summary className="cursor-pointer font-bold text-neutral-300">Closing time, daily bell and sound</summary>
        <div className="mt-3 grid gap-3">
          {autoReady && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-neutral-300 font-bold">
                <input type="checkbox" checked={times.autoOn} onChange={(e) => editTime('autoOn', e.target.checked)} className="w-4 h-4 accent-green-500" />
                Open by itself every day at
              </label>
              <input value={times.auto} onChange={(e) => editTime('auto', e.target.value)} disabled={!times.autoOn} className={`${field} disabled:opacity-40`} placeholder="11:00" />
              <span className="text-neutral-500">(IST, 24h). The 42 plates also start by themselves.</span>
            </div>
          )}
          {!autoReady && (
            <p className="text-amber-300/90">Automatic daily opening needs one SQL step: run <code className="text-accent">supabase-autoopen-setup.sql</code> in Supabase, then reload.</p>
          )}
          <div className="flex flex-wrap gap-4 items-end">
            <label className="grid gap-1">Close at (IST, 24h)
              <input value={times.close} onChange={(e) => editTime('close', e.target.value)} className={field} placeholder="22:00" />
            </label>
            <label className="grid gap-1">Ring bell from
              <input value={times.reminder} onChange={(e) => editTime('reminder', e.target.value)} className={field} placeholder="10:30" />
            </label>
            <button onClick={saveTimes} disabled={busy || !timesDirty} className={small}>Save times</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={testBell} className={small}>🔔 Test the bell</button>
            {notif === 'default' && <button onClick={askNotifications} className={small}>Allow pop-up alerts</button>}
          </div>
          <p className="leading-relaxed text-neutral-500">
            The bell rings only while this dashboard is open in a browser tab (keep it open on the kitchen phone or laptop, with sound on and the screen awake).
            It is a morning reminder: it rings every 25 seconds for {RING_WINDOW_MIN} minutes from the bell time, only while you are still offline, then stays quiet all day.
            {!audioOk && ' Tap anywhere on this page once so the browser allows sound.'}
            {notif === 'denied' && ' Pop-up alerts are blocked in this browser.'}
            {notif === 'granted' && ' Pop-up alerts are on.'}
          </p>
        </div>
      </details>
    </div>
  );
}
