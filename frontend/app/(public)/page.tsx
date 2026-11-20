import type { Metadata } from 'next';
import { HomeImmersiveHero } from '@/components/home/HomeImmersiveHero';
import { HomeDemoShowcase } from '@/components/home/HomeDemoShowcase';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { WorldPresenceSection } from '@/components/home/WorldPresenceSection';

export const metadata: Metadata = {
  title: { absolute: "Exploria360 — Maisons d'hôtes en Tunisie, à visiter en 360°" },
  description:
    "Explorez avant de réserver : découvrez les plus belles maisons d'hôtes de Tunisie en immersion 360° et réservez votre escapade en toute confiance.",
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="bg-[#0B0B0C] text-white">
      <HomeImmersiveHero />

      {/* Featured demonstration maison d'hôtes + 360° experience */}
      <HomeDemoShowcase />

      {/* Below-the-fold depth */}
      <HowItWorksSection />
      <WorldPresenceSection />
    </div>
  );
}
