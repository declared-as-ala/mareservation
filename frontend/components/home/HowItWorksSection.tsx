import Image from 'next/image';
import { AppContainer } from '@/components/shared/AppContainer';
import { Search, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

const steps = [
  {
    number: '01',
    title: 'Explorez le lieu',
    text: 'Visite virtuelle immersive pour découvrir chaque espace avant de réserver.',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80&auto=format&fit=crop',
    icon: Search,
  },
  {
    number: '02',
    title: 'Choisissez votre espace',
    text: "Table, VIP, terrasse — sélectionnez l'emplacement qui vous convient.",
    image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80&auto=format&fit=crop',
    icon: Calendar,
  },
  {
    number: '03',
    title: 'Réservez et payez',
    text: 'Paiement sécurisé en ligne, confirmation instantanée.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80&auto=format&fit=crop',
    icon: CreditCard,
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden bg-[#0B0B0C] py-16 text-white md:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-amber-500/[0.02] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-amber-600/[0.02] blur-[100px]" />

      <AppContainer className="relative z-10">
        {/* Header */}
        <Reveal className="mx-auto mb-12 max-w-2xl text-center md:mb-16 lg:mb-20">
          <div className="mx-auto mb-4 h-px w-12 bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-500/40" />
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-white/95 md:text-3xl">
            Comment ça marche
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Trois étapes simples pour vivre une expérience exceptionnelle
          </p>
        </Reveal>

        {/* Steps */}
        <div className="relative grid gap-4 sm:gap-5 md:grid-cols-3 md:gap-6">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[88px] hidden h-px bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 md:block"
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={i * 0.12}>
                <article className="group relative h-full overflow-hidden rounded-xl border border-white/[0.05] bg-[#161618]/50 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/20 hover:shadow-xl hover:shadow-black/50">
                  {/* Step number badge */}
                  <div className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-[#0B0B0C]/70 ring-1 ring-amber-400/25 backdrop-blur-sm">
                    <span className="text-xs font-bold text-amber-400/90">{step.number}</span>
                  </div>

                  {/* Image */}
                  <div className="relative h-44 overflow-hidden sm:h-48">
                    <Image
                      src={step.image}
                      alt=""
                      role="presentation"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-[#161618]/45 to-transparent" />

                    {/* Icon */}
                    <div className="absolute bottom-4 left-4 flex size-10 items-center justify-center rounded-lg bg-amber-400/[0.08] ring-1 ring-amber-400/15 backdrop-blur-sm transition-all duration-300 group-hover:bg-amber-400/[0.14] group-hover:ring-amber-400/30">
                      <Icon className="size-4 text-amber-400/90" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 pb-6 pt-4">
                    <h3 className="text-sm font-bold text-amber-300">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">{step.text}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* CTA */}
        <div className="relative z-20 mt-10 text-center md:mt-14">
          <Link
            href="/explorer"
            className="group relative z-20 inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-8 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-amber-500/40 active:translate-y-0"
          >
            Commencer l&apos;exploration
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </AppContainer>
    </section>
  );
}
