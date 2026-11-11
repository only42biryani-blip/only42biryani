'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Receipt, { textBill } from '@/components/Receipt';
import { escposFromText, bluetoothAvailable, printOverBluetooth } from '@/lib/escpos';

// Printable bill for one order. Opens from the "Print bill" button on the admin order board.
// Made for 80 mm and 58 mm thermal receipt printers; also works on any normal printer or "Save as PDF".

function Bill() {
  const params = useSearchParams();
  const code = (params.get('code') || '').toUpperCase();
  const [width, setWidth] = useState(params.get('w') === '58' ? 58 : 80);
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [btState, setBtState] = useState('');
  const [btOk, setBtOk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBtOk(bluetoothAvailable()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return !stop && setError('Please sign in on the Admin page first, then open the bill again.');
      const res = await fetch(`/api/admin/orders/${code}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (stop) return;
      if (!res.ok) return setError(data.error || 'Could not load this order.');
      setO(data.order);
      if (params.get('print') === '1') setTimeout(() => window.print(), 400);
    })();
    return () => { stop = true; };
  }, [code, params]);

  if (error) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>{error}</p>;
  if (!o) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading bill...</p>;

  const cols = width === 58 ? 32 : 42;
  const text = textBill(o, cols);

  async function printBluetooth() {
    setBtState('Pick your printer in the list that opens...');
    try {
      // Thermal printers print about 32 characters per line on 58 mm paper and 48 on 80 mm paper.
      await printOverBluetooth(escposFromText(textBill(o, width === 58 ? 32 : 48)));
      setBtState('Sent to the printer ✓');
    } catch (err) {
      setBtState(err?.name === 'NotFoundError' ? 'No printer chosen.' : err?.message || 'Could not print over Bluetooth.');
    }
  }

  async function copyText() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy the bill text:', text); }
  }

  return (
    <div style={{ background: '#e5e5e5', minHeight: '100vh', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @page { size: ${width}mm auto; margin: 2mm; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .bill-wrap { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .receipt { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 460, margin: '0 auto 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => window.print()} style={btn(true)}>Print bill</button>
        {btOk && <button onClick={printBluetooth} style={btn()}>Print via Bluetooth</button>}
        <button onClick={copyText} style={btn()}>{copied ? 'Copied ✓' : 'Copy bill text'}</button>
        <a href={`https://wa.me/${o.customer_phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: 'none' }}>Send on WhatsApp</a>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          Paper
          <select value={width} onChange={(e) => setWidth(Number(e.target.value))} style={{ padding: 6 }}>
            <option value={80}>80 mm</option>
            <option value={58}>58 mm</option>
          </select>
        </label>
      </div>

      <div className="no-print" style={{ maxWidth: 460, margin: '0 auto 12px', fontSize: 12, color: '#333', lineHeight: 1.5 }}>
        {btState && <div style={{ fontWeight: 700, marginBottom: 4 }}>{btState}</div>}
        <b>Which button?</b> <b>Print bill</b> works with any printer: on Android choose your printer or the RawBT app in the print menu.
        <b> Print via Bluetooth</b> connects straight to Bluetooth LE printers only (Chrome); older Bluetooth printers need Print bill.
        <b> Copy bill text</b> lets you paste the bill into your billing app.
      </div>

      <div className="bill-wrap">
        <Receipt o={o} width={width} />
      </div>
    </div>
  );
}

function btn(primary) {
  return {
    padding: '9px 14px', fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
    border: '1px solid #111', background: primary ? '#111' : '#fff', color: primary ? '#fff' : '#111',
  };
}

export default function BillPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading...</p>}>
      <Bill />
    </Suspense>
  );
}
