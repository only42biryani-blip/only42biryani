'use client';

import { PHONE, AREA, FSSAI_LICENSE, GSTIN, LEGAL_NAME, SITE_URL, INSTAGRAM_PROFILE_URL } from '@/lib/config';
import { rs } from '@/lib/bill';

// The printed bill. `m` is the model from billModel() in lib/bill.js (so the preview, the print and the text
// version always agree). Used by the admin bill page.

const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
const phoneOf = (p) => String(p || '').replace(/^91/, '');
const handle = INSTAGRAM_PROFILE_URL ? INSTAGRAM_PROFILE_URL.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '') : '';

// Plain-text version for pasting into another billing app, WhatsApp, or a text printer.
export function textBill(m, cols = 42) {
  const line = '-'.repeat(cols);
  const center = (t) => ' '.repeat(Math.max(0, Math.floor((cols - t.length) / 2))) + t;
  const lr = (l, r) => l + ' '.repeat(Math.max(1, cols - l.length - String(r).length)) + r;
  const out = [center('ONLY42BIRYANI'), center('Single-batch chicken dum biryani')];
  if (LEGAL_NAME) out.push(center(LEGAL_NAME));
  if (AREA) out.push(center(AREA));
  if (PHONE) out.push(center(`Ph: ${PHONE}`));
  if (FSSAI_LICENSE) out.push(center(`FSSAI: ${FSSAI_LICENSE}`));
  if (GSTIN) out.push(center(`GSTIN: ${GSTIN}`));
  out.push(line, lr('Bill no:', m.code), lr('Date:', when(m.createdAt)), line);
  out.push(`Customer: ${m.customer.name}`, `Phone: ${phoneOf(m.customer.phone)}`, `Address: ${m.customer.address}`);
  out.push(line, lr('Item', 'Amount'));
  for (const it of m.items) out.push(it.name, lr(`  ${it.qty} x ${rs(it.rate)}`, rs(it.qty * it.rate)));
  if (m.discountAmount > 0) out.push(lr(m.discountLabel, `- ${rs(m.discountAmount)}`));
  out.push(lr('Delivery', m.fee === 0 ? 'Free' : rs(m.fee)), line, lr('TOTAL', rs(m.total)), line, m.payment);
  if (m.discountAmount > 0) out.push(`You saved ${rs(m.discountAmount)}!`);
  if (m.note) out.push(m.note);
  out.push(line, center('Thank you! Order again'), center(SITE_URL.replace('https://', '')));
  return out.join('\n');
}

export default function Receipt({ m, width = 80 }) {
  const mm = width === 58 ? 50 : 72; // printable width
  const row = { display: 'flex', justifyContent: 'space-between', gap: 8 };
  const rule = { borderTop: '1px dashed #000', margin: '6px 0' };
  return (
    <div className="receipt" style={{
      width: `${mm}mm`, margin: '0 auto', background: '#fff', color: '#000', padding: '4mm 3mm',
      fontFamily: '"Courier New", ui-monospace, monospace', fontSize: width === 58 ? 11 : 12.5, lineHeight: 1.35,
      boxShadow: '0 2px 10px rgba(0,0,0,.25)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: width === 58 ? 16 : 20, fontWeight: 800, letterSpacing: 1 }}>ONLY42BIRYANI</div>
        <div>Single-batch chicken dum biryani</div>
        {LEGAL_NAME && <div style={{ fontSize: 11 }}>{LEGAL_NAME}</div>}
        {AREA && <div>{AREA}</div>}
        {PHONE && <div>Ph: {PHONE}</div>}
        {FSSAI_LICENSE && <div>FSSAI Lic. No. {FSSAI_LICENSE}</div>}
        {GSTIN && <div>GSTIN: {GSTIN}</div>}
      </div>

      <div style={rule} />
      <div style={row}><span>Bill no</span><b>{m.code}</b></div>
      <div style={row}><span>Date</span><span>{when(m.createdAt)}</span></div>
      <div style={rule} />
      <div><b>{m.customer.name}</b> · {phoneOf(m.customer.phone)}</div>
      <div style={{ wordBreak: 'break-word' }}>{m.customer.address}</div>
      {m.orderNote && <div style={{ fontSize: 11 }}>Note: {m.orderNote}</div>}

      <div style={rule} />
      <div style={{ ...row, fontWeight: 700 }}><span>Item</span><span>Amount</span></div>
      {m.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <div style={{ wordBreak: 'break-word' }}>{it.name}</div>
          <div style={row}><span>&nbsp;&nbsp;{it.qty} x {rs(it.rate)}</span><span>{rs(it.qty * it.rate)}</span></div>
        </div>
      ))}
      {m.discountAmount > 0 && <div style={row}><span>{m.discountLabel}</span><span>- {rs(m.discountAmount)}</span></div>}
      <div style={row}><span>Delivery</span><span>{m.fee === 0 ? 'Free' : rs(m.fee)}</span></div>

      <div style={rule} />
      <div style={{ ...row, fontSize: width === 58 ? 15 : 18, fontWeight: 800 }}><span>TOTAL</span><span>{rs(m.total)}</span></div>
      <div style={rule} />
      <div style={{ textAlign: 'center', fontWeight: 700 }}>{m.payment}</div>
      {m.discountAmount > 0 && <div style={{ textAlign: 'center' }}>You saved {rs(m.discountAmount)}!</div>}
      {m.note && <div style={{ textAlign: 'center', marginTop: 2 }}>{m.note}</div>}

      <div style={rule} />
      <div style={{ textAlign: 'center' }}>
        <div>Thank you! Order again:</div>
        <div>{SITE_URL.replace('https://', '')}</div>
        {handle && <div>Instagram {handle}</div>}
      </div>
    </div>
  );
}

// ---- 50 x 25 mm label printers -------------------------------------------------------------------------------
// A 50 x 25 mm label is far too small for a full receipt, so the bill is split into small labels:
//   label 1 = the bill (items, offer, total, how to pay)    label 2 (and 3...) = delivery address, to stick on the bag.
// Each label is exactly one printed page (the page size is set to 50 x 25 mm by the bill page).
const LABEL = {
  width: '50mm', height: '25mm', boxSizing: 'border-box', padding: '1mm 1.4mm', overflow: 'hidden', background: '#fff', color: '#000',
  fontFamily: '"Courier New", ui-monospace, monospace', fontSize: '6.3pt', lineHeight: 1.1, pageBreakAfter: 'always', breakAfter: 'page',
};

// Split a long address into chunks that each fit one label.
export function chunkAddress(text, size = 170) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > size && cur) { chunks.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [''];
}

export function Labels({ m }) {
  const plates = m.items.reduce((n, it) => n + it.qty, 0);
  const itemsText = m.items.map((it) => `${it.qty} x ${it.name}`).join(', ');
  const itemsShort = itemsText.length > 58 ? `${itemsText.slice(0, 55)}...` : itemsText;
  const addr = chunkAddress(m.customer.address);
  const collect = /^PAID/i.test(m.payment) ? m.payment : `COLLECT ${rs(m.total)}`;
  const row = { display: 'flex', justifyContent: 'space-between', gap: 4 };
  return (
    <div className="labels">
      <div className="label" style={LABEL}>
        <div style={{ ...row, fontWeight: 800 }}><span>ONLY42BIRYANI</span><span>{m.code}</span></div>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{m.customer.name} {phoneOf(m.customer.phone)}</div>
        <div style={{ overflow: 'hidden', maxHeight: '2.2em' }}>{itemsShort}</div>
        <div style={row}>
          <span>{m.discountAmount > 0 ? `${m.discountType === 'percent' ? `${m.discountValue}% OFF` : 'Discount'} -${rs(m.discountAmount)}` : ''}</span>
          <span>Delivery {m.fee === 0 ? 'Free' : rs(m.fee)}</span>
        </div>
        <div style={{ ...row, fontWeight: 800, fontSize: '8.5pt', lineHeight: 1.05, borderTop: '0.3mm solid #000', marginTop: '0.4mm', paddingTop: '0.3mm' }}><span>TOTAL</span><span>{rs(m.total)}</span></div>
        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>{m.payment}</div>
      </div>
      {addr.map((chunk, i) => (
        <div className="label" key={i} style={LABEL}>
          <div style={{ ...row, fontWeight: 800 }}><span>{m.code}{addr.length > 1 ? ` (${i + 1}/${addr.length})` : ''}</span><span>{plates} plate{plates > 1 ? 's' : ''}</span></div>
          {i === 0 && <div style={{ fontWeight: 800 }}>{m.customer.name} {phoneOf(m.customer.phone)}</div>}
          <div style={{ wordBreak: 'break-word', fontSize: '7pt' }}>{chunk}</div>
          {i === addr.length - 1 && <div style={{ fontWeight: 800, marginTop: '0.4mm' }}>{collect}</div>}
        </div>
      ))}
    </div>
  );
}
