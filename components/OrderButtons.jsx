'use client';

import { useStatus } from './StatusProvider';
import { ZOMATO_URL, SWIGGY_URL } from '@/lib/config';

const platforms = [
  { name: 'Zomato', url: ZOMATO_URL },
  { name: 'Swiggy', url: SWIGGY_URL },
].filter((p) => p.url);

export default function OrderButtons({ className = '' }) {
  const { launched, remaining } = useStatus();
  const soldOut = launched && remaining !== null && remaining <= 0;

  if (platforms.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {platforms.map((p) =>
        !launched || soldOut ? (
          <span
            key={p.name}
            aria-disabled="true"
            className="border border-white/15 bg-white/[0.03] text-white/40 font-mono font-bold text-xs px-6 py-4 tracking-widest uppercase cursor-not-allowed"
          >
            {p.name} · {soldOut ? 'Sold out today' : 'Launching soon'}
          </span>
        ) : (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-black border border-accent font-mono font-bold text-xs sm:text-sm px-7 py-4 tracking-widest uppercase
              shadow-[0_0_30px_rgba(212,255,63,0.35)] hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all"
          >
            Order on {p.name}
          </a>
        )
      )}
    </div>
  );
}
