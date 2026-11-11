import Link from 'next/link';
import OrderForm from '@/components/OrderForm';
import { getStatus } from '@/lib/status';
import { orderingBlocker, plateConfig, isOpenNow, orderMode } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order chicken dum biryani',
  description: 'Order Only42Biryani chicken dum biryani for delivery in Hyderabad. Only 42 plates a day.',
  alternates: { canonical: '/order' },
};

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

export default async function OrderPage() {
  const blocked = orderingBlocker();
  const cfg = plateConfig();
  const open = isOpenNow();
  const status = blocked ? null : await getStatus();

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16 font-inter">
      <div className="max-w-[560px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">← Back to Only42Biryani</Link>
        <h1 className="font-grotesk text-4xl md:text-5xl font-extrabold tracking-tight mt-8 mb-8 text-[#F5F1E8]">Order direct</h1>
        {blocked ? (
          <Closed>Online ordering opens soon</Closed>
        ) : !open ? (
          <Closed>We are closed right now{cfg.hours ? ` (hours ${cfg.hours} IST)` : ''}</Closed>
        ) : (
          <OrderForm price={cfg.price} maxQty={cfg.maxQty} remaining={status?.remaining ?? null} hoursText={cfg.hours}
            mode={orderMode()} offerPercent={cfg.offerPercent} selfFee={cfg.selfFee} />
        )}
      </div>
    </main>
  );
}
