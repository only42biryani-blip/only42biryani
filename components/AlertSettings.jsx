'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const btn = 'px-4 py-2.5 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.12] disabled:opacity-50 transition-all';

async function call(method) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch('/api/admin/test-alert', { method, headers: { Authorization: `Bearer ${s.session?.access_token}` }, cache: 'no-store' });
  return { res, data: await res.json().catch(() => ({})) };
}

// Phone alerts: a Telegram message for every new order and every waitlist signup.
export default function AlertSettings({ addToast }) {
  const [configured, setConfigured] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    call('GET').then(({ data }) => { if (!off) setConfigured(!!data.configured); }).catch(() => { if (!off) setConfigured(false); });
    return () => { off = true; };
  }, []);

  async function test() {
    setBusy(true);
    try {
      const { res, data } = await call('POST');
      if (res.ok) addToast?.('Test alert sent. Check Telegram on your phone.', 'success');
      else addToast?.(data.error || 'Could not send the test alert.', 'error');
    } catch {
      addToast?.('Could not send the test alert.', 'error');
    }
    setBusy(false);
  }

  if (configured === null) return null;
  return (
    <div className={`rounded-2xl p-5 border ${configured ? 'border-white/10' : 'border-amber-400/30 bg-amber-400/5'}`}>
      <h3 className="font-grotesk text-lg font-bold mb-1">Phone alerts (Telegram)</h3>
      {configured ? (
        <>
          <p className="text-xs text-neutral-400 leading-relaxed mb-3">On. You get a Telegram message for every new order (including pre-bookings and paid online orders) and every waitlist signup.</p>
          <button onClick={test} disabled={busy} className={btn}>{busy ? 'Sending...' : 'Send a test alert'}</button>
        </>
      ) : (
        <p className="text-xs text-neutral-300 leading-relaxed">
          Not set up. In Telegram open <b>@BotFather</b>, create a bot, press Start in the new bot&apos;s chat, then add <code className="text-accent">TELEGRAM_BOT_TOKEN</code> and{' '}
          <code className="text-accent">TELEGRAM_CHAT_ID</code> in Vercel (type Secret) and redeploy. Until then you only find out by opening this page.
        </p>
      )}
    </div>
  );
}
