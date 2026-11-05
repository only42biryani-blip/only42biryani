'use client';

import { useEffect, useRef } from 'react';

export default function CountdownTimer() {
  const hoursRef = useRef(null);
  const minsRef = useRef(null);
  const secsRef = useRef(null);

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      let target = new Date();
      target.setHours(12, 30, 0, 0); // Drop daily at 12:30 PM

      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hoursRef.current) hoursRef.current.textContent = String(hours).padStart(2, '0');
      if (minsRef.current) minsRef.current.textContent = String(minutes).padStart(2, '0');
      if (secsRef.current) secsRef.current.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 mt-6 justify-center">
      {[
        { ref: hoursRef, label: 'Hours' },
        { ref: minsRef, label: 'Mins' },
        { ref: secsRef, label: 'Secs' },
      ].map(({ ref, label }) => (
        <div
          key={label}
          className="bg-black/55 border border-red-500/20 rounded-xl px-4 py-2.5 text-center min-w-[72px] backdrop-blur-md"
        >
          <div ref={ref} className="font-grotesk text-2xl font-bold text-red-500 leading-none"
               style={{ textShadow: '0 0 12px rgba(255,59,48,0.3)' }}>
            00
          </div>
          <div className="text-[9px] text-neutral-500 uppercase tracking-wider mt-1 font-semibold">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
