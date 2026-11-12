'use client';

import Link from 'next/link';
import { useStatus } from './StatusProvider';
import { ZOMATO_URL, OFFER } from '@/lib/config';

// Always-visible action button on phones, where most visitors arrive from Instagram.
export default function StickyCta() {
  const { launched, remaining, directOrdering, prebook, nextBooking, offerPercent } = useStatus();
  const offerPct = offerPercent ?? OFFER?.percent ?? 0; // as set in the admin
  const soldOut = launched && remaining !== null && remaining <= 0;

  const base = 'block w-full text-center rounded-full font-bold text-sm tracking-wide py-4';

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-[1500] p-3 bg-gradient-to-t from-[#0c0906] via-[#0c0906]/90 to-transparent">
      {directOrdering && !soldOut ? (
        <Link href="/order" className={`${base} bg-accent text-black shadow-[0_8px_30px_rgba(212,255,63,0.3)]`}>
          Order now{offerPct ? ` · ${offerPct}% OFF` : ''}{remaining !== null ? ` · ${remaining} left` : ''}
        </Link>
      ) : launched && prebook ? (
        <Link href="/order" className={`${base} bg-accent text-black shadow-[0_8px_30px_rgba(212,255,63,0.3)]`}>
          Pre-book for {nextBooking?.word === 'today' ? 'today' : 'tomorrow'}{offerPct ? ` · ${offerPct}% OFF` : ''}
        </Link>
      ) : launched && !soldOut && ZOMATO_URL ? (
        <a href={ZOMATO_URL} target="_blank" rel="noopener noreferrer"
          className={`${base} bg-accent text-black shadow-[0_8px_30px_rgba(212,255,63,0.3)]`}>
          Order on Zomato{remaining !== null ? ` · ${remaining} left` : ''}
        </a>
      ) : (
        <a href="#terminal" className={`${base} bg-accent text-black shadow-[0_8px_30px_rgba(212,255,63,0.3)]`}>
          {soldOut ? 'Sold out · get tomorrow’s alert' : 'Join the waitlist'}
        </a>
      )}
    </div>
  );
}
