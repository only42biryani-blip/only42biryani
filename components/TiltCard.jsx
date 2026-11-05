'use client';

import { useRef } from 'react';

export default function TiltCard({ children, className = '' }) {
  const cardRef = useRef(null);
  const sheenRef = useRef(null);

  function handleMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;

    if (sheenRef.current) {
      const xP = (x / rect.width) * 100;
      const yP = (y / rect.height) * 100;
      sheenRef.current.style.opacity = '1';
      sheenRef.current.style.background = `radial-gradient(circle at ${xP}% ${yP}%, rgba(255,255,255,0.16) 0%, transparent 60%)`;
    }
  }

  function handleMouseLeave() {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    }
    if (sheenRef.current) sheenRef.current.style.opacity = '0';
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-transform duration-200 will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        ref={sheenRef}
        className="absolute inset-0 z-10 pointer-events-none opacity-0 transition-opacity duration-400"
        style={{ mixBlendMode: 'overlay' }}
      />
      {children}
    </div>
  );
}
