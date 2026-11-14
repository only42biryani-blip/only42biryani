import ShareFollow from './ShareFollow';

export default function FollowSection() {
  return (
    <section id="follow" className="pt-12">
      <div className="hud-box p-8 md:p-12 text-center">
        <div className="text-saffron text-xs font-semibold tracking-[3px] mb-4 uppercase">Stay close to the kitchen</div>
        <h2 className="font-grotesk text-3xl md:text-5xl font-extrabold text-[#F5F1E8] tracking-tight mb-4">
          Follow the kitchen
        </h2>
        <p className="text-white/60 text-sm md:text-base max-w-[560px] mx-auto mb-8 leading-relaxed">
          Behind-the-scenes from the kitchen, each day’s timing and the plate count. Share it with the friend who
          always asks where the real Hyderabadi biryani is.
        </p>
        <ShareFollow className="justify-center" />
      </div>
    </section>
  );
}
