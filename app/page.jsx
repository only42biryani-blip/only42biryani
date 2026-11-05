import Image from 'next/image';
import InventoryBox from '@/components/InventoryBox';
import TiltCard from '@/components/TiltCard';
import WaitlistForm from '@/components/WaitlistForm';
import Marquee from '@/components/Marquee';
import BorderBeam from '@/components/BorderBeam';
import CursorGlow from '@/components/CursorGlow';
import StatusProvider from '@/components/StatusProvider';
import LaunchBanner from '@/components/LaunchBanner';
import HeroCtas from '@/components/HeroCtas';
import StickyCta from '@/components/StickyCta';
import FollowSection from '@/components/FollowSection';
import { getStatus } from '@/lib/status';
import HowItWorks from '@/components/HowItWorks';
import ThePlate from '@/components/ThePlate';
import Story from '@/components/Story';
import Faq from '@/components/Faq';
import Footer from '@/components/Footer';

const manifesto = [
  { title: 'SYS_01: ONLY 42 PLATES', body: 'CRITICAL LIMIT REACHED: After 42 plates, attention drops. Production sequence terminates automatically.' },
  { title: 'SYS_02: ZERO FROZEN GRAVY', body: 'INTEGRITY CHECK PASSED: Fresh masala. Fresh chicken. Fresh dum. Every single day.' },
  { title: 'SYS_03: SINGLE PRODUCT', body: 'OPTIMIZATION MAXIMIZED: One recipe. One process. One standard.' },
  { title: 'SYS_04: COUNTED BY HAND', body: 'PLATE COUNT: Updated manually so it always reflects what the kitchen has really made.' },
];

// Rebuild at most every 30s so launch switches made in /admin show up quickly.
export const revalidate = 30;

export default async function HomePage() {
  const status = await getStatus();

  return (
    <StatusProvider initial={status}>
    <div className="bg-black min-h-screen font-inter selection:bg-accent selection:text-black">
      <LaunchBanner />
      <CursorGlow />

      {/* Cyberpunk Header */}
      <header className="absolute top-10 w-full z-[1000] border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-[90px] flex items-center justify-between">
            {/* Cyberpunk Logo with Laser Ring */}
            <div className="relative flex items-center justify-center w-[86px] h-[86px] group cursor-pointer rounded-full">
              {/* Crisp SVG Laser Ring */}
              <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '4s' }} viewBox="0 0 100 100">
                {/* Moving laser segment without extra glow */}
                <circle cx="50" cy="50" r="49" fill="none" stroke="#D4FF3F" strokeWidth="2" strokeLinecap="round" 
                  strokeDasharray="40 270" />
              </svg>
              {/* Solid black background */}
              <div className="absolute inset-[2px] rounded-full bg-black z-0" />
              
              <Image 
                src="/images/favicon.png" 
                alt="Only42Biryani Logo" 
                width={82} 
                height={82}
                className="relative z-10 object-contain" 
              />
            </div>
          
          <div className="flex items-center gap-6">
            <span className="hidden md:flex items-center gap-2 text-xs font-mono text-accent/80 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_#D4FF3F]" />
              SYS_ONLINE
            </span>
            <a href="#terminal"
              className="relative overflow-hidden group bg-accent/10 border border-accent/30 text-accent font-bold text-xs px-6 py-3
                hover:bg-accent hover:text-black transition-all duration-300 font-mono tracking-widest uppercase">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shine_2s_infinite] group-hover:hidden" />
              Join Waitlist
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[170px] md:pt-[190px] pb-24 px-6 max-w-[1400px] mx-auto min-h-screen flex flex-col gap-6">
        
        {/* HERO HUD GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[600px]">
          
          {/* Main Title Block */}
          <div className="lg:col-span-8 hud-box p-8 md:p-12 flex flex-col justify-start md:justify-center relative group overflow-hidden">
            <BorderBeam size={200} duration={12} borderWidth={2} colorFrom="rgba(212,255,63,0.8)" />
            
            <div className="inline-flex items-center gap-3 mb-6 md:mb-8 w-fit border border-white/10 bg-white/5 px-3 md:px-4 py-2 text-[10px] md:text-xs font-mono tracking-widest text-white/70">
              <span className="text-fire font-bold">[ INIT ]</span> LIMITED DAILY DROP PROTOCOL
            </div>

            <h1 className="font-grotesk font-black text-[36px] sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] md:leading-[0.9] tracking-tighter uppercase mb-6">
              <span className="text-white block">BEST HYDERABAD</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white drop-shadow-[0_0_30px_rgba(212,255,63,0.2)] w-fit block pb-1">CHICKEN</span>
              <span className="text-white block">BIRYANI.</span>
            </h1>
            
            <p className="text-fire font-mono font-bold text-xs sm:text-sm tracking-[3px] sm:tracking-[5px] uppercase drop-shadow-[0_0_10px_rgba(255,107,0,0.5)] leading-relaxed mb-8">
              &gt; CAPACITY: ONLY 42 PLATES DAILY
            </p>

            <HeroCtas />
          </div>

          {/* Image Block */}
          <div className="lg:col-span-4 hud-box p-2 relative min-h-[400px] lg:min-h-0">
            <BorderBeam size={100} duration={8} borderWidth={1.5} colorFrom="rgba(255,107,0,0.8)" />
            <div className="absolute inset-2 bg-black z-10 overflow-hidden">
              {/* Cyberpunk Filter Applied to Image */}
              <Image
                src="/images/chicken-dum-biryani-portrait.jpg"
                alt="Hyderabad chicken dum biryani on a silver plate beside a copper handi"
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover brightness-[0.9] contrast-[1.05] saturate-[1.1]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />
              
              {/* Overlay targeting crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <div className="w-[120px] h-[120px] border border-accent rounded-full animate-spin-slow" style={{ animationDuration: '10s' }} />
                <div className="absolute w-[2px] h-[140px] bg-accent/50" />
                <div className="absolute w-[140px] h-[2px] bg-accent/50" />
              </div>
            </div>
          </div>
        </section>

        {/* SECOND ROW GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inventory HUD */}
          <div className="lg:col-span-4 hud-box p-8 relative">
            <BorderBeam size={150} duration={10} borderWidth={2} colorFrom="rgba(212,255,63,0.6)" />
            <div className="font-mono text-xs text-accent/70 tracking-widest mb-6 pb-2 border-b border-accent/20">
              [ STATUS: KITCHEN PREP ]
            </div>
            <InventoryBox />
          </div>

          {/* Marquee Strip */}
          <div className="lg:col-span-8 hud-box p-8 flex items-center bg-[linear-gradient(45deg,transparent_25%,rgba(212,255,63,0.02)_50%,transparent_75%)] bg-[length:20px_20px]">
            <Marquee items={["ONLY 42 PLATES", "ZERO FROZEN GRAVY", "FRESH HANDI", "HYDERABAD DUM"]} speed={20} className="opacity-80" />
          </div>
        </section>

        {/* MANIFESTO BENTO BOX */}
        <section className="pt-12">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-grotesk text-3xl font-bold uppercase text-white tracking-widest">SYSTEM_PROTOCOL</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {manifesto.map((m, i) => (
              <TiltCard key={i} className="hud-box p-8 group cursor-crosshair h-full hover:bg-accent/5 transition-colors">
                <BorderBeam size={80} duration={6} borderWidth={1} colorFrom="rgba(255,255,255,0.3)" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-accent font-mono text-xs mb-4 opacity-50 group-hover:opacity-100 transition-opacity">0{i+1}</div>
                <h3 className="font-grotesk text-lg font-bold text-white mb-3 tracking-wide">{m.title}</h3>
                <p className="text-white/50 font-mono text-xs leading-relaxed group-hover:text-white/80 transition-colors">
                  {m.body}
                </p>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* STATEMENT & IMAGE ROW */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-12">
          <div className="lg:col-span-6 hud-box p-2 relative h-[500px]">
            <div className="absolute inset-2 bg-black z-10 overflow-hidden">
              <Image
                src="/images/chicken-dum-biryani-hero.jpg"
                alt="Copper handi and a plate of chicken dum biryani with raita and sliced onions"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover brightness-[0.9]"
              />
              <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur border border-accent/30 text-accent font-mono text-xs px-4 py-2 uppercase">
                Sealed handi, slow dum
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-6 hud-box p-8 md:p-12 flex flex-col justify-center relative overflow-hidden bg-black/50">
            <div className="absolute right-0 top-0 w-32 h-32 bg-accent/10 blur-[50px] pointer-events-none" />
            <h2 className="font-grotesk text-4xl sm:text-5xl md:text-7xl font-bold uppercase text-white leading-[1] md:leading-[0.9] tracking-tighter mb-8 flex flex-col">
              <span>QUALITY</span>
              <span>BREAKS</span>
              <span className="text-fire drop-shadow-[0_0_20px_rgba(255,107,0,0.4)]">AT 43.</span>
            </h2>
            <div className="space-y-4 font-mono text-xs md:text-sm text-white/60 leading-relaxed">
              <p>&gt; Most cloud kitchens optimize for scale. We optimize for attention.</p>
              <p>&gt; After 42 plates, consistency starts collapsing. So we stop.</p>
              <p>&gt; No second batch. No shortcuts. No compromises.</p>
            </div>
          </div>
        </section>

        <ThePlate />
        <HowItWorks />
        <Story />
        <Faq />
        <FollowSection />

        {/* TERMINAL WAITLIST */}
        <section id="terminal" className="pt-12">
          <div className="hud-box p-12 max-w-[800px] mx-auto relative overflow-hidden bg-[#020202]">
            <BorderBeam size={300} duration={15} borderWidth={2} colorFrom="rgba(212,255,63,0.5)" colorTo="rgba(255,107,0,0.5)" />
            <div className="scanline absolute inset-0 opacity-30 pointer-events-none" />
            
            <div className="text-center mb-10 relative z-10">
              <div className="inline-block bg-fire/20 text-fire border border-fire/30 px-3 py-1 font-mono text-xs mb-4 animate-pulse">
                VIP LIST · FIRST ACCESS
              </div>
              <h2 className="font-grotesk text-4xl md:text-5xl font-bold text-white tracking-widest uppercase mb-4">
                JOIN THE WAITLIST
              </h2>
              <p className="font-mono text-xs text-white/50">
                Be the first to know when the day&apos;s 42 plates go live.
              </p>
            </div>
            
            <div className="relative z-10">
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="py-24 text-center">
          <h2 className="font-grotesk text-[80px] md:text-[180px] font-black leading-[0.8] text-white/5 tracking-tighter mix-blend-difference select-none">
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
