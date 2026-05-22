'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight';
import { Immersive360Preview } from './Immersive360Preview';

const features = [
  { icon: Compass, label: 'Visite virtuelle 360°' },
  { icon: Sparkles, label: 'Choisissez votre table dans la vue' },
  { icon: ShieldCheck, label: 'Réservation instantanée & sécurisée' },
];

const stats = [
  { value: '500+', label: 'Lieux à explorer' },
  { value: '360°', label: 'Immersion totale' },
  { value: '4.9', label: 'Note moyenne', suffix: '★' },
];

export function SplineHeroSection() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.085, delayChildren: 0.12 } },
  };

  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#0B0B0C]">
      {/* Faint grid, masked toward the top */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent)]"
      />

      {/* Ambient gold glows */}
      <div aria-hidden className="absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-amber-500/[0.06] blur-[150px]" />
      <div aria-hidden className="absolute -bottom-48 right-0 -z-10 h-[460px] w-[460px] rounded-full bg-amber-600/[0.05] blur-[150px]" />

      {/* Aceternity spotlight sweep */}
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="rgba(212, 175, 55, 0.7)" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 pb-16 pt-12 sm:px-6 md:px-10 lg:min-h-[calc(100vh-90px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6 lg:pb-20 lg:pt-14">
        {/* ─── Left: copy ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
        >
          {/* Eyebrow */}
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-1.5 backdrop-blur-sm"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
              Plateforme de réservation immersive
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="mt-6 max-w-xl font-serif text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[68px]"
          >
            Réservez ce que{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              vous voyez
            </span>
            , en 360°.
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={item}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55 sm:text-base"
          >
            Explorez cafés, restaurants, hôtels et événements en visite virtuelle.
            Choisissez votre table directement dans la vue — puis réservez en
            quelques secondes.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
            <Link
              href="/explorer"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-7 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-amber-500/40 active:translate-y-0"
            >
              Explorer en 360°
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/85 backdrop-blur-sm transition-all duration-200 hover:border-amber-400/30 hover:bg-amber-400/[0.05] hover:text-white"
            >
              Comment ça marche
            </a>
          </motion.div>

          {/* Feature pills */}
          <motion.ul
            variants={item}
            className="mt-9 flex flex-wrap justify-center gap-x-5 gap-y-2.5 lg:justify-start"
          >
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-[13px] text-white/45">
                <Icon className="size-4 text-amber-400/70" strokeWidth={1.5} />
                {label}
              </li>
            ))}
          </motion.ul>

          {/* Stats */}
          <motion.div
            variants={item}
            className="mt-9 grid w-full max-w-md grid-cols-3 gap-4 border-t border-white/[0.06] pt-7"
          >
            {stats.map(({ value, label, suffix }) => (
              <div key={label} className="text-center lg:text-left">
                <div className="font-serif text-2xl font-bold text-white md:text-3xl">
                  {value}
                  {suffix && <span className="text-amber-400">{suffix}</span>}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-white/35">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ─── Right: immersive 360° reservation preview ─── */}
        <div className="relative h-[340px] w-full sm:h-[420px] lg:h-[78vh] lg:max-h-[680px]">
          <Immersive360Preview />
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0B0C] to-transparent"
      />
    </section>
  );
}
