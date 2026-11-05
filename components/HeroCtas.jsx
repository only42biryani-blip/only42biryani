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
            className="bg-accent text-black border border-accent font-mono font-bold text-xs sm:text-sm px-7 py-4 tracking-widest uppercase
              shadow-[0_0_30px_rgba(212,255,63,0.35)] hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all">
            Join the VIP list
          </a>
          <a href={INSTAGRAM_PROFILE_URL || INSTAGRAM_REEL_URL} target="_blank" rel="noopener noreferrer"
            className="border border-white/25 text-white font-mono font-bold text-xs sm:text-sm px-7 py-4 tracking-widest uppercase
              hover:border-accent hover:text-accent transition-all">
            {INSTAGRAM_PROFILE_URL ? 'Follow on Instagram' : 'Watch the reel'}
          </a>
        </div>
      )}

      {!launched && <OrderButtons />}
    </div>
  );
}
