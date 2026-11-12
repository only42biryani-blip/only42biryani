'use client';

import { useStatus } from './StatusProvider';

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// The price on the home page, as set in the admin. Shows the offer price with the full price struck through
// when there is an offer; until the live price loads it shows the price the page was built with.
export default function LivePrice({ fallback }) {
  const { price, offerPercent } = useStatus();
  if (!price) return <>{fallback}</>;
  const net = Math.round(price * (1 - (offerPercent || 0) / 100));
  if (!offerPercent || net === price) return <>{rupees(price)}</>;
  return (
    <>
      {rupees(net)} <span className="text-white/40 line-through font-normal">{rupees(price)}</span>
    </>
  );
}
