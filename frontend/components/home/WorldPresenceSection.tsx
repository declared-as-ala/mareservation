import Image from 'next/image';
import { AppContainer } from '@/components/shared/AppContainer';
import { Globe2 } from 'lucide-react';
import { Reveal } from './Reveal';

const stats = [
  { value: '100%', label: 'Immersif' },
  { value: '360°', label: 'Immersion totale' },
  { value: 'Direct', label: 'Réservation de table' },
];

export function WorldPresenceSection() {
  return (
    <section className="relative min-h-[500px] overflow-hidden bg-[#111113] text-white md:min-h-[600px]">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&auto=format&fit=crop"
          alt=""
          fill
          className="object-cover opacity-15"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/85 to-[#111113]/95" />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-amber-500/[0.025] blur-[100px]" />
      <div className="absolute -bottom-20 right-1/4 h-72 w-72 rounded-full bg-amber-600/[0.025] blur-[100px]" />

      <AppContainer>
        <div className="relative z-10 flex min-h-[430px] flex-col items-center justify-center text-center md:min-h-[520px]">
          {/* Globe icon */}
          <Reveal>
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border border-amber-400/15 bg-amber-400/[0.04]">
              <Globe2 className="size-6 text-amber-400/80" strokeWidth={1.5} />
            </div>
          </Reveal>

          {/* Badge */}
          <Reveal delay={0.08}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/[0.04] px-4 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">
                Bientôt disponible
              </span>
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={0.14}>
            <h2 className="mx-auto max-w-3xl font-serif text-xl leading-relaxed text-white/90 sm:text-2xl md:text-3xl lg:text-4xl">
              La plateforme de réservation immersive,{' '}
              <strong className="font-bold text-amber-400/90">bientôt</strong> dans le monde
              entier
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/45">
              De Tunis à Paris, de Dubaï à Montréal — nous construisons le futur de la
              réservation d&apos;expériences.
            </p>
            <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-500/40" />
          </Reveal>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-5 sm:gap-8 md:mt-12 md:gap-16">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={0.2 + i * 0.1} y={16}>
                <div className="text-center">
                  <div className="font-serif text-2xl font-bold text-amber-400/90 md:text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-xs text-white/35">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </AppContainer>
    </section>
  );
}
