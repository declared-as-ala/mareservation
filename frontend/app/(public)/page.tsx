import { HomeImmersiveHero } from '@/components/home/HomeImmersiveHero';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { WorldPresenceSection } from '@/components/home/WorldPresenceSection';

export default function HomePage() {
  return (
    <div className="bg-[#0B0B0C] text-white">
      {/* Mobile: single-screen immersive home (no scroll).
          Desktop: dense premium hero — recommended venues + 360° booking + categories. */}
      <HomeImmersiveHero />

      {/* Below-the-fold depth */}
      <HowItWorksSection />
      <WorldPresenceSection />
    </div>
  );
}
