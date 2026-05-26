'use client';

import Link from 'next/link';
import { Reveal } from './Reveal';

const categories = [
  {
    title: 'Hébergement',
    subtitle: 'Hôtels • Maisons d\'hôtes',
    href: '/hotels',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Arc above */}
        <path d="M20,55 A 30,30 0 0,1 80,55" fill="none" stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        {/* Bed Frame */}
        <rect x="28" y="54" width="44" height="22" rx="3" fill="none" stroke="url(#g1)" strokeWidth="3" />
        {/* Pillows */}
        <rect x="33" y="47" width="14" height="7" rx="1.5" fill="url(#g1)" />
        <rect x="53" y="47" width="14" height="7" rx="1.5" fill="url(#g1)" />
        {/* Headboard */}
        <path d="M25,54 L25,40 C25,38 27,36 29,36 L71,36 C73,36 75,38 75,40 L75,54" fill="none" stroke="url(#g1)" strokeWidth="3" />
        {/* Legs */}
        <line x1="31" y1="76" x2="31" y2="81" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" />
        <line x1="69" y1="76" x2="69" y2="81" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Restauration',
    subtitle: 'Restaurants • Cafés',
    href: '/restaurants',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Steam */}
        <path d="M43,21 C43,17 46,17 46,13" fill="none" stroke="url(#g2)" strokeWidth="2" strokeLinecap="round" />
        <path d="M50,19 C50,15 53,15 53,11" fill="none" stroke="url(#g2)" strokeWidth="2" strokeLinecap="round" />
        <path d="M57,21 C57,17 60,17 60,13" fill="none" stroke="url(#g2)" strokeWidth="2" strokeLinecap="round" />
        {/* Dome Cloche */}
        <path d="M25,56 A 25,25 0 0,1 75,56 Z" fill="none" stroke="url(#g2)" strokeWidth="3" />
        {/* Handle */}
        <circle cx="50" cy="28" r="3" fill="url(#g2)" />
        {/* Plate */}
        <path d="M15,60 L85,60 L81,66 C80,67 78,68 76,68 L24,68 C22,68 20,67 19,66 Z" fill="url(#g2)" />
      </svg>
    ),
  },
  {
    title: 'Sorties',
    subtitle: 'Bars • Rooftops • Beach clubs',
    href: '/explorer?q=Bar',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Cocktail Glass */}
        <path d="M22,34 L48,60 L48,78 M32,78 L64,78" fill="none" stroke="url(#g3)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22,34 L58,34" stroke="url(#g3)" strokeWidth="3" strokeLinecap="round" />
        {/* Olive Stick */}
        <line x1="38" y1="50" x2="52" y2="24" stroke="url(#g3)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="52" cy="24" r="2.5" fill="url(#g3)" />
        {/* Palm Tree */}
        <path d="M68,78 C68,56 76,46 82,44" fill="none" stroke="url(#g3)" strokeWidth="3" strokeLinecap="round" />
        <path d="M82,44 C78,40 70,40 65,44 M82,44 C85,38 90,40 95,44 M82,44 C82,36 88,34 90,40" fill="none" stroke="url(#g3)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Événements',
    subtitle: 'Théâtre • Matchs • Festivals',
    href: '/evenements',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Comedy Mask */}
        <path d="M22,38 C22,26 42,26 42,38 C42,50 22,50 22,38 Z" fill="none" stroke="url(#g4)" strokeWidth="2.5" />
        <circle cx="28" cy="35" r="2" fill="url(#g4)" />
        <circle cx="36" cy="35" r="2" fill="url(#g4)" />
        <path d="M28,42 Q32,45 36,42" fill="none" stroke="url(#g4)" strokeWidth="2" strokeLinecap="round" />
        
        {/* Tragedy Mask */}
        <path d="M40,50 C40,38 60,38 60,50 C60,62 40,62 40,50 Z" fill="none" stroke="url(#g4)" strokeWidth="2.5" />
        <circle cx="46" cy="47" r="2" fill="url(#g4)" />
        <circle cx="54" cy="47" r="2" fill="url(#g4)" />
        <path d="M46,55 Q50,52 54,55" fill="none" stroke="url(#g4)" strokeWidth="2" strokeLinecap="round" />

        {/* Sparkles */}
        <path d="M72,25 L74,31 L80,31 L75,35 L77,41 L72,37 L67,41 L69,35 L64,31 L70,31 Z" fill="url(#g4)" />
        <path d="M82,45 L83,48 L86,48 L84,50 L85,53 L82,51 L79,53 L80,50 L78,48 L81,48 Z" fill="url(#g4)" opacity="0.8" />
      </svg>
    ),
  },
  {
    title: 'Bien-être',
    subtitle: 'Spas • Piscines',
    href: '/explorer?q=Spa',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Lotus Petals */}
        <path d="M50,30 C45,45 35,55 50,80 C65,55 55,45 50,30 Z" fill="url(#g5)" />
        <path d="M50,45 C35,55 25,65 40,80 C50,75 50,65 50,45 Z" fill="url(#g5)" opacity="0.85" />
        <path d="M50,45 C65,55 75,65 60,80 C50,75 50,65 50,45 Z" fill="url(#g5)" opacity="0.85" />
        <path d="M50,60 C25,65 15,75 30,80 C40,80 45,75 50,60 Z" fill="url(#g5)" opacity="0.7" />
        <path d="M50,60 C75,65 85,75 70,80 C60,80 55,75 50,60 Z" fill="url(#g5)" opacity="0.7" />
      </svg>
    ),
  },
  {
    title: 'Business',
    subtitle: 'Réunions • Coworking',
    href: '/coworking',
    icon: (
      <svg viewBox="0 0 100 100" className="size-14">
        <defs>
          <linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Briefcase Body */}
        <rect x="26" y="42" width="48" height="34" rx="4" fill="none" stroke="url(#g6)" strokeWidth="3" />
        {/* Handle */}
        <path d="M41,42 L41,34 C41,32 43,30 45,30 L55,30 C57,30 59,32 59,34 L59,42" fill="none" stroke="url(#g6)" strokeWidth="3" />
        {/* Latch */}
        <rect x="46" y="52" width="8" height="8" rx="1.5" fill="url(#g6)" />
        <line x1="26" y1="56" x2="74" y2="56" stroke="url(#g6)" strokeWidth="1.5" opacity="0.6" />
      </svg>
    ),
  },
];

export function ExperienceCategoriesSection() {
  return (
    <section className="bg-[#0B0B0C] px-4 pb-10 pt-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <Reveal className="mb-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Accès rapide
          </p>
          <h2 className="font-sans text-2xl font-bold text-white sm:text-3xl">
            Établissements{' '}
            <span className="text-amber-400">disponibles</span>{' '}
            <span className="text-amber-400">✦</span>
          </h2>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
          {categories.map(({ title, subtitle, href, icon }, i) => (
            <Reveal key={title} delay={i * 0.04} y={16}>
              <Link
                href={href}
                className="group flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#111111] px-1 py-4 text-center transition-all duration-300 hover:border-amber-400/30 hover:bg-[#161616] active:scale-95 sm:rounded-2xl sm:px-2 sm:py-5"
              >
                {/* Icon */}
                <div className="mb-2 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] [&_svg]:size-9 sm:[&_svg]:size-14 sm:mb-3">
                  {icon}
                </div>
                {/* Title */}
                <p className="text-[11px] font-bold text-white group-hover:text-amber-200 transition-colors sm:text-[13px]">
                  {title}
                </p>
                {/* Subtitle */}
                <p className="mt-0.5 text-[8.5px] text-zinc-500 leading-tight sm:text-xs">
                  {subtitle}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Explore CTA */}
        <Reveal className="mt-8 text-center" delay={0.3}>
          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-6 py-2.5 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-400/10 hover:border-amber-400/60"
          >
            Explorer toutes les catégories
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
