'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Play, Globe, Star, Users, Building2 } from 'lucide-react';

/* ─── Feature list ─── */
const features = [
  {
    Icon: Globe,
    label: 'Visite virtuelle 360°',
  },
  {
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    label: 'Choisissez votre table dans la vue',
  },
  {
    Icon: ShieldCheck,
    label: 'Réservation instantanée & sécurisée',
  },
];

/* ─── Stats ─── */
const stats = [
  { value: '500+', label: 'Établissements', Icon: () => <Building2 className="size-3 text-amber-400" /> },
  { value: '4.9', label: 'Note moyenne', Icon: () => <Star className="size-3 fill-amber-400 text-amber-400" /> },
  { value: '12k+', label: 'Réservations', Icon: () => <Users className="size-3 text-amber-400" /> },
];

export function SplineHeroSection() {
  return (
    <>
      {/* ═══════════════════════════════════════════
          MOBILE VERSION (< md)  — compact card
          ─────────────────────────────────────────── */}
      <section className="relative mx-3 my-4 overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0f0f0f] md:hidden">
        <div aria-hidden className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-amber-500/[0.08] blur-[90px] pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-amber-500/[0.05] blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 px-6 py-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Immersive</span>
          </div>

          <div className="flex items-start gap-4">
            {/* Copy */}
            <div className="flex-1">
              <h2 className="font-serif text-3xl font-bold leading-[1.1] text-white">
                Réservez ce que{' '}
                <span className="text-amber-400">vous voyez</span>, en 360°.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Explorez cafés, restaurants, hôtels et événements en visite virtuelle.
                Choisissez votre table directement dans la vue — puis réservez en quelques secondes.
              </p>
            </div>
            {/* Mini globe */}
            <div className="flex shrink-0 items-center justify-center">
              <GlobeOrb size="sm" />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link href="/explorer" className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-amber-400 px-6 text-sm font-bold text-black transition-all hover:bg-amber-300 active:scale-95">
              Explorer en 360°
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/comment-ca-marche" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-semibold text-white/80 transition-all hover:border-amber-400/40 hover:text-white">
              Comment ça marche
              <span className="flex size-5 items-center justify-center rounded-full border border-white/20">
                <Play className="size-2.5 fill-current" />
              </span>
            </Link>
          </div>

          {/* Feature Row — 3 columns aligned horizontally */}
          <div className="mt-2 pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-2">
            {features.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 px-0.5 text-center">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.06]">
                  <Icon className="size-3.5 text-amber-400" />
                </div>
                <span className="text-[8px] leading-tight text-white/45 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DESKTOP VERSION (≥ md) — cinematic full hero
          ─────────────────────────────────────────── */}
      <section className="relative hidden overflow-hidden bg-[#080808] md:block">
        {/* ── Background atmosphere ── */}
        {/* Radial amber bloom — left */}
        <div aria-hidden className="absolute -left-48 top-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-amber-500/[0.07] blur-[180px] pointer-events-none" />
        {/* Radial amber bloom — right */}
        <div aria-hidden className="absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-amber-600/[0.05] blur-[150px] pointer-events-none" />
        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Top fade border */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 items-center gap-12 px-8 py-20 xl:px-12 xl:py-24">
          {/* ── LEFT: copy ── */}
          <div className="flex flex-col">
            {/* Eyebrow badge */}
            <div className="mb-8 inline-flex items-center self-start gap-2.5 rounded-full border border-amber-400/25 bg-gradient-to-r from-amber-400/10 to-amber-500/5 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
                Plateforme immersive · 360°
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl font-black leading-[1.04] tracking-tight text-white xl:text-6xl 2xl:text-7xl">
              Réservez ce que{' '}
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  vous voyez
                </span>
                {/* Underline accent */}
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/60 to-amber-400/0" />
              </span>
              ,{' '}en 360°.
            </h1>

            {/* Sub-copy */}
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/50">
              Explorez cafés, restaurants, hôtels et événements en visite
              virtuelle immersive. Choisissez votre table directement dans
              la vue — puis réservez en quelques secondes.
            </p>

            {/* CTA buttons */}
            <div className="mt-9 flex items-center gap-4">
              <Link
                href="/explorer"
                className="group inline-flex h-[52px] items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-8 text-sm font-bold text-black shadow-[0_8px_30px_rgba(245,158,11,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(245,158,11,0.50)] active:translate-y-0"
              >
                Explorer en 360°
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
              <Link
                href="/comment-ca-marche"
                className="group inline-flex h-[52px] items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/75 backdrop-blur-sm transition-all duration-300 hover:border-amber-400/35 hover:bg-amber-400/[0.06] hover:text-white"
              >
                Comment ça marche
                <span className="flex size-6 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-all group-hover:border-amber-400/40 group-hover:bg-amber-400/10">
                  <Play className="size-2.5 fill-current" />
                </span>
              </Link>
            </div>

            {/* Feature list */}
            <ul className="mt-10 flex gap-7">
              {features.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[12px] text-white/40">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.06]">
                    <Icon className="size-3.5 text-amber-400" strokeWidth={1.8} />
                  </span>
                  <span className="leading-tight">{label}</span>
                </li>
              ))}
            </ul>

            {/* Stats bar */}
            <div className="mt-10 flex items-center gap-6 border-t border-white/[0.06] pt-8">
              {stats.map(({ value, label, Icon }, i) => (
                <div key={label} className="flex items-center gap-3">
                  {i > 0 && <div className="h-7 w-px bg-white/[0.07]" />}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Icon />
                      <span className="font-serif text-xl font-black text-white">{value}</span>
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: 360° visual ── */}
          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Outer pulse rings */}
              <div className="absolute h-[380px] w-[380px] rounded-full border border-amber-400/[0.06] animate-[spin_40s_linear_infinite]" />
              <div className="absolute h-[300px] w-[300px] rounded-full border border-amber-400/[0.09] animate-[spin_25s_linear_infinite_reverse]" />
              <div className="absolute h-[220px] w-[220px] rounded-full border border-amber-400/[0.14] animate-[spin_15s_linear_infinite]" />

              {/* Glow bloom */}
              <div className="absolute h-[240px] w-[240px] rounded-full bg-amber-500/[0.12] blur-[60px]" />

              {/* Main orb */}
              <GlobeOrb size="lg" />

              {/* Floating badges */}
              <div className="absolute -top-8 right-0 flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-zinc-900/90 px-3.5 py-2 backdrop-blur-md shadow-xl">
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-white/80">En ligne maintenant</span>
              </div>

              <div className="absolute -bottom-6 left-2 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3.5 py-2 backdrop-blur-md shadow-xl">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-bold text-white">4.9</span>
                <span className="text-[11px] text-zinc-500">· 12k réservations</span>
              </div>

              <div className="absolute -left-4 top-1/4 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2 backdrop-blur-md shadow-xl">
                <Building2 className="size-3.5 shrink-0 text-amber-400" />
                <span className="text-[11px] font-semibold text-white/80">500+ lieux</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0B0C] to-transparent" />
      </section>
    </>
  );
}

/* ─── Shared globe orb (size: sm | lg) ─── */
function GlobeOrb({ size }: { size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 180 : 110;
  const textSize = size === 'lg' ? 'text-4xl' : 'text-2xl';

  return (
    <div
      className={`relative flex items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-400/15 via-amber-500/8 to-transparent shadow-[0_0_50px_rgba(245,158,11,0.22)]`}
      style={{ width: dim, height: dim }}
    >
      {/* Globe SVG lines */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-25 pointer-events-none">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="0.7" />
        <ellipse cx="50" cy="50" rx="30" ry="46" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
        <ellipse cx="50" cy="50" rx="46" ry="20" fill="none" stroke="#fbbf24" strokeWidth="0.6" />
        <ellipse cx="50" cy="50" rx="46" ry="38" fill="none" stroke="#fbbf24" strokeWidth="0.4" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fbbf24" strokeWidth="0.6" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fbbf24" strokeWidth="0.6" />
      </svg>
      {/* Center text */}
      <span className={`relative font-serif font-black text-amber-400 drop-shadow-[0_0_16px_rgba(245,158,11,0.9)] ${textSize}`}>
        360°
      </span>
    </div>
  );
}
