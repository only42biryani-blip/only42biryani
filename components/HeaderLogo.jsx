'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useStatus } from './StatusProvider';
import { TOTAL_PLATES as TOTAL } from '@/lib/config';

const LOW = 8;

// Header logo with two small touches:
//  1. A live badge: "Launching soon" before launch, then "N left", red when low, "Sold out" at zero.
//  2. A short neon flicker when hovered, focused or tapped (nothing moves while idle).
export default function HeaderLogo() {
  const { launched, remaining, kitchenOnline } = useStatus();
  const [lit, setLit] = useState(false);
  const timer = useRef(null);

  function flash() {
    setLit(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLit(false), 700);
  }

  let text = 'Launching soon';
  let tone = 'soon';
  if (launched && kitchenOnline === false) {
    text = 'Offline';
    tone = 'out';
  } else if (launched && remaining !== null) {
    if (remaining <= 0) {
      text = 'Sold out';
      tone = 'out';
    } else {
      text = `${remaining} left`;
      tone = remaining <= LOW ? 'low' : 'ok';
    }
  } else if (launched) {
    text = `${TOTAL} plates a day`;
    tone = 'ok';
  }

  const toneClass = {
    soon: 'bg-[#0c0906] text-saffron border-saffron/50',
    ok: 'bg-accent text-black border-accent',
    low: 'bg-red-600 text-white border-red-500',
    out: 'bg-red-600 text-white border-red-500',
  }[tone];

  return (
    <a
      href="#"
      aria-label={`Only42Biryani, back to top. ${text}.`}
      onPointerEnter={flash}
      onPointerDown={flash}
      onFocus={flash}
      className={`logo-neon relative flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full ${lit ? 'is-lit' : ''}`}
    >
      <Image
        src="/images/favicon.png"
        alt="Only42Biryani logo"
        width={82}
        height={82}
        className="relative object-contain"
        priority
      />
      <span
        role="status"
        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold leading-4 tracking-wide shadow-lg ${toneClass}`}
      >
        {text}
      </span>
    </a>
  );
}
