'use client';

import { useRef } from 'react';
import CountdownTimer from './CountdownTimer';
import BorderBeam from './BorderBeam';
import { useStatus } from './StatusProvider';

const TOTAL = 42;

export default function InventoryBox() {
  const { launched, remaining, kitchenOnline, tomorrowLeft } = useStatus();
  const PRE_LAUNCH_MODE = !launched;
  // Kitchen offline: today's number is not what a customer can order, so show tomorrow's free plates instead.
  const offline = launched && kitchenOnline === false && tomorrowLeft !== null && tomorrowLeft !== undefined;
  const count = offline ? tomorrowLeft : launched ? remaining : TOTAL;
  const loading = false;
  const boxRef = useRef(null);

  const percentage = count === null ? 0 : (count / TOTAL) * 100;
  const isSoldOut = count !== null && count <= 0;
  const isLow = count !== null && count >= 1 && count <= 8;
  const isMedium = count !== null && count >= 9 && count <= 19;

  const barColor = PRE_LAUNCH_MODE
    ? '#D4FF3F'
    : isSoldOut ? '#ff0000' : isLow ? '#ff3b30' : isMedium ? '#ff7b00' : '#D4FF3F';

  const countColor = PRE_LAUNCH_MODE ? '#D4FF3F'
    : isSoldOut ? '#ff3b30' : isLow ? '#ff3b30' : isMedium ? '#ff7b00' : '#D4FF3F';

  return (
    <div
      ref={boxRef}
      className={`mt-10 border rounded-[30px] p-8 max-w-[390px] backdrop-blur-md transition-all duration-300
        ${isSoldOut && !PRE_LAUNCH_MODE
          ? 'border-red-500/40 shadow-[0_0_60px_rgba(255,59,48,0.16)]'
          : isLow && !PRE_LAUNCH_MODE
          ? 'border-orange-500/40 animate-danger-pulse'
          : 'border-accent/10 animate-pulse-glow'
        }`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Vengence UI inspired Border Beam */}
      {(!PRE_LAUNCH_MODE && isSoldOut) && (
        <BorderBeam colorFrom="rgba(255,59,48,0.9)" colorTo="transparent" />
      )}
      {(!PRE_LAUNCH_MODE && isLow && !isSoldOut) && (
        <BorderBeam colorFrom="rgba(255,107,0,0.9)" colorTo="transparent" />
      )}
      {(!PRE_LAUNCH_MODE && !isLow && !isSoldOut) && (
        <BorderBeam colorFrom="rgba(212,255,63,0.5)" colorTo="transparent" />
      )}

      <p className="text-neutral-500 text-xs tracking-[2px] uppercase">{offline ? 'Plates for tomorrow' : 'Plates today'}</p>

      <h2
        className="font-grotesk font-extrabold text-[74px] leading-none tracking-[-2px] my-3 transition-colors"
        style={{ color: countColor }}
      >
        {loading ? '…' : PRE_LAUNCH_MODE ? `${TOTAL} / ${TOTAL}` : `${count ?? '–'} / ${TOTAL}`}
      </h2>

      <p className="text-sm tracking-[4px] mb-4 text-neutral-300">
        {PRE_LAUNCH_MODE ? 'PLATES PER DROP' : offline ? (isSoldOut ? 'FULLY BOOKED' : 'LEFT TO PRE-BOOK') : isSoldOut ? 'SOLD OUT' : 'LEFT TODAY'}
      </p>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-[#181818] rounded-full overflow-hidden mb-5 border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
          style={{
            width: `${PRE_LAUNCH_MODE ? 100 : percentage}%`,
            background: barColor,
            boxShadow: `0 0 15px ${barColor}`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-shine" />
        </div>
      </div>

      {/* Status Badge */}
      <span
        className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full border mb-4"
        style={{
          color: PRE_LAUNCH_MODE ? '#D4FF3F' : isSoldOut ? '#ff4d4d' : '#D4FF3F',
          background: PRE_LAUNCH_MODE ? 'rgba(212,255,63,0.08)' : isSoldOut ? 'rgba(255,77,77,0.08)' : 'rgba(212,255,63,0.08)',
          borderColor: PRE_LAUNCH_MODE ? 'rgba(212,255,63,0.12)' : isSoldOut ? 'rgba(255,77,77,0.15)' : 'rgba(212,255,63,0.12)',
        }}
      >
        {!isSoldOut && <span className="w-2 h-2 rounded-full bg-current animate-live-pulse" />}
        {PRE_LAUNCH_MODE ? 'PREVIEW — LAUNCHING SOON' : offline ? 'KITCHEN OFFLINE — PRE-BOOKING OPEN' : isSoldOut ? 'DROP STATUS — SOLD OUT' : 'DROP STATUS — LIVE'}
      </span>

      {/* Countdown shows only in sold-out mode */}
      {isSoldOut && !PRE_LAUNCH_MODE && !offline && <CountdownTimer />}

      <p className="text-neutral-500 text-sm leading-relaxed mt-4">
        {PRE_LAUNCH_MODE
          ? "We haven't launched yet — the numbers above show how each day's drop will work. Join the waitlist to get notified the moment we go live."
          : offline
          ? 'The kitchen is offline right now. Pre-book tomorrow\'s biryani and we will deliver it fresh that day.'
          : 'The plate count is updated by hand from what the kitchen has really made and sold.'}
      </p>
    </div>
  );
}
