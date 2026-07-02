import { HomeImmersiveHero } from '@/components/home/HomeImmersiveHero';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { WorldPresenceSection } from '@/components/home/WorldPresenceSection';

export default function HomePage() {
  return (
    <div className="bg-[#0B0B0C] text-white">
      {/* Premium Notification Banner below Navbar / Top of page */}
      <div className="sticky top-[68px] z-40 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 py-3 text-center backdrop-blur-md sm:top-[76px] lg:top-[84px]">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-4 text-xs font-semibold sm:text-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-amber-300 font-bold uppercase tracking-wider">En construction :</span>
          <span className="text-neutral-200 font-medium">Notre site est en cours de préparation</span>
        </div>
      </div>

      <HomeImmersiveHero />

      {/* Below-the-fold depth */}
      <HowItWorksSection />
      <WorldPresenceSection />
    </div>
  );
}
