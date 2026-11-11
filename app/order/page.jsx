import Link from 'next/link';
import Image from 'next/image';
import OrderForm from '@/components/OrderForm';
import { getStatus } from '@/lib/status';
import { orderingBlocker, plateConfig, isOpenNow } from '@/lib/orders';
import { kitchenOnline } from '@/lib/kitchen';
import { paymentOptions, onlineAllowed } from '@/lib/payment';
import { deliveryRules } from '@/lib/deliveryRules';
import { prebookEnabled, prebookDates } from '@/lib/prebook';
import { OFFER, PLATE, AREA } from '@/lib/config';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order chicken dum biryani',
  description: 'Order Only42Biryani Hyderabadi chicken dum biryani for delivery in Hyderabad. Only 42 plates a day.',
  alternates: { canonical: '/order' },
};

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function Closed({ children }) {
  return (
    <div className="hud-box p-8 text-center">
      <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8] mb-2">{children}</h2>
      <p className="text-white/60 text-sm">You can already order on Zomato, or join the waitlist to hear about each drop.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/#terminal" className="rounded-full bg-accent text-black font-bold text-sm px-7 py-4">Join the waitlist</Link>
        <Link href="/" className="rounded-full border border-white/25 text-white font-semibold text-sm px-7 py-4 hover:border-saffron hover:text-saffron">Back to home</Link>
      </div>
    </div>
  );
}

const FACTS = [
  ['Chicken', 'Fresh boneless chicken breast (Sneha chicken)'],
  ['Rice', 'Medium-grain rice'],
  ['Cooked', 'Slow dum in a sealed handi, fresh every day'],
  ['Packed in', 'Sugarcane bagasse box'],
];

const STEPS = [
  ['Choose and share location', 'Pick your plates, add your name, phone and address. Sharing your live location makes delivery easier.'],
  ['We confirm your order', 'We check your order and may call or WhatsApp you to confirm.'],
  ['Cooked fresh, then delivered', 'Your plate comes from the single batch of 42 for the day, packed and sent to you.'],
  ['Pay', 'Pay cash or UPI when it arrives, or pay online if that option is shown.'],
];

export default async function OrderPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const blocked = orderingBlocker();
  const cfg = plateConfig();
  const open = isOpenNow();
  const status = blocked ? null : await getStatus();
  const online = blocked ? true : await kitchenOnline();
  const pay = blocked ? { cod: false, online: 'off' } : await paymentOptions();
  const token = typeof sp.t === 'string' ? sp.t : '';
  const canPayOnline = onlineAllowed(pay, token);
  const rules = await deliveryRules();
  const prebookOn = blocked ? false : await prebookEnabled();
  const soldOutToday = status?.remaining !== null && status?.remaining !== undefined && status.remaining <= 0;
  // Offline, closed or sold out today: offer to pre-book (cash / UPI on delivery) for the next day.
  const prebookMode = prebookOn && pay.cod && (!online || !open || soldOutToday);
  const dates = prebookMode ? prebookDates() : null;

  const net = cfg.price ? Math.round(cfg.price * (1 - cfg.offerPercent / 100)) : null;
  const maxFee = rules.maxFee;
  const delivery = maxFee === null || maxFee === undefined
    ? (cfg.selfFee > 0 ? `${rupees(cfg.selfFee)} delivery` : 'Delivery charge shown before you order')
    : `Delivery from free up to ${rupees(maxFee)}, depending on distance. Never more than ${rupees(maxFee)}.`;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-12 md:py-16 font-inter">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">← Back to Only42Biryani</Link>
        <h1 className="font-grotesk text-4xl md:text-5xl font-extrabold tracking-tight mt-6 mb-2 text-[#F5F1E8]">Order your biryani</h1>
        <p className="text-white/60 text-sm mb-4">Direct from the Only42Biryani kitchen. One dish, one batch, 42 plates a day.</p>
        <a href="#place-order" className="lg:hidden inline-block mb-6 rounded-full bg-accent text-black font-bold text-sm px-6 py-3">Go to the order form ↓</a>
        <div className="mb-8 hidden lg:block" />

        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 items-start">
          {/* What you are ordering */}
          <section aria-label="The product" className="grid gap-5 lg:sticky lg:top-6">
            <div className="hud-box overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image src="/images/biryani-box-and-bag-2.jpg" alt="Takeaway box of Hyderabadi chicken dum biryani with fried onions and mint, beside raita and an Only42Biryani paper bag"
                  fill priority sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" style={{ objectPosition: '50% 55%' }} />
              </div>
              <div className="p-6">
                <div className="text-saffron text-xs font-semibold tracking-[3px] uppercase">The only item on the menu</div>
                <h2 className="font-grotesk text-2xl font-extrabold text-[#F5F1E8] mt-1">Hyderabadi chicken dum biryani</h2>
                <div className="mt-3 flex flex-wrap items-baseline gap-3">
                  {cfg.offerPercent > 0 && cfg.price && <span className="text-lg text-white/40 line-through">{rupees(cfg.price)}</span>}
                  <span className="font-grotesk text-3xl font-extrabold text-[#F5F1E8]">{net ? rupees(net) : PLATE.price}</span>
                  <span className="text-sm text-white/50">per plate</span>
                  {cfg.offerPercent > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-accent text-black">{OFFER.label}</span>}
                </div>
                <dl className="mt-5 grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-sm">
                  {FACTS.map(([k, v]) => (
                    <div key={k} className="contents"><dt className="text-white/45">{k}</dt><dd className="text-white/85">{v}</dd></div>
                  ))}
                  {PLATE.portion && <div className="contents"><dt className="text-white/45">Portion</dt><dd className="text-white/85">{PLATE.portion}</dd></div>}
                  {PLATE.spice && <div className="contents"><dt className="text-white/45">Spice</dt><dd className="text-white/85">{PLATE.spice}</dd></div>}
                </dl>
              </div>
            </div>

            <div className="hud-box p-6 grid gap-3 text-sm">
              <h3 className="font-grotesk text-lg font-bold text-[#F5F1E8]">Delivery and payment</h3>
              <p className="text-white/70"><b className="text-white">Where:</b> Hyderabad. Our kitchen is {AREA.replace(/^Near /, 'near ')}.</p>
              <p className="text-white/70"><b className="text-white">Delivery:</b> {delivery}</p>
              <p className="text-white/70"><b className="text-white">When:</b> {cfg.hours ? `Ordering hours ${cfg.hours} (IST), while plates last.` : 'While the kitchen is online and plates last.'}</p>
              <p className="text-white/70"><b className="text-white">Pay:</b> {pay.cod ? 'cash or UPI when your order arrives' : 'online'}{canPayOnline && pay.cod ? ', or pay online now' : ''}.</p>
              <p className="text-[11px] text-white/45">If we cannot deliver to you, we will tell you and refund any online payment in full. See our <Link href="/delivery-policy" className="underline">Delivery policy</Link> and <Link href="/refund-policy" className="underline">Refund policy</Link>.</p>
            </div>

            <div className="hud-box p-6">
              <h3 className="font-grotesk text-lg font-bold text-[#F5F1E8] mb-4">How it works</h3>
              <ol className="grid gap-4">
                {STEPS.map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full border border-accent text-accent text-sm font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm"><b className="text-[#F5F1E8]">{title}</b><span className="block text-white/60 text-xs leading-relaxed mt-0.5">{body}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* The order form */}
          <section id="place-order" aria-label="Place your order" className="scroll-mt-6">
            {blocked ? (
              <Closed>Online ordering opens soon</Closed>
            ) : prebookMode ? (
              <OrderForm price={cfg.price} maxQty={cfg.maxQty} remaining={null} hoursText={cfg.hours}
                cod online={false} testToken="" prebook={dates} reason={!online ? 'offline' : soldOutToday ? 'soldout' : 'closed'}
                offerPercent={cfg.offerPercent} selfFee={cfg.selfFee} />
            ) : !online ? (
              <Closed>The kitchen is offline right now</Closed>
            ) : !open ? (
              <Closed>We are closed right now{cfg.hours ? ` (hours ${cfg.hours} IST)` : ''}</Closed>
            ) : !pay.cod && !canPayOnline ? (
              <Closed>Ordering is paused for now</Closed>
            ) : (
              <OrderForm price={cfg.price} maxQty={cfg.maxQty} remaining={status?.remaining ?? null} hoursText={cfg.hours}
                cod={pay.cod} online={canPayOnline} testToken={canPayOnline && pay.online === 'test' ? token : ''}
                offerPercent={cfg.offerPercent} selfFee={cfg.selfFee} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
