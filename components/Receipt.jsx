'use client';

import { PHONE, AREA, FSSAI_LICENSE, GSTIN, LEGAL_NAME, SITE_URL, INSTAGRAM_PROFILE_URL, OFFER } from '@/lib/config';

// The printed bill. Used by the admin bill page (and easy to restyle in one place).
const rs = (n) => `Rs ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0 })}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
const phoneOf = (p) => String(p || '').replace(/^91/, '');
const handle = INSTAGRAM_PROFILE_URL ? INSTAGRAM_PROFILE_URL.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '') : '';

// "Launch offer: 50% OFF" when it is the standing offer, otherwise a plain "NN% discount" (for a custom discount).
export function offerText(pct) {
  return Number(pct) === Number(OFFER?.percent) && OFFER?.label ? OFFER.label : `${pct}% discount`;
}

export function figures(o) {
  const qty = Number(o.qty);
  const mrp = Number(o.mrp) > 0 ? Number(o.mrp) : Number(o.plate_price);
  const subtotal = qty * mrp;
  const discount = Number(o.discount_amount) || 0;
  const fee = Number(o.delivery_fee) || 0;
  return { qty, mrp, subtotal, discount, fee, total: Number(o.total), pct: Number(o.discount_percent) || 0 };
}

export function paymentLine(o) {
  if (o.payment_mode === 'cod') return o.paid_by ? `PAID - ${o.paid_by.toUpperCase()} on delivery` : 'TO PAY on delivery (cash / UPI)';
  return 'PAID online';
}

// Plain-text version for pasting into another billing app or printing through a text printer app.
export function textBill(o, cols = 42) {
  const f = figures(o);
  const line = '-'.repeat(cols);
  const center = (t) => ' '.repeat(Math.max(0, Math.floor((cols - t.length) / 2))) + t;
  const lr = (l, r) => l + ' '.repeat(Math.max(1, cols - l.length - String(r).length)) + r;
  const out = [center('ONLY42BIRYANI'), center('Single-batch chicken dum biryani')];
  if (LEGAL_NAME) out.push(center(LEGAL_NAME));
  if (AREA) out.push(center(AREA));
  if (PHONE) out.push(center(`Ph: ${PHONE}`));
  if (FSSAI_LICENSE) out.push(center(`FSSAI: ${FSSAI_LICENSE}`));
  if (GSTIN) out.push(center(`GSTIN: ${GSTIN}`));
  out.push(line, lr('Bill no:', o.code), lr('Date:', when(o.created_at)), line);
  out.push(`Customer: ${o.customer_name}`, `Phone: ${phoneOf(o.customer_phone)}`);
  out.push(`Address: ${o.address}`);
  out.push(line, lr(`Chicken Dum Biryani x ${f.qty}`, ''), lr(`  @ ${rs(f.mrp)}`, rs(f.subtotal)));
  if (f.discount > 0) out.push(lr(offerText(f.pct), `- ${rs(f.discount)}`));
  out.push(lr('Delivery', f.fee === 0 ? 'Free' : rs(f.fee)), line, lr('TOTAL', rs(f.total)), line, paymentLine(o));
  if (f.discount > 0) out.push(`You saved ${rs(f.discount)}!`);
  out.push(line, center('Thank you! Order again'), center(SITE_URL.replace('https://', '')));
  return out.join('\n');
}



export default function Receipt({ o, width = 80 }) {
  const f = figures(o);
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
          <div style={row}><span>Bill no</span><b>{o.code}</b></div>
          <div style={row}><span>Date</span><span>{when(o.created_at)}</span></div>
          <div style={rule} />
          <div><b>{o.customer_name}</b> · {phoneOf(o.customer_phone)}</div>
          <div style={{ wordBreak: 'break-word' }}>{o.address}</div>
          {o.note && <div style={{ fontSize: 11 }}>Note: {o.note}</div>}

          <div style={rule} />
          <div style={{ ...row, fontWeight: 700 }}><span>Item</span><span>Amount</span></div>
          <div style={row}><span>Chicken Dum Biryani</span><span /></div>
          <div style={row}><span>&nbsp;&nbsp;{f.qty} x {rs(f.mrp)}</span><span>{rs(f.subtotal)}</span></div>
          {f.discount > 0 && <div style={row}><span>{offerText(f.pct)}</span><span>- {rs(f.discount)}</span></div>}
          <div style={row}><span>Delivery</span><span>{f.fee === 0 ? 'Free' : rs(f.fee)}</span></div>

          <div style={rule} />
          <div style={{ ...row, fontSize: width === 58 ? 15 : 18, fontWeight: 800 }}><span>TOTAL</span><span>{rs(f.total)}</span></div>
          <div style={rule} />
          <div style={{ textAlign: 'center', fontWeight: 700 }}>{paymentLine(o)}</div>
          {f.discount > 0 && <div style={{ textAlign: 'center' }}>You saved {rs(f.discount)}!</div>}

          <div style={rule} />
          <div style={{ textAlign: 'center' }}>
            <div>Thank you! Order again:</div>
            <div>{SITE_URL.replace('https://', '')}</div>
            {handle && <div>Instagram {handle}</div>}
          </div>
        </div>
  );
}
