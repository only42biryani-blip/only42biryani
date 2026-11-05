'use client';

export default function Marquee({ items, speed = 40, className = "" }) {
  return (
    <div className={`overflow-hidden flex w-full relative ${className}`}>
      <div 
        className="flex whitespace-nowrap"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        {/* Double the items to make the loop seamless */}
        {[...items, ...items].map((item, i) => (
          <div key={i} className="px-8 flex items-center gap-8">
            <span className="font-grotesk text-2xl font-bold uppercase tracking-widest text-[#222]">
              {item}
            </span>
            <span className="w-2 h-2 rounded-full bg-accent/30" />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
