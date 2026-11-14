'use client';

import Link from 'next/link';
import { useStatus } from './StatusProvider';
import { TOTAL_PLATES } from '@/lib/config';

const STEPS = [
  ['Pick a day and your plates', 'Tomorrow, or any day up to a week ahead. Tell us where to deliver (Hyderabad only).'],
  ['We confirm and keep your plates aside', 'Pre-booked plates count towards that day’s 42, so they are yours.'],
  ['Fresh delivery that day', 'We cook that morning and deliver. You pay cash or UPI when it arrives.'],
];

// Explains pre-booking (booking a plate for another day) and links to the order page. Shows the plates still free.
export default function PrebookCard() {
  const { directOrdering, prebook, nextBooking } = useStatus();
  const word = nextBooking?.word === 'today' ? 'today' : 'tomorrow';
  const left = nextBooking ? nextBooking.left : null;
  const available = directOrdering || prebook;

  return (
    <div className="hud-box p-8 sm:p-10 flex flex-col gap-5">
      <div>
        <div className="inline-block rounded-full bg-saffron/10 text-saffron border border-saffron/30 px-4 py-1.5 text-xs font-semibold mb-4">Pre-booking</div>
        <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight mb-3">Book a plate for another day</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          {directOrdering
            ? 'The kitchen is open now, so you can order for today. If you would rather have it another day, pre-book it.'
            : prebook
              ? 'The kitchen is offline or sold out for today. You do not have to wait: pre-book a plate for another day and we will deliver it fresh.'
              : 'Online ordering and pre-booking are not available right now. Join the waitlist and we will tell you when plates go live.'}
        </p>
      </div>

      {left !== null && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-[#F5F1E8]">
          <span className="capitalize">{word}</span>: <b className="text-saffron">{left}</b> of {TOTAL_PLATES} plates left to book
        </div>
      )}

      <ol className="grid gap-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full border border-accent text-accent text-sm font-bold flex items-center justify-center">{i + 1}</span>
            <span className="text-sm"><b className="text-[#F5F1E8]">{title}</b><span className="block text-white/60 text-xs leading-relaxed mt-0.5">{body}</span></span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-wrap items-center gap-3">
        {available ? (
          <Link href="/order" className="rounded-full bg-accent text-black font-bold text-sm px-7 py-4 hover:bg-white transition-colors">
            {directOrdering ? 'Order or pre-book' : `Pre-book for ${word}`}
          </Link>
        ) : (
          <a href="#waitlist" className="text-xs text-saffron underline">Join the waitlist below</a>
        )}
        <span className="text-[11px] text-white/45">You can cancel for free before we pack it.</span>
      </div>
    </div>
  );
}
