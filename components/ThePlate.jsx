import AdVideo from './AdVideo';
import { PLATE } from '@/lib/config';

// What goes in the box: facts we always show. Price, portion and spice are added
// automatically once they are set in lib/config.js.
const rows = [
  { label: 'Chicken', value: 'Fresh boneless chicken breast (Sneha chicken)' },
  { label: 'Rice', value: 'Medium-grain rice' },
  { label: 'Cooked', value: 'Slow dum in a sealed handi' },
  { label: 'Packed in', value: 'Sugarcane bagasse box' },
  { label: 'Price', value: PLATE.price },
  { label: 'Portion', value: PLATE.portion },
  { label: 'Spice level', value: PLATE.spice },
].filter((r) => r.value);

export default function ThePlate() {
  return (
    <section id="the-plate" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-12">
      <div className="lg:col-span-6 hud-box p-2 relative aspect-video lg:self-center">
        <div className="absolute inset-2 z-10 overflow-hidden rounded-[16px] bg-black">
          <AdVideo
            src="/video/only42-pack.mp4"
            poster="/video/only42-pack-poster.jpg"
            label="Only42Biryani takeaway box, paper bag and raita"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="lg:col-span-6 hud-box p-8 md:p-12 flex flex-col justify-center">
        <div className="text-saffron text-xs font-semibold tracking-[3px] mb-4 uppercase">The only item on the menu</div>
        <h2 className="font-grotesk text-4xl md:text-5xl font-extrabold text-[#F5F1E8] leading-[1.05] tracking-tight mb-6">
          Chicken dum biryani
        </h2>
        <p className="text-white/70 text-sm md:text-base leading-relaxed mb-8">
          Fresh boneless chicken breast and medium-grain rice, slow dum-cooked in a sealed handi and prepared fresh every day in a single batch of 42 plates.
        </p>

        <dl className="grid gap-3 border-t border-white/10 pt-6">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-6 text-sm">
              <dt className="shrink-0 text-white/50">{r.label}</dt>
              <dd className="text-right font-bold text-[#F5F1E8]">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
