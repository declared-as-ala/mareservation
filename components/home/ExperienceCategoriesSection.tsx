import { AppContainer } from '@/components/shared/AppContainer';
import {
  Coffee,
  Wine,
  Utensils,
  Music2,
  Building2,
  Hotel,
  Waves,
  Flower2,
  BriefcaseBusiness,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

const items = [
  { icon: Coffee, label: 'Cafés & Lounges', href: '/explorer?type=CAFE' },
  { icon: Wine, label: 'Bars & Rooftops', href: '/explorer?q=Bar' },
  { icon: Utensils, label: 'Restaurants Gastronomiques', href: '/explorer?type=RESTAURANT' },
  { icon: Music2, label: 'Clubs & Resto de Nuit', href: '/explorer?q=Club' },
  { icon: Building2, label: 'Salles & Événementiel', href: '/explorer?type=EVENT_SPACE' },
  { icon: Hotel, label: 'Hôtels & Resorts', href: '/explorer?type=HOTEL' },
  { icon: BriefcaseBusiness, label: 'Coworking Spaces', href: '/explorer?type=COWORKING' },
  { icon: Waves, label: 'Beach Clubs', href: '/explorer?q=Beach' },
  { icon: Flower2, label: 'Spas & Bien-être', href: '/explorer?q=Spa' },
];

export function ExperienceCategoriesSection() {
  return (
    <section className="relative overflow-hidden bg-[#111113] py-16 text-white md:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute -top-32 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.025] blur-[120px]" />

      <AppContainer>
        {/* Header */}
        <Reveal className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <div className="mx-auto mb-4 h-px w-12 bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-500/40" />
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-white/95 md:text-3xl">
            Tous les lieux où l&apos;expérience compte
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Explorez par catégorie et trouvez exactement ce que vous cherchez
          </p>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map(({ icon: Icon, label, href }, i) => (
            <Reveal key={label} delay={i * 0.05} y={20}>
              <Link
                href={href}
                className="group relative flex h-full min-h-36 flex-col items-center gap-3 overflow-hidden rounded-xl border border-white/[0.05] bg-[#161618]/60 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/25 hover:bg-[#161618] hover:shadow-lg hover:shadow-amber-500/[0.04] md:min-h-40 md:p-6"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Corner arrow */}
                <ArrowUpRight className="absolute right-3 top-3 size-4 text-amber-400/0 transition-all duration-300 group-hover:text-amber-400/70" />

                <div className="relative flex size-12 items-center justify-center rounded-lg border border-amber-400/10 bg-amber-400/[0.03] transition-all duration-300 group-hover:scale-110 group-hover:border-amber-400/25 group-hover:bg-amber-400/[0.07] md:size-14">
                  <Icon
                    className="size-5 text-amber-400/80 transition-colors group-hover:text-amber-400 md:size-6"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="relative text-xs font-medium leading-snug text-white/65 transition-colors group-hover:text-white/95 md:text-sm">
                  {label}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* See all */}
        <Reveal className="mt-10 text-center md:mt-12" delay={0.1}>
          <Link
            href="/explorer"
            className="group inline-flex items-center gap-2 text-sm font-medium text-amber-400/70 transition-colors hover:text-amber-400"
          >
            Explorer toutes les catégories
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </AppContainer>
    </section>
  );
}
