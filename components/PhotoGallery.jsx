'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Swipeable photo gallery. Native scroll-snap does the swiping (touch and
// trackpad), the dots and arrows are extras, and it auto-advances until the visitor
// touches it. Respects "reduce motion".
export default function PhotoGallery({ slides, sizes = "(min-width: 1024px) 50vw, 100vw", label = "Photos of the biryani" }) {
  const scroller = useRef(null);
  const paused = useRef(false);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i) => {
    const el = scroller.current;
    if (!el) return;
    const next = (i + slides.length) % slides.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }, [slides.length]);

  function onScroll() {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const el = scroller.current;
      if (!el || paused.current || document.hidden) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((current + 1) % slides.length) * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const stop = () => { paused.current = true; };

  return (
    <div className="absolute inset-2 z-10 overflow-hidden rounded-[16px] bg-black group"
      role="region" aria-roledescription="carousel" aria-label={label}
      onPointerDown={stop} onMouseEnter={stop} onMouseLeave={() => { paused.current = false; }}
      onFocus={stop}>
      <div ref={scroller} onScroll={onScroll}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        {slides.map((s, i) => (
          <div key={s.src} className="relative h-full w-full shrink-0 snap-center" aria-hidden={i !== index}>
            <Image
              src={s.src}
              alt={s.alt}
              fill
              sizes={sizes}
              {...(s.priority ? { priority: true } : {})}
              className="object-cover brightness-[0.95] saturate-[1.08]"
              style={{ objectPosition: s.position || 'center' }}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous photo"
        className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-saffron hover:text-black md:flex md:opacity-0 md:group-hover:opacity-100">
        ‹
      </button>
      <button type="button" onClick={() => goTo(index + 1)} aria-label="Next photo"
        className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-saffron hover:text-black md:flex md:opacity-0 md:group-hover:opacity-100">
        ›
      </button>

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button key={s.src} type="button" onClick={() => goTo(i)} aria-label={`Show photo ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-saffron' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
        ))}
      </div>
    </div>
  );
}
