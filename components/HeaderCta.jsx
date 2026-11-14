'use client';

import Link from 'next/link';
import { useStatus } from './StatusProvider';

const cls = 'rounded-full bg-accent text-black font-bold text-xs px-6 py-3 hover:bg-white transition-colors duration-300 tracking-wide';

// The button in the page header: "Order now" / "Pre-book" once we are live, "Join the waitlist" before that.
export default function HeaderCta() {
  const { launched, directOrdering, prebook } = useStatus();
  if (launched && (directOrdering || prebook)) {
    return <Link href="/order" className={cls}>{directOrdering ? 'Order now' : 'Pre-book'}</Link>;
  }
  return <a href="#terminal" className={cls}>Join the waitlist</a>;
}
