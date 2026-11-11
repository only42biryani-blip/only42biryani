'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Receipt, { Labels, textBill } from '@/components/Receipt';
import { billModel, defaultBill, rs } from '@/lib/bill';
import { escposFromText, bluetoothAvailable, printOverBluetooth } from '@/lib/escpos';

// Printable, editable bill for one order. Opens from the "Print bill" / "Edit bill" buttons on the admin order board.
// Made for 80 mm and 58 mm thermal receipt printers; also works on any normal printer or "Save as PDF".

const PAY_CHOICES = ['', 'TO PAY on delivery (cash / UPI)', 'PAID - Cash', 'PAID - UPI', 'PAID online'];

// Turn a saved/default bill into the text fields shown in the editor.
function toForm(o) {
  const b = o.bill && typeof o.bill === 'object' ? o.bill : defaultBill(o);
  return {
    items: (b.items || []).map((i) => ({ name: i.name, qty: String(i.qty), rate: String(i.rate) })),
    dtype: b.discount?.type || 'none',
    dvalue: String(b.discount?.value ?? 0),
    fee: String(b.deliveryFee ?? 0),
    name: b.customer?.name || o.customer_name || '',
    phone: String(b.customer?.phone || o.customer_phone || '').replace(/^91/, ''),
    address: b.customer?.address || o.address || '',
    note: b.note || '',
    pay: b.paymentText || '',
  };
}

function fromForm(f) {
  return {
    items: f.items.map((i) => ({ name: i.name, qty: i.qty, rate: i.rate })),
    discount: { type: f.dtype, value: f.dvalue },
    deliveryFee: f.fee,
    note: f.note,
    paymentText: f.pay,
    customer: { name: f.name, phone: f.phone, address: f.address },
  };
}

const field = { padding: '7px 8px', fontSize: 13, border: '1px solid #999', borderRadius: 6, width: '100%', boxSizing: 'border-box', color: '#111', background: '#fff' };
const lab = { display: 'grid', gap: 3, fontSize: 11, color: '#333' };
const btn = (primary) => ({
  padding: '9px 14px', fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
  border: '1px solid #111', background: primary ? '#111' : '#fff', color: primary ? '#fff' : '#111',
});

function Bill() {
  const params = useSearchParams();
  const code = (params.get('code') || '').toUpperCase();
  const [paper, setPaper] = useState(['58', 'label'].includes(params.get('w')) ? params.get('w') : '80');
  const width = paper === '58' ? 58 : 80;
  const isLabel = paper === 'label';
  const [o, setO] = useState(null);
  const [form, setForm] = useState(null);
  const [edit, setEdit] = useState(params.get('edit') === '1');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
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
      setForm(toForm(data.order));
      if (params.get('print') === '1') setTimeout(() => window.print(), 500);
    })();
    return () => { stop = true; };
  }, [code, params]);

  const model = useMemo(() => (o && form ? billModel(o, fromForm(form)) : null), [o, form]);
  const editable = o?.payment_mode === 'cod' && !['cancelled', 'refunded'].includes(o?.status);

  if (error) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>{error}</p>;
  if (!o || !form || !model) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading bill...</p>;

  const cols = width === 58 ? 32 : 42;
  const text = textBill(model, cols);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setItem = (i, patch) => setForm((f) => ({ ...f, items: f.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));

  async function save(thenPrint) {
    setSaving(true);
    setMsg('');
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/admin/orders/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'save_bill', bill: fromForm(form) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error || 'Could not save the bill.');
      setO(data.order);
      setForm(toForm(data.order));
      setMsg(`Saved ✓ Total ${rs(data.order.total)}`);
      if (thenPrint) setTimeout(() => window.print(), 300);
    } finally {
      setSaving(false);
    }
  }

  async function printBluetooth() {
    setMsg('Pick your printer in the list that opens...');
    try {
      await printOverBluetooth(escposFromText(textBill(model, width === 58 ? 32 : 48)));
      setMsg('Sent to the printer ✓');
    } catch (err) {
      setMsg(err?.name === 'NotFoundError' ? 'No printer chosen.' : err?.message || 'Could not print over Bluetooth.');
    }
  }

  async function copyText() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy the bill text:', text); }
  }

  const waPhone = String(form.phone || o.customer_phone).replace(/[^\d]/g, '');
  const waTo = waPhone.length === 10 ? `91${waPhone}` : waPhone;

  return (
    <div className="bill-wrap" style={{ background: '#e5e5e5', color: '#111', minHeight: '100vh', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        ${isLabel ? '@page { size: 50mm 25mm; margin: 0; }' : `@page { size: ${width}mm auto; margin: 2mm; }`}
        .label-preview .labels { display: grid; gap: 10px; justify-content: center; }
        .label-preview .label { zoom: 3; box-shadow: 0 1px 6px rgba(0,0,0,.35); }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .bill-wrap { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .receipt { box-shadow: none !important; margin: 0 !important; }
          .label-preview .labels { display: block !important; }
          .label-preview .label { zoom: 1 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 480, margin: '0 auto 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => window.print()} style={btn(true)}>Print bill</button>
        {editable && <button onClick={() => setEdit((v) => !v)} style={btn()}>{edit ? 'Hide editor' : 'Edit bill'}</button>}
        {btOk && !isLabel && <button onClick={printBluetooth} style={btn()}>Print via Bluetooth</button>}
        <button onClick={copyText} style={btn()}>{copied ? 'Copied ✓' : 'Copy bill text'}</button>
        <a href={`https://wa.me/${waTo}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: 'none' }}>Send on WhatsApp</a>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: '#111' }}>
          Paper
          <select value={paper} onChange={(e) => setPaper(e.target.value)} style={{ padding: 6, color: '#111', background: '#fff' }}>
            <option value="80">80 mm receipt</option>
            <option value="58">58 mm receipt</option>
            <option value="label">50 × 25 mm label</option>
          </select>
        </label>
      </div>

      {msg && <div className="no-print" style={{ maxWidth: 480, margin: '0 auto 10px', fontWeight: 700, fontSize: 13 }}>{msg}</div>}

      {edit && editable && (
        <div className="no-print" style={{ maxWidth: 480, margin: '0 auto 14px', background: '#fff', borderRadius: 10, padding: 14, display: 'grid', gap: 10, border: '1px solid #bbb', color: '#111' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Edit bill <span style={{ fontWeight: 400, fontSize: 12, color: '#555' }}>(the preview below updates as you type)</span></div>

          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 28px', gap: 6, fontSize: 11, color: '#444' }}>
              <span>Item</span><span>Qty</span><span>Rate (Rs)</span><span />
            </div>
            {form.items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 28px', gap: 6 }}>
                <input style={field} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Item name" />
                <input style={field} inputMode="numeric" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
                <input style={field} inputMode="decimal" value={it.rate} onChange={(e) => setItem(i, { rate: e.target.value })} />
                <button onClick={() => set({ items: form.items.filter((_, k) => k !== i) })} style={{ ...btn(), padding: 0 }} aria-label="Remove item">×</button>
              </div>
            ))}
            <button onClick={() => set({ items: [...form.items, { name: '', qty: '1', rate: '0' }] })} style={{ ...btn(), justifySelf: 'start' }}>+ Add item</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <label style={lab}>Discount
              <select style={field} value={form.dtype} onChange={(e) => set({ dtype: e.target.value })}>
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (Rs)</option>
                <option value="none">None</option>
              </select>
            </label>
            <label style={lab}>{form.dtype === 'percent' ? 'Discount %' : 'Discount Rs'}
              <input style={field} inputMode="decimal" value={form.dvalue} onChange={(e) => set({ dvalue: e.target.value })} disabled={form.dtype === 'none'} />
            </label>
            <label style={lab}>Delivery Rs
              <input style={field} inputMode="decimal" value={form.fee} onChange={(e) => set({ fee: e.target.value })} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={lab}>Customer name
              <input style={field} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label style={lab}>Phone
              <input style={field} inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </label>
          </div>
          <label style={lab}>Address
            <textarea style={{ ...field, minHeight: 50 }} value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={lab}>Payment line on bill
              <select style={field} value={PAY_CHOICES.includes(form.pay) ? form.pay : '__custom'} onChange={(e) => set({ pay: e.target.value === '__custom' ? 'Custom' : e.target.value })}>
                <option value="">Automatic</option>
                {PAY_CHOICES.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="__custom">Type my own...</option>
              </select>
            </label>
            <label style={lab}>Message at the bottom
              <input style={field} value={form.note} maxLength={120} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Thank you, enjoy!" />
            </label>
          </div>
          {!PAY_CHOICES.includes(form.pay) && (
            <input style={field} value={form.pay} maxLength={60} onChange={(e) => set({ pay: e.target.value })} placeholder="Type the payment line to print" />
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 15 }}>Total {rs(model.total)}</b>
            <span style={{ flex: 1 }} />
            <button onClick={() => { setForm(toForm(o)); setMsg(''); }} style={btn()}>Undo changes</button>
            <button onClick={() => save(false)} disabled={saving} style={btn()}>{saving ? 'Saving...' : 'Save bill'}</button>
            <button onClick={() => save(true)} disabled={saving} style={btn(true)}>Save &amp; print</button>
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            Saving updates the order total shown on the order board. The plate count in stock is not changed by editing the bill.
          </div>
        </div>
      )}

      {!edit && (
        <div className="no-print" style={{ maxWidth: 480, margin: '0 auto 12px', fontSize: 12, color: '#333', lineHeight: 1.5 }}>
          <b>Which button?</b> <b>Print bill</b> works with any printer: on Android choose your printer or the RawBT app in the print menu.
          <b> Print via Bluetooth</b> connects straight to Bluetooth LE receipt printers only (Chrome). <b>Copy bill text</b> lets you paste the bill into your billing app.
          For a <b>50 × 25 mm label printer</b> choose that paper size: it prints a bill label and an address label (more labels if the address is long).
        </div>
      )}

      {isLabel ? (
        <div className="label-preview"><Labels m={model} /></div>
      ) : (
        <Receipt m={model} width={width} />
      )}
    </div>
  );
}

export default function BillPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading...</p>}>
      <Bill />
    </Suspense>
  );
}
