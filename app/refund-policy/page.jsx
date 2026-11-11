import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_NAME } from '@/lib/config';

export const metadata = {
  title: 'Refund and Cancellation Policy',
  alternates: { canonical: '/refund-policy' },
  description: 'When you can cancel an Only42Biryani order and how refunds work.',
};

const sections = [
  { title: "If we cancel", body: "If we cannot make or deliver your order, we will cancel it and refund the full amount you paid, including delivery." },
  { title: "If you want to cancel", body: "Contact us as soon as possible. We can cancel and refund an order before it has been packed and handed to the delivery rider. Once the food has been packed and handed over, we cannot cancel it." },
  { title: "If something is wrong with your order", body: "If your order arrives wrong, damaged or does not arrive, contact us within 2 hours of delivery with your order code. We will look into it and, where it is our fault, refund or replace the order." },
  { title: "How refunds are paid", body: "Refunds go back to the same payment method you used. They usually reach your account in 5 to 7 working days, depending on your bank." },
  { title: "Unpaid orders", body: "If a payment is not completed, nothing is charged and the plates are released after 10 minutes. If money was deducted but the order did not confirm, it is refunded automatically." },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[760px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">
          ← Back to Only42Biryani
        </Link>

        <h1 className="font-grotesk text-4xl md:text-5xl font-bold uppercase tracking-tight mt-8 mb-2">Refund and cancellation policy</h1>
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
