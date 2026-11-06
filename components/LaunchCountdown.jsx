'use client';

import { useEffect, useState } from 'react';

function parts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    mins: Math.floor((total % 3600) / 60),
    secs: total % 60,
  };
}

// compact = single-line version for the top banner.
export default function LaunchCountdown({ target, compact = false, label }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const end = target ? new Date(target).getTime() : NaN;
  if (Number.isNaN(end) || now === null) return null;

  const diff = end - now;
  if (diff <= 0) return null;

  const p = parts(diff);
  const pad = (n) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <span className="font-mono tabular-nums">
        {p.days > 0 && `${p.days}d `}{pad(p.hours)}:{pad(p.mins)}:{pad(p.secs)}
      </span>
    );
  }

  const cells = [
    ['Days', p.days],
    ['Hours', p.hours],
    ['Mins', p.mins],
    ['Secs', p.secs],
  ];

  return (
    <div>
      {label && <div className="text-[11px] sm:text-xs tracking-[3px] text-saffron font-semibold uppercase mb-3">{label}</div>}
      <div className="flex gap-3" role="timer" aria-label="Time until launch">
        {cells.map(([cellLabel, value]) => (
          <div key={cellLabel} className="bg-black/40 border border-saffron/25 rounded-2xl px-3 sm:px-5 py-3 text-center min-w-[64px] sm:min-w-[84px]">
            <div className="font-grotesk text-3xl sm:text-5xl font-extrabold text-[#F5F1E8] tabular-nums leading-none"
              >
              {pad(value)}
            </div>
            <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2">{cellLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
