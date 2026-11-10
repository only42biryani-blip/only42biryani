import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/config';

export const metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
  description: 'How Only42Biryani collects and uses your details when you join the waitlist.',
};

const sections = [
  {
    title: 'Who we are',
    body: 'Only42Biryani is a single-product chicken dum biryani kitchen in Hyderabad, India. This page explains what we do with the details you give us on only42biryani.com.',
  },
  {
    title: 'What we collect',
    body: 'When you join the waitlist we collect your name, mobile number and email address. If you arrive through a tagged link (for example from Instagram) we also note which link it was. When you join, we record that you agreed to the notice shown under the form (launch updates and daily drop alerts by WhatsApp, SMS and email) and when. Reply STOP to any message to opt out.',
  },
  {
    title: 'Why we collect it',
    body: 'To tell you when our daily batch of 42 plates goes live, and to send launch updates and occasional offers on WhatsApp, SMS and email. We do not use your details for anything unrelated to Only42Biryani.',
  },
  {
    title: 'Who can see it',
    body: 'Only the Only42Biryani team can read the waitlist. We do not sell or rent your details. Your data is stored with our database provider (Supabase) and the site is hosted by Vercel; both process it only to run the service. If you order through Zomato or Swiggy, those platforms handle your order under their own privacy policies.',
  },
  {
    title: 'How long we keep it',
    body: 'Until you ask us to remove it, or until we stop running the waitlist.',
  },
  {
    title: 'Your choices',
    body: `You can opt out of messages at any time, and you can ask to see, correct or delete your details, by emailing ${CONTACT_EMAIL} from the address you signed up with or by replying STOP to any message. We will act on the request promptly.`,
  },
  {
    title: 'Cookies and tracking',
    body: 'The public pages do not set tracking cookies and we do not currently run analytics. If that changes we will update this page.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[760px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">
          ← Back to Only42Biryani
        </Link>

        <h1 className="font-grotesk text-4xl md:text-5xl font-bold uppercase tracking-tight mt-8 mb-2">Privacy policy</h1>
        <p className="text-white/40 text-sm mb-12">Last updated 5 November 2026</p>

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
