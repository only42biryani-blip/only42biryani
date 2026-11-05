'use client';

// Border Beam — animated glowing border effect (inspired by VengenceUI / Skiper UI)
export default function BorderBeam({
  size = 120,
  duration = 7,
  borderWidth = 1.5,
  colorFrom = 'rgba(212,255,63,0.9)',
  colorTo = 'transparent',
  className = '',
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        border: `${borderWidth}px solid transparent`,
        maskClip: 'padding-box, border-box',
        maskComposite: 'exclude',
        maskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
        WebkitMaskClip: 'padding-box, border-box',
        WebkitMaskComposite: 'xor',
        WebkitMaskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
      }}
    >
      <div
        className="absolute aspect-square rounded-[inherit]"
        style={{
          width: `${size}px`,
          animation: `border-beam ${duration}s infinite linear`,
          background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
          offsetAnchor: '90% 50%',
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
        }}
      />
      <style>{`
        @keyframes border-beam {
          0%   { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
      `}</style>
    </div>
  );
}
