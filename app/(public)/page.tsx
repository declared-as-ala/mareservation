import { RecommendedSection } from '@/components/home/RecommendedSection';
import { SplineHeroSection } from '@/components/home/SplineHeroSection';
import { ExperienceCategoriesSection } from '@/components/home/ExperienceCategoriesSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { WorldPresenceSection } from '@/components/home/WorldPresenceSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Recommended featured venues */}
      <RecommendedSection />

      {/* Categories / Accès rapide */}
      <ExperienceCategoriesSection />

      {/* Immersive 360° reservation hero */}
      <SplineHeroSection />

      <HowItWorksSection />
      <WorldPresenceSection />
    </div>
  );
}
