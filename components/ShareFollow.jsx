'use client';

import { useState } from 'react';
import { SITE_URL, INSTAGRAM_PROFILE_URL, INSTAGRAM_REEL_URL } from '@/lib/config';

const MESSAGE = 'Only 42 plates of Hyderabadi dum biryani a day, then the kitchen stops. Order or pre-book yours from Only42Biryani:';

const btn = 'rounded-full font-semibold text-sm tracking-wide px-5 py-3 border transition-all text-center';

// Share the site + follow on Instagram. Used in the signup success popup and in the
// "follow the launch" section: every signup is a chance to bring in friends.
export default function ShareFollow({ className = '' }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Only42Biryani', text: MESSAGE, url: SITE_URL });
        return;
      } catch {
        // Cancelled or unsupported: fall through to WhatsApp.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${MESSAGE} ${SITE_URL}`)}`, '_blank', 'noopener');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the share button still works.
    }
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <button type="button" onClick={share}
        className={`${btn} bg-accent text-black border-accent hover:bg-white`}>
        Share with friends
      </button>
      <a href={INSTAGRAM_PROFILE_URL || INSTAGRAM_REEL_URL} target="_blank" rel="noopener noreferrer"
        className={`${btn} border-white/25 text-white hover:border-saffron hover:text-saffron`}>
        {INSTAGRAM_PROFILE_URL ? 'Follow on Instagram' : 'Watch the reel'}
      </a>
      <button type="button" onClick={copyLink}
        className={`${btn} border-white/15 text-white/60 hover:text-white`}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
