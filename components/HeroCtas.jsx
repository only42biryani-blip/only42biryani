'use client';

import { useStatus } from './StatusProvider';
import LaunchCountdown from './LaunchCountdown';
import OrderButtons from './OrderButtons';
import { INSTAGRAM_PROFILE_URL, INSTAGRAM_REEL_URL } from '@/lib/config';

// The launch moment, front and centre in the hero: a countdown plus the one thing
// we want visitors to do (join before launch, order after it).
export default function HeroCtas() {
  const { launched, launchAt } = useStatus();

  return (
    <div className="flex flex-col gap-6">
      {!launched && <LaunchCountdown target={launchAt} label="Launching in" />}

      {launched ? (
        <OrderButtons />
      ) : (
        <div className="flex flex-wrap gap-3">
          <a href="#terminal"
            className="rounded-full bg-accent text-black font-bold text-sm px-7 py-4 tracking-wide shadow-[0_8px_30px_rgba(212,255,63,0.25)] hover:bg-white transition-all">
            Join the waitlist
          </a>
          <a href={INSTAGRAM_PROFILE_URL || INSTAGRAM_REEL_URL} target="_blank" rel="noopener noreferrer"
            className="rounded-full border border-white/25 text-white font-semibold text-sm px-7 py-4 tracking-wide
              hover:border-saffron hover:text-saffron transition-all">
            {INSTAGRAM_PROFILE_URL ? 'Follow on Instagram' : 'Watch the reel'}
          </a>
        </div>
      )}

      {!launched && <OrderButtons />}
    </div>
  );
}
