import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_NAME } from '@/lib/config';

export const metadata = {
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
  description: 'The terms for ordering chicken dum biryani from Only42Biryani.',
};

const sections = [
  { title: "Who we are", body: "Only42Biryani is a single-product chicken dum biryani kitchen in Hyderabad, India. These terms apply when you order directly from only42biryani.com." },
  { title: "Our food and plate limit", body: "We cook one fresh batch of 42 plates a day. When the plates are gone we stop taking orders for that day. We may refuse or cancel an order if we cannot make it, and we will refund you in full if we do." },
  { title: "Prices and payment", body: "The price of the biryani and the delivery charge are shown before you pay, and the total you see at payment is the total you are charged. Payments are processed online by Razorpay. We do not see or store your card, UPI or bank details." },
  { title: "Holding your plates", body: "When you start an order we hold your plates for 10 minutes so they are not sold to someone else. If the payment is not completed in that time, the hold is released." },
  { title: "Your details", body: "You must give a correct name, mobile number and delivery address. We use them only to make and deliver your order and to contact you about it. See our privacy policy for details." },
  { title: "Allergies and food safety", body: "Tell us before you order if you have a food allergy. Our food is prepared in a kitchen that handles common allergens, so we cannot guarantee that any dish is free of them." },
  { title: "Changes to these terms", body: "We may update these terms. The version on this page when you place your order is the one that applies to it." },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[760px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">
          ← Back to Only42Biryani
        </Link>

        <h1 className="font-grotesk text-4xl md:text-5xl font-bold uppercase tracking-tight mt-8 mb-2">Terms of service</h1>
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
