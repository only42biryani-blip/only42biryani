import Image from 'next/image';
import { PLATE } from '@/lib/config';

const rows = [
  { label: 'Price', value: PLATE.price },
  { label: 'Portion', value: PLATE.portion },
  { label: 'Spice level', value: PLATE.spice },
].filter((r) => r.value);

export default function ThePlate() {
  return (
    <section id="the-plate" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-12">
      <div className="lg:col-span-6 hud-box p-2 relative h-[420px] lg:h-auto lg:min-h-[420px]">
        <div className="absolute inset-2 overflow-hidden">
          <Image
            src="/images/chicken-dum-biryani-hero.jpg"
            alt="Chicken dum biryani served on a silver plate with raita, onions and a copper handi"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="lg:col-span-6 hud-box p-8 md:p-12 flex flex-col justify-center">
        <div className="text-accent font-mono text-xs tracking-widest mb-4 uppercase">The only item on the menu</div>
        <h2 className="font-grotesk text-4xl md:text-5xl font-bold uppercase text-white leading-[1] tracking-tighter mb-6">
          Chicken Dum Biryani
        </h2>
        <p className="text-white/70 text-sm md:text-base leading-relaxed mb-8">
          Long-grain basmati rice, slow dum-cooked chicken and sealed handi aroma, prepared fresh every day in a single batch of 42 plates.
        </p>

        {rows.length > 0 && (
          <dl className="grid gap-3 border-t border-white/10 pt-6">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 text-sm">
                <dt className="text-white/50">{r.label}</dt>
                <dd className="text-white font-bold">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
