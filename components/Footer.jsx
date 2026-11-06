import Image from 'next/image';
import Link from 'next/link';
import {
  ZOMATO_URL,
  SWIGGY_URL,
  INSTAGRAM_PROFILE_URL,
  INSTAGRAM_REEL_URL,
  WHATSAPP_NUMBER,
  PHONE,
  AREA,
  FSSAI_LICENSE,
  CONTACT_EMAIL,
} from '@/lib/config';

const links = [
  { label: 'Instagram', url: INSTAGRAM_PROFILE_URL || INSTAGRAM_REEL_URL },
  { label: 'WhatsApp', url: WHATSAPP_NUMBER && `https://wa.me/${WHATSAPP_NUMBER}` },
  { label: 'Zomato', url: ZOMATO_URL },
  { label: 'Swiggy', url: SWIGGY_URL },
].filter((l) => l.url);

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-12 pt-12 pb-28 md:pb-16">
      <div className="max-w-[1400px] mx-auto px-6 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image src="/images/favicon.png" alt="" width={40} height={40} />
            <span className="font-grotesk font-extrabold tracking-wide text-[#F5F1E8]">
              ONLY<span className="text-accent">42</span>BIRYANI
            </span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            Single-batch chicken dum biryani. Only 42 plates daily.
          </p>
        </div>

        <div className="text-sm text-white/60 space-y-2">
          <div className="text-white font-bold mb-3">Find us</div>
          <p>{AREA || 'Hyderabad'}</p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-saffron">{CONTACT_EMAIL}</a>
          </p>
          {PHONE && (
            <p>
              <a href={`tel:${PHONE}`} className="hover:text-saffron">{PHONE}</a>
            </p>
          )}
          {FSSAI_LICENSE && <p>FSSAI Lic. No. {FSSAI_LICENSE}</p>}
        </div>

        <div className="text-sm">
          <div className="text-white font-bold mb-3">Follow &amp; order</div>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-saffron transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="max-w-[1400px] mx-auto px-6 mt-10 text-xs text-white/30">
        © 2026 Only42Biryani, Hyderabad ·{' '}
        <Link href="/privacy" className="hover:text-saffron">Privacy policy</Link>
      </p>
    </footer>
  );
}
