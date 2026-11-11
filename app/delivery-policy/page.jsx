import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_NAME } from '@/lib/config';

export const metadata = {
  title: 'Delivery Policy',
  alternates: { canonical: '/delivery-policy' },
  description: 'Where and how Only42Biryani delivers in Hyderabad.',
};

const sections = [
  { title: "Where we deliver", body: "We deliver within a limited area of Hyderabad. If your address is outside it, the order page tells you before you pay." },
  { title: "Delivery charge", body: "The delivery charge depends on the distance and is shown before you pay. It is added to the price of the biryani." },
  { title: "How it is delivered", body: "Your biryani is packed fresh and handed to a delivery rider from a delivery partner. You get a tracking link on your order page once the rider is assigned." },
  { title: "Delivery time", body: "We aim to deliver as quickly as possible. The time depends on how far you are, traffic and weather, so it is an estimate and not a guarantee." },
  { title: "Being reachable", body: "Please keep your phone on. The rider may call you to find your address. If we cannot reach you or find your address, contact us so we can try to sort it out." },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[760px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">
          ← Back to Only42Biryani
        </Link>

        <h1 className="font-grotesk text-4xl md:text-5xl font-bold uppercase tracking-tight mt-8 mb-2">Delivery policy</h1>
        <p className="text-white/40 text-sm mb-12">Last updated 10 November 2026</p>
        {LEGAL_NAME && (
          <p className="text-white/50 text-sm -mt-8 mb-12">Only42Biryani is a brand of {LEGAL_NAME}.</p>
        )}

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-grotesk text-xl font-bold mb-3">{s.title}</h2>
              <p className="text-white/70 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="text-white/50 text-sm mt-12">
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
