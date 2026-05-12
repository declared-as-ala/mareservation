import Image from 'next/image';
import { AppContainer } from '@/components/shared/AppContainer';
import { Search, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
    text: 'Table, VIP, terrasse — sélectionnez l\'emplacement qui vous convient.',
    image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80&auto=format&fit=crop',
    icon: Calendar,
  },
  {
    number: '03',
    title: 'Réservez et payez',
    text: 'Paiement sécurisé en ligne, confirmation instantanée.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    icon: CreditCard,
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-[#0B0B0C] py-16 text-white md:py-24 lg:py-28">
      {/* Top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Ambient glows */}
      <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-amber-500/[0.015] blur-[100px]" />
      <div className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-amber-600/[0.015] blur-[100px]" />

      <AppContainer>
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16 lg:mb-20">
          <div className="mx-auto mb-4 h-px w-12 bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-500/40" />
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-white/95 md:text-3xl">
            Comment ça marche
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Trois étapes simples pour vivre une expérience exceptionnelle
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3 md:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#161618]/50 transition-all duration-300 hover:border-amber-400/15 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
              >
                {/* Step number badge */}
                <div className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-[#0B0B0C]/60 ring-1 ring-amber-400/20 backdrop-blur-sm">
                  <span className="text-xs font-bold text-amber-400/80">{step.number}</span>
                </div>

                {/* Image */}
                <div className="relative h-40 overflow-hidden sm:h-44">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-[#161618]/40 to-transparent" />

                  {/* Icon */}
                  <div className="absolute bottom-4 left-4 flex size-9 items-center justify-center rounded-lg bg-amber-400/[0.06] ring-1 ring-amber-400/10 backdrop-blur-sm">
                    <Icon className="size-4 text-amber-400/80" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300/80">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                    {step.text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center md:mt-14">
          <Link
            href="/explorer"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 px-8 py-3.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/15 transition-all duration-300 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Commencer l&apos;exploration
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </AppContainer>
    </section>
  );
}
