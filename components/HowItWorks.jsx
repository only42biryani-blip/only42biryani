const steps = [
  { n: '01', title: 'Join the waitlist', body: 'Leave your name, number and email. It takes ten seconds.' },
  { n: '02', title: 'Get the drop alert', body: 'We message you the moment the day’s batch goes live.' },
  { n: '03', title: 'Order before 42', body: 'Order on Zomato. When the 42 plates are gone, the kitchen stops.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="pt-12">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight">How it works</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-saffron/50 to-transparent" />
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <li key={s.n} className="hud-box p-8">
            <div className="text-saffron text-sm font-semibold mb-4">{s.n}</div>
            <h3 className="font-grotesk text-xl font-bold text-[#F5F1E8] mb-3">{s.title}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
