import { getFaqItems } from '@/lib/faq';

export default function Faq({ launched = false }) {
  const items = getFaqItems(launched);

  return (
    <section id="faq" className="pt-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight">Questions</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-saffron/50 to-transparent" />
      </div>

      <div className="grid gap-3 max-w-[900px]">
        {items.map((item) => (
          <details key={item.q} className="hud-box group p-6">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-grotesk text-lg font-bold text-[#F5F1E8]">
              {item.q}
              <span className="text-saffron text-xl transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 text-white/70 text-sm leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
