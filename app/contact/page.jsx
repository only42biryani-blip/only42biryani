import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_NAME, AREA, FSSAI_LICENSE, INSTAGRAM_PROFILE_URL } from '@/lib/config';
import ContactRequestForm from '@/components/ContactRequestForm';

export const metadata = {
  title: 'Contact us',
  alternates: { canonical: '/contact' },
  description: 'How to contact Only42Biryani in Hyderabad about an order, a delivery or anything else.',
};

// Only details that are filled in lib/config.js are shown, so nothing here is made up.
export default function ContactPage() {
  const rows = [
    ['Brand', 'Only42Biryani'],
    LEGAL_NAME && ['Operated by', LEGAL_NAME],
    ['Email', <a key="e" href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>],
    ['Area', AREA || 'Hyderabad, Telangana, India'],
    FSSAI_LICENSE && ['FSSAI licence no.', FSSAI_LICENSE],
    INSTAGRAM_PROFILE_URL && ['Instagram', <a key="i" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@only42biryani</a>],
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[760px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">
          ← Back to Only42Biryani
        </Link>
        <h1 className="font-grotesk text-4xl md:text-5xl font-bold uppercase tracking-tight mt-8 mb-10">Contact us</h1>
        <p className="text-white/70 leading-relaxed mb-8">
          Questions about an order, a delivery or a refund? Email us with your order code and we will get back to you. If it is urgent, use the form below and we will call or WhatsApp you.
        </p>
        <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-white/50">{k}</dt>
              <dd className="text-white/90 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10">
          <ContactRequestForm />
        </div>
      </div>
    </main>
  );
}
