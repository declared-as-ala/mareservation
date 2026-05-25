'use client';

import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck, Play } from 'lucide-react';

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 text-amber-400">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    label: 'Visite virtuelle 360°',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 text-amber-400">
        <path d="M12 22V12" />
        <path d="m15 5-3-3-3 3" />
        <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        <path d="M7 7a8 8 0 0 1 10 0" />
      </svg>
    ),
    label: 'Choisissez votre table dans la vue',
  },
  {
    icon: <ShieldCheck className="size-5 text-amber-400" strokeWidth={1.8} />,
    label: 'Réservation instantanée & sécurisée',
  },
];

export function SplineHeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0f0f0f] mx-3 sm:mx-4 my-4 rounded-3xl border border-white/[0.06]">
      {/* Subtle top-left amber glow */}
      <div aria-hidden className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-amber-500/[0.08] blur-[90px] pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-amber-500/[0.05] blur-[70px] pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8 px-6 py-8 sm:px-8 sm:py-10">
        {/* ── Left column ── */}
        <div className="flex-1">
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              Immersive
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-serif text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl">
            Réservez ce que{' '}
            <span className="text-amber-400">vous voyez</span>
            , en 360°.
          </h2>

          {/* Sub-copy */}
          <p className="mt-4 text-sm leading-relaxed text-white/50 max-w-sm">
            Explorez cafés, restaurants, hôtels et événements en visite virtuelle.
            Choisissez votre table directement dans la vue —
            puis réservez en quelques secondes.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/explorer"
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-amber-400 px-6 text-sm font-bold text-black transition-all duration-300 hover:bg-amber-300 active:scale-95"
            >
              Explorer en 360°
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/comment-ca-marche"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-6 text-sm font-semibold text-white/80 transition-all hover:border-amber-400/40 hover:text-white"
            >
              Comment ça marche
              <span className="flex size-5 items-center justify-center rounded-full border border-white/20">
                <Play className="size-2.5 fill-current" />
              </span>
            </Link>
          </div>

          {/* Feature pills */}
          <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-5">
            {features.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-[12px] text-white/45">
                {icon}
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Right: 360° globe ── */}
        <div className="flex shrink-0 items-center justify-center lg:w-[200px]">
          <div className="relative flex items-center justify-center">
            {/* Outer glow rings */}
            <div className="absolute h-40 w-40 rounded-full border border-amber-400/10 animate-[spin_20s_linear_infinite]" />
            <div className="absolute h-52 w-52 rounded-full border border-amber-400/5 animate-[spin_30s_linear_infinite_reverse]" />
            {/* Main glowing circle */}
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/30 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
              {/* Latitude/longitude lines */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-30">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
                <ellipse cx="50" cy="50" rx="28" ry="45" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
                <ellipse cx="50" cy="50" rx="45" ry="18" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="#fbbf24" strokeWidth="0.6" />
                <line x1="50" y1="5" x2="50" y2="95" stroke="#fbbf24" strokeWidth="0.6" />
              </svg>
              <span className="relative font-serif text-3xl font-black text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                360°
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
