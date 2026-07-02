'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Play, Globe } from 'lucide-react';

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
    label: 'Choisissez votre espace dans la vue',
  },
  {
    Icon: ShieldCheck,
    label: 'Réservation instantanée & sécurisée',
  },
];

export function SplineHeroSection() {
  return (
    <>
      {/* ═══════════════════════════════════════════
          MOBILE VERSION (< md) — ultra-compact hero
          ─────────────────────────────────────────── */}
      <section className="relative mx-3 my-3 overflow-hidden rounded-3xl border border-amber-400/[0.12] bg-gradient-to-br from-[#15110a] via-[#0f0f10] to-[#0a0a0b] md:hidden">
        {/* Atmosphere */}
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/[0.12] blur-[70px] pointer-events-none" />
        <div aria-hidden className="absolute -bottom-10 left-0 h-32 w-32 rounded-full bg-amber-500/[0.06] blur-[50px] pointer-events-none" />
        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative orb in the background — right side */}
        <div aria-hidden className="absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative flex items-center justify-center opacity-90">
            <div className="absolute h-[170px] w-[170px] rounded-full border border-amber-400/[0.10] animate-[spin_30s_linear_infinite]" />
            <div className="absolute h-[130px] w-[130px] rounded-full border border-amber-400/[0.14] animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute h-[110px] w-[110px] rounded-full bg-amber-500/[0.14] blur-[40px]" />
            <GlobeOrb size="sm" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-4 px-5 py-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-1">
            <span className="text-amber-400 text-[11px] leading-none">✦</span>
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Immersive</span>
          </div>

          {/* Headline — tighter, fits within ~60% width to leave room for orb */}
          <h2 className="max-w-[68%] font-serif text-[26px] font-black leading-[1.05] tracking-tight text-white">
            Réservez ce que{' '}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              vous voyez
            </span>
            , en 360°.
          </h2>

          {/* Compact sub-copy */}
          <p className="max-w-[80%] text-[12px] leading-snug text-white/55">
            Réservez tout simplement.
          </p>

          {/* CTAs — primary full-width, secondary as inline link */}
          <div className="flex flex-col gap-2">
            <Link
              href="/explorer"
              className="group inline-flex h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)] transition-all active:scale-[0.98]"
            >
              Explorer en 360°
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/comment-ca-marche"
              className="group inline-flex items-center justify-center gap-1.5 self-center text-[12px] font-semibold text-white/65 transition-colors hover:text-amber-300"
            >
              <span className="flex size-4 items-center justify-center rounded-full border border-white/25">
                <Play className="size-2 fill-current" />
              </span>
              Comment ça marche
            </Link>
          </div>

          {/* Compact features strip */}
          <div className="mt-1 flex items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-black/30 px-3 py-2 backdrop-blur-sm">
            {features.map(({ Icon, label }, i) => (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                {i > 0 && <div className="h-5 w-px shrink-0 bg-white/[0.08]" />}
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/[0.12]">
                  <Icon className="size-2.5 text-amber-400" />
                </span>
                <span className="text-[8.5px] font-medium leading-[1.1] text-white/55 line-clamp-2">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DESKTOP VERSION (≥ md) — compact panel hero
          ─────────────────────────────────────────── */}
      <section className="relative hidden bg-[#0B0B0C] px-4 py-4 sm:px-6 md:block">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0f0f10]">
          {/* Background atmosphere */}
          <div aria-hidden className="absolute -left-32 top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-amber-500/[0.06] blur-[150px] pointer-events-none" />
          <div aria-hidden className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-amber-600/[0.04] blur-[120px] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-[1.4fr_1fr] items-center gap-8 px-10 pb-8 pt-10 lg:px-14 lg:pb-10 lg:pt-12">
            {/* ── LEFT: copy ── */}
            <div className="flex flex-col">
              {/* Eyebrow badge */}
              <div className="mb-6 inline-flex items-center self-start gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-3 py-1.5">
                <span className="text-amber-400 text-[12px] leading-none">+</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
                  Immersive
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-4xl font-black leading-[1.08] tracking-tight text-white lg:text-5xl">
                Réservez ce que{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  vous voyez
                </span>
                , en 360°.
              </h1>

              {/* Sub-copy */}
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
                Explorez cafés, restaurants, hôtels et événements en visite virtuelle.
                Réservez tout simplement.
              </p>

              {/* CTA buttons */}
              <div className="mt-7 flex items-center gap-3">
                <Link
                  href="/explorer"
                  className="group inline-flex h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-7 text-sm font-bold text-black shadow-[0_8px_30px_rgba(245,158,11,0.30)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  Explorer en 360°
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/comment-ca-marche"
                  className="group inline-flex h-[46px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/75 backdrop-blur-sm transition-all duration-300 hover:border-amber-400/35 hover:bg-amber-400/[0.06] hover:text-white"
                >
                  Comment ça marche
                  <span className="flex size-5 items-center justify-center rounded-full border border-white/20 bg-white/5">
                    <Play className="size-2.5 fill-current" />
                  </span>
                </Link>
              </div>
            </div>

            {/* ── RIGHT: 360° visual ── */}
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-[260px] w-[260px] rounded-full border border-amber-400/[0.07] animate-[spin_30s_linear_infinite]" />
                <div className="absolute h-[200px] w-[200px] rounded-full border border-amber-400/[0.1] animate-[spin_20s_linear_infinite_reverse]" />
                <div className="absolute h-[180px] w-[180px] rounded-full bg-amber-500/[0.1] blur-[50px]" />
                <GlobeOrb size="lg" />
              </div>
            </div>
          </div>

          {/* Bottom features strip */}
          <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/[0.06] px-10 py-5 lg:px-14">
            {features.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-[12px] text-white/55">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/[0.06]">
                  <Icon className="size-3.5 text-amber-400" strokeWidth={1.8} />
                </span>
                <span className="leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
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
