'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapsLink } from '@/lib/maps';

// Address / location box for one waitlist person: paste what they sent on WhatsApp (text or a Google Maps link).
export default function WaitlistAddress({ entry, onSaved, addToast }) {
  const [text, setText] = useState(entry.address || '');
  const [saving, setSaving] = useState(false);
  const dirty = text.trim() !== (entry.address || '').trim();

  async function save() {
    setSaving(true);
    const value = text.trim() || null;
    const { data, error } = await supabase
      .from('waitlist')
      .update({ address: value, address_updated_at: new Date().toISOString() })
      .eq('id', entry.id)
      .select();
    setSaving(false);
    if (error || !data || data.length === 0) {
      addToast?.('Could not save the address. Run supabase-selfdelivery-setup.sql in Supabase first.', 'error');
      return;
    }
    onSaved(data[0]);
    addToast?.('Address saved', 'success');
  }

  async function copy() {
    const t = `${entry.name} - ${String(entry.phone || '').replace(/^\+?91/, '')}\n${entry.address}\n${mapsLink(entry)}`;
    try {
      await navigator.clipboard.writeText(t);
      addToast?.('Copied name, phone and address', 'success');
    } catch {
      window.prompt('Copy this:', t);
    }
  }

  const small = 'px-2.5 py-1 text-[11px] rounded-md border border-white/15 text-neutral-300 hover:bg-white/5';
  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Paste their address or Google Maps link here"
        className="w-full px-3 py-2 bg-black/40 text-white text-xs outline-none border border-white/15 focus:border-accent rounded-lg placeholder:text-white/30"
      />
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <button onClick={save} disabled={!dirty || saving}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-md border transition-colors disabled:opacity-40 ${dirty ? 'bg-accent text-black border-accent' : 'border-white/15 text-neutral-400'}`}>
          {saving ? 'Saving...' : dirty ? 'Save address' : entry.address ? 'Saved ✓' : 'Save address'}
        </button>
        {entry.address && !dirty && (
          <>
            <button onClick={copy} className={small}>Copy name + address</button>
            <a href={mapsLink(entry)} target="_blank" rel="noopener noreferrer" className={small}>Open in Maps</a>
          </>
        )}
      </div>
    </div>
  );
}
