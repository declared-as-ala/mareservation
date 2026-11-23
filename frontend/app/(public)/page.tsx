import type { Metadata } from 'next';
import { BecomeHostSection, CategoryRail, DestinationsSection, Experience360Section, FeaturedSection, HomeHero } from '@/components/site/home/HomeSections';
import { getHomeDataServer, SITE_URL } from '@/lib/serverApi';
import { jsonLd } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Exploria360 — Les plus belles maisons d'hôtes de Tunisie, à visiter en 360°" },
  description:
    "Découvrez les plus belles maisons d'hôtes de Tunisie, visitez-les en 360° avant de réserver et réservez votre escapade en toute confiance.",
  alternates: { canonical: '/' },
  openGraph: { title: "Exploria360 — Maisons d'hôtes en Tunisie", url: SITE_URL, type: 'website', images: ['/demo/hero.jpg'] },
};

export default async function HomePage() {
  const data = await getHomeDataServer();
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Exploria360',
    url: SITE_URL,
    inLanguage: 'fr',
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/accommodations?where={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };
  return (
    <div className="bg-[#0B0B0C] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteLd) }} />
      <HomeHero />
      <nav aria-label="Catégories" className="mx-auto max-w-[1600px] border-b border-white/10 px-4 pt-6 sm:px-6 lg:px-10">
        <CategoryRail />
      </nav>
      <FeaturedSection results={data.results} />
      <DestinationsSection destinations={data.destinations} />
      <Experience360Section venue={data.tourVenue} />
      <BecomeHostSection />
    </div>
  );
}
