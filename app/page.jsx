import InventoryBox from '@/components/InventoryBox';
import TiltCard from '@/components/TiltCard';
import WaitlistForm from '@/components/WaitlistForm';
import Marquee from '@/components/Marquee';
import BorderBeam from '@/components/BorderBeam';
import AdVideo from '@/components/AdVideo';
import HeaderLogo from '@/components/HeaderLogo';
import PhotoGallery from '@/components/PhotoGallery';
import StatusProvider from '@/components/StatusProvider';
import LaunchBanner from '@/components/LaunchBanner';
import HeroCtas from '@/components/HeroCtas';
import HeaderCta from '@/components/HeaderCta';
import PrebookCard from '@/components/PrebookCard';
import StickyCta from '@/components/StickyCta';
import FollowSection from '@/components/FollowSection';
import JsonLd from '@/components/JsonLd';
import { getStatus } from '@/lib/status';
import HowItWorks from '@/components/HowItWorks';
import ThePlate from '@/components/ThePlate';
import Story from '@/components/Story';
import Faq from '@/components/Faq';
import Reviews from '@/components/Reviews';
import Footer from '@/components/Footer';

const manifesto = [
  { title: 'Only 42 plates', body: 'After 42 plates, attention drops. So when the 42nd plate is out, the kitchen stops. No second batch.' },
  { title: 'Zero frozen gravy', body: 'Fresh masala. Fresh chicken. Fresh dum. Every single day.' },
  { title: 'One dish only', body: 'One recipe. One process. One standard. We make Hyderabadi chicken dum biryani and nothing else.' },
  { title: 'Counted by hand', body: 'The plate count is updated by us, so it always reflects what the kitchen has really made.' },
];

const heroSlides = [
  {
    src: '/images/biryani-box-and-bag-2.jpg',
    alt: 'Open takeaway box of Hyderabadi chicken dum biryani with fried onions and mint, beside a cup of raita and an Only 42 Biryani paper bag',
    position: '50% 55%',
    priority: true,
  },
  {
    src: '/images/only42-packaging.jpg',
    alt: 'Only42Biryani takeaway box and paper bag with the Only 42 Biryani logo, beside a bowl of raita',
    position: 'center 60%',
  },
];

export const metadata = {
  alternates: { canonical: '/' },
};

// Rebuild at most every 30s so launch switches made in /admin show up quickly.
export const revalidate = 30;

export default async function HomePage() {
  const status = await getStatus();

  return (
    <StatusProvider initial={status}>
    <div className="bg-[#0c0906] min-h-screen font-inter selection:bg-saffron selection:text-black">
      <JsonLd launched={status.launched} />
      <LaunchBanner />

      {/* Cyberpunk Header */}
      <header className="absolute top-10 w-full z-[1000] border-b border-white/[0.05] bg-[#0c0906]/85 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-[90px] flex items-center justify-between">
            <HeaderLogo />
          
          <div className="flex items-center gap-6">
            <span className="hidden md:flex items-center gap-2 text-xs text-white/60 tracking-wide">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Hyderabad · 42 plates a day
            </span>
            <HeaderCta />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[170px] md:pt-[190px] pb-24 px-6 max-w-[1400px] mx-auto min-h-screen flex flex-col gap-6">
        
        {/* HERO HUD GRID */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch xl:min-h-[600px]">
          
          {/* Main Title Block */}
          <div className="xl:col-span-7 hud-box p-8 md:p-12 flex flex-col justify-start md:justify-center relative group overflow-hidden">
            <BorderBeam size={200} duration={12} borderWidth={2} colorFrom="rgba(242,169,59,0.8)" />
            
            <div className="inline-flex items-center gap-2 mb-6 md:mb-8 w-fit rounded-full border border-saffron/30 bg-saffron/10 px-4 py-2 text-[11px] md:text-xs font-semibold tracking-wide text-saffron">
              One fresh batch. Every day.
            </div>

            <h1 className="font-grotesk font-extrabold text-[34px] sm:text-6xl md:text-7xl lg:text-[68px] xl:text-[76px] leading-[1.04] tracking-tight mb-6">
              <span className="text-[#F5F1E8] block">Chicken dum biryani.</span>
              <span className="text-saffron block">42 plates a day.</span>
            </h1>

            <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-[560px] mb-6">
              Only42Biryani is a Hyderabad kitchen serving Hyderabadi chicken dum biryani in one fresh batch of 42 plates a day.
              {' '}
              {status.launched
                ? 'Order for delivery in Hyderabad, or pre-book a plate for another day. When the 42 are gone, the kitchen stops.'
                : 'When the 42 are gone, the kitchen stops. Join the waitlist to hear the moment the next drop goes live.'}
            </p>
            
            <p className="text-saffron font-semibold text-sm tracking-wide leading-relaxed mb-8">
              Only 42 plates a day. When they&apos;re gone, they&apos;re gone.
            </p>

            <HeroCtas />
          </div>

          {/* Image Block */}
          <div className="xl:col-span-5 hud-box p-2 relative min-h-[400px] xl:min-h-0">
            <PhotoGallery slides={heroSlides} sizes="(min-width: 1024px) 33vw, 100vw" label="Photos of the Only42Biryani chicken dum biryani" />
          </div>
        </section>

        {/* SECOND ROW GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inventory HUD */}
          <div className="lg:col-span-5 hud-box p-8 relative">
            <BorderBeam size={150} duration={10} borderWidth={2} colorFrom="rgba(242,169,59,0.5)" />
            <div className="text-xs font-semibold text-saffron tracking-widest uppercase mb-6 pb-2 border-b border-saffron/20">
              Today&apos;s kitchen
            </div>
            <InventoryBox />
          </div>

          {/* Marquee Strip */}
          <div className="lg:col-span-7 hud-box p-8 flex items-center">
            <Marquee items={["ONLY 42 PLATES", "ZERO FROZEN GRAVY", "FRESH HANDI", "HYDERABAD DUM"]} speed={20} className="opacity-80" />
          </div>
        </section>

        {/* MANIFESTO BENTO BOX */}
        <section className="pt-12">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight">Why only 42</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-saffron/50 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {manifesto.map((m, i) => (
              <TiltCard key={i} className="hud-box p-8 group h-full hover:border-saffron/40 transition-colors">
                <div className="text-saffron text-sm font-semibold mb-4">0{i+1}</div>
                <h3 className="font-grotesk text-xl font-bold text-[#F5F1E8] mb-3">{m.title}</h3>
                <p className="text-white/65 text-sm leading-relaxed group-hover:text-white/85 transition-colors">
                  {m.body}
                </p>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* STATEMENT & IMAGE ROW */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-12">
          <div className="lg:col-span-6 hud-box p-2 relative aspect-video lg:self-center">
            <div className="absolute inset-2 bg-black z-10 overflow-hidden rounded-[16px]">
              <AdVideo
                src="/video/only42-ad.mp4"
                poster="/video/only42-ad-poster.jpg"
                label="Short film: biryani being served into a box, Only 42 plates a day"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </div>
          
          <div className="lg:col-span-6 hud-box p-8 md:p-12 flex flex-col justify-center relative overflow-hidden bg-black/50">
            <div className="absolute right-0 top-0 w-40 h-40 bg-saffron/10 blur-[60px] pointer-events-none" />
            <h2 className="font-grotesk text-4xl sm:text-5xl md:text-7xl font-extrabold text-[#F5F1E8] leading-[1.02] tracking-tight mb-8 flex flex-col">
              <span>Quality</span>
              <span>breaks</span>
              <span className="text-saffron">at 43.</span>
            </h2>
            <div className="space-y-4 text-base md:text-lg text-white/70 leading-relaxed">
              <p>Most cloud kitchens optimise for scale. We optimise for attention.</p>
              <p>After 42 plates, consistency starts slipping. So we stop.</p>
              <p>No second batch. No shortcuts. No compromises.</p>
            </div>
          </div>
        </section>

        <ThePlate />
        <HowItWorks launched={status.launched} />
        <Story />
        <Reviews />
        <Faq launched={status.launched} />
        <FollowSection />

        {/* PRE-BOOKING + WAITLIST (the #terminal anchor is where the "Join the waitlist" buttons scroll to) */}
        {status.launched ? (
          <section id="terminal" className="pt-12">
            <div className="grid gap-6 lg:grid-cols-2 max-w-[1100px] mx-auto">
              <PrebookCard />
              <div id="waitlist" className="hud-box p-8 sm:p-10 relative overflow-hidden scroll-mt-6">
                <BorderBeam size={300} duration={15} borderWidth={2} colorFrom="rgba(242,169,59,0.5)" colorTo="rgba(212,255,63,0.3)" />
                <div className="relative z-10 mb-6">
                  <div className="inline-block rounded-full bg-saffron/10 text-saffron border border-saffron/30 px-4 py-1.5 text-xs font-semibold mb-4">
                    Daily drop alerts
                  </div>
                  <h2 className="font-grotesk text-3xl md:text-4xl font-extrabold text-[#F5F1E8] tracking-tight mb-3">Join the waitlist</h2>
                  <p className="text-sm text-white/65 leading-relaxed">
                    Not ready to order? We will message you when a day&apos;s plates go live. Joining is free. It is <b className="text-white">not an order</b> and it does not reserve a plate.
                  </p>
                </div>
                <div className="relative z-10 rounded-xl border border-white/10 bg-black/30 p-4 mb-6 text-xs text-white/65 leading-relaxed">
                  <div className="text-[11px] tracking-[2px] uppercase text-saffron font-semibold mb-2">What happens after you join</div>
                  <ol className="grid gap-1.5 list-decimal pl-4">
                    <li>You are on the list. No payment, nothing to confirm.</li>
                    <li>When a day&apos;s plates go live, we message you on WhatsApp (sometimes email), so you can order before the 42 are gone.</li>
                    <li>Want to be sure of a plate? Pre-book it instead. Pre-booked plates are kept aside for you.</li>
                  </ol>
                </div>
                <div className="relative z-10">
                  <WaitlistForm />
                </div>
              </div>
            </div>
          </section>
        ) : (
        <section id="terminal" className="pt-12">
          <div className="hud-box p-8 sm:p-12 max-w-[800px] mx-auto relative overflow-hidden">
            <BorderBeam size={300} duration={15} borderWidth={2} colorFrom="rgba(242,169,59,0.5)" colorTo="rgba(212,255,63,0.3)" />
            
            <div className="text-center mb-10 relative z-10">
              <div className="inline-block rounded-full bg-saffron/10 text-saffron border border-saffron/30 px-4 py-1.5 text-xs font-semibold mb-4">
                First access
              </div>
              <h2 className="font-grotesk text-4xl md:text-5xl font-extrabold text-[#F5F1E8] tracking-tight mb-4">
                Join the waitlist
              </h2>
              <p className="text-sm text-white/65">
                Be the first to know when the day&apos;s 42 plates go live.
              </p>
            </div>
            
            <div className="relative z-10">
              <WaitlistForm />
            </div>
          </div>
        </section>
        )}

        {/* CLOSING */}
        <section className="py-24 text-center">
          <h2 className="font-grotesk text-[80px] md:text-[180px] font-extrabold leading-[0.8] text-saffron/10 tracking-tighter select-none">
            ONLY42
          </h2>
        </section>
      </main>

      <Footer />
      <StickyCta />
    </div>
    </StatusProvider>
  );
}
