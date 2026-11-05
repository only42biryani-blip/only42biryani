import { PRE_LAUNCH_MODE } from '@/lib/config';

const items = [
  {
    q: 'Why only 42 plates a day?',
    a: 'Most cloud kitchens optimise for scale. We optimise for attention. After 42 plates, consistency starts to slip, so we stop cooking. No second batch, no shortcuts.',
  },
  {
    q: 'What happens when the 42 plates are gone?',
    a: 'The deg is empty and the kitchen stops. The next drop is the next day, and waitlist members hear about it first.',
  },
  {
    q: 'How do I order?',
    a: PRE_LAUNCH_MODE
      ? "We haven't opened orders yet. Join the waitlist and we'll message you the moment ordering goes live on Zomato."
      : 'Order through our listing on Zomato using the order button at the top of the page.',
  },
  {
    q: 'How will I know when a drop is live?',
    a: 'Waitlist members are notified using the phone number and email they signed up with, before the 42 plates are gone.',
  },
  {
    q: 'Is the gravy fresh?',
    a: 'Yes. Fresh masala, fresh chicken and fresh dum every day. We never use frozen gravy.',
  },
];

export default function Faq() {
  return (
    <section id="faq" className="pt-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-grotesk text-3xl font-bold uppercase text-white tracking-widest">FAQ</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
      </div>

      <div className="grid gap-3 max-w-[900px]">
        {items.map((item) => (
          <details key={item.q} className="hud-box group p-6">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-grotesk text-lg font-bold text-white">
              {item.q}
              <span className="text-accent font-mono transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 text-white/70 text-sm leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
