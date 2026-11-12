'use client';

import Link from 'next/link';
import { useStatus } from './StatusProvider';
import LaunchCountdown from './LaunchCountdown';
import { ZOMATO_URL, TOTAL_PLATES as TOTAL } from '@/lib/config';


// Slim bar pinned to the top of every page view. This is the first thing people see.
export default function LaunchBanner() {
  const { launched, launchAt, banner, remaining, kitchenOnline, nextBooking } = useStatus();
  const tomorrowLeft = nextBooking ? nextBooking.left : null; // plates free on the next pre-booking day
  const offline = launched && kitchenOnline === false;
  const soldOut = launched && remaining !== null && remaining <= 0;

  let content;
  if (banner) {
    content = <span>{banner}</span>;
  } else if (!launched) {
    content = (
      <>
        <span>LAUNCHING SOON</span>
        <LaunchCountdown target={launchAt} compact />
        <a href="#terminal" className="underline underline-offset-4 hover:text-white">JOIN THE WAITLIST</a>
      </>
    );
  } else if (offline) {
    content = (
      <>
        <span>KITCHEN OFFLINE{tomorrowLeft !== null && tomorrowLeft !== undefined ? ` · PRE-BOOK ${String(nextBooking.word).toUpperCase()} · ${tomorrowLeft} OF ${TOTAL} LEFT` : ''}</span>
        {tomorrowLeft !== null && tomorrowLeft !== undefined && <Link href="/order" className="underline underline-offset-4 hover:text-white">PRE-BOOK</Link>}
      </>
    );
  } else if (soldOut) {
    content = (
      <>
        <span>SOLD OUT TODAY — BACK TOMORROW</span>
        <a href="#terminal" className="underline underline-offset-4 hover:text-white">GET TOMORROW&apos;S ALERT</a>
      </>
    );
  } else {
    content = (
      <>
        <span>WE&apos;RE LIVE{remaining !== null ? ` · ${remaining} OF ${TOTAL} PLATES LEFT` : ''}</span>
        {ZOMATO_URL && (
          <a href={ZOMATO_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
            ORDER ON ZOMATO
          </a>
        )}
      </>
    );
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[2000] h-10 bg-accent text-black font-bold text-[11px] sm:text-xs tracking-wide
      flex items-center justify-center gap-3 sm:gap-6 px-3 overflow-hidden whitespace-nowrap">
      <span className="w-2 h-2 rounded-full bg-black animate-pulse shrink-0" />
      {content}
    </div>
  );
}
