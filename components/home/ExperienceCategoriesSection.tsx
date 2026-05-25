'use client';

import Link from 'next/link';
import { Reveal } from './Reveal';

const categories = [
  {
    title: 'Hébergement',
    subtitle: 'Hôtels • Maisons d\'hôtes',
    href: '/explorer?type=HOTEL',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Arc above */}
        <path d="M20,55 A 30,30 0 0,1 80,55" fill="none" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        {/* Bed Frame */}
        <rect x="28" y="54" width="44" height="22" rx="3" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Pillows */}
        <rect x="33" y="47" width="14" height="7" rx="1.5" fill="url(#goldGradient)" />
        <rect x="53" y="47" width="14" height="7" rx="1.5" fill="url(#goldGradient)" />
        {/* Headboard */}
        <path d="M25,54 L25,40 C25,38 27,36 29,36 L71,36 C73,36 75,38 75,40 L75,54" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Legs */}
        <line x1="31" y1="76" x2="31" y2="81" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
        <line x1="69" y1="76" x2="69" y2="81" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Restauration',
    subtitle: 'Restaurants • Cafés',
    href: '/explorer?type=RESTAURANT',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Steam */}
        <path d="M43,21 C43,17 46,17 46,13" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
        <path d="M50,19 C50,15 53,15 53,11" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
        <path d="M57,21 C57,17 60,17 60,13" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
        {/* Dome Cloche */}
        <path d="M25,56 A 25,25 0 0,1 75,56 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Handle */}
        <circle cx="50" cy="28" r="3" fill="url(#goldGradient)" />
        {/* Plate */}
        <path d="M15,60 L85,60 L81,66 C80,67 78,68 76,68 L24,68 C22,68 20,67 19,66 Z" fill="url(#goldGradient)" />
      </svg>
    )
  },
  {
    title: 'Sorties',
    subtitle: 'Bars • Rooftops • Beach clubs',
    href: '/explorer?q=Bar',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Cocktail Glass */}
        <path d="M22,34 L48,60 L48,78 M32,78 L64,78" fill="none" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22,34 L58,34" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
        {/* Olive Stick */}
        <line x1="38" y1="50" x2="52" y2="24" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="52" cy="24" r="2.5" fill="url(#goldGradient)" />
        {/* Palm Tree */}
        <path d="M68,78 C68,56 76,46 82,44" fill="none" stroke="url(#goldGradient)" strokeWidth="3" strokeLinecap="round" />
        <path d="M82,44 C78,40 70,40 65,44 M82,44 C85,38 90,40 95,44 M82,44 C82,36 88,34 90,40" fill="none" stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Waves at the bottom */}
        <path d="M60,78 C65,76 70,80 75,78 C80,76 85,80 90,78" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Événements',
    subtitle: 'Théâtre • Matchs • Festivals',
    href: '/explorer?type=EVENT_SPACE',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Mask 1 (Happy) */}
        <path d="M20,44 C20,32 38,32 38,44 L38,60 C38,72 20,72 20,60 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="3" strokeLinejoin="round" />
        {/* Eyes & Smile */}
        <circle cx="26" cy="48" r="2" fill="url(#goldGradient)" />
        <circle cx="32" cy="48" r="2" fill="url(#goldGradient)" />
        <path d="M25,54 Q29,58 33,54" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
        
        {/* Mask 2 (Sad) */}
        <path d="M44,48 C44,36 62,36 62,48 L62,64 C62,76 44,76 44,64 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="3" strokeLinejoin="round" />
        {/* Eyes & Frown */}
        <circle cx="50" cy="52" r="2" fill="url(#goldGradient)" />
        <circle cx="56" cy="52" r="2" fill="url(#goldGradient)" />
        <path d="M49,60 Q53,56 57,60" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />

        {/* Fireworks */}
        <path d="M74,32 L80,32 M77,29 L77,35 M72,27 L82,37 M72,37 L82,27" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeLinecap="round" />
        <path d="M84,21 L86,21 M85,20 L85,22 M83,18 L87,24 M83,24 L87,18" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Business',
    subtitle: 'Réunions • Coworking',
    href: '/explorer?type=COWORKING',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Briefcase Body */}
        <rect x="26" y="42" width="48" height="34" rx="4" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Handle */}
        <path d="M41,42 L41,34 C41,32 43,30 45,30 L55,30 C57,30 59,32 59,34 L59,42" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Latch */}
        <rect x="46" y="52" width="8" height="8" rx="1.5" fill="url(#goldGradient)" />
        <line x1="26" y1="56" x2="74" y2="56" stroke="url(#goldGradient)" strokeWidth="1.5" opacity="0.6" />
      </svg>
    )
  },
  {
    title: 'Bien-être',
    subtitle: 'Spas • Piscines',
    href: '/explorer?q=Spa',
    icon: (
      <svg viewBox="0 0 100 100" className="size-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
        {/* Center petal */}
        <path d="M50,30 C45,45 45,65 50,75 C55,65 55,45 50,30 Z" fill="url(#goldGradient)" />
        {/* Left petal */}
        <path d="M50,45 C35,50 30,65 50,75 C35,68 40,52 50,45 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Right petal */}
        <path d="M50,45 C65,50 70,65 50,75 C65,68 60,52 50,45 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
        {/* Outer Left petal */}
        <path d="M50,55 C20,60 25,72 50,75 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="2" />
        {/* Outer Right petal */}
        <path d="M50,55 C80,60 75,72 50,75 Z" fill="none" stroke="url(#goldGradient)" strokeWidth="2" />
      </svg>
    )
  }
];

export function ExperienceCategoriesSection() {
  return (
    <section className="relative overflow-hidden bg-[#000000] py-20 text-white md:py-28">
      {/* Universal Gold Gradient Defs */}
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
      <div className="absolute -top-32 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.015] blur-[150px]" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
        {/* Header exact like the image */}
        <Reveal className="mx-auto mb-16 text-center">
          <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
            {/* Golden glowing shield */}
            <svg viewBox="0 0 100 110" className="w-16 h-18 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <path
                d="M50,5 L90,25 L90,65 C90,85 70,100 50,105 C30,100 10,85 10,65 L10,25 Z"
                fill="none"
                stroke="url(#goldGradient)"
                strokeWidth="3.5"
              />
              <path
                d="M50,12 L82,28 L82,62 C82,78 66,91 50,96 C34,91 18,78 18,62 L18,28 Z"
                fill="rgba(0,0,0,0.4)"
                stroke="url(#goldGradient)"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
            </svg>
            {/* MR Text inside */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span className="font-serif text-lg font-black tracking-widest text-amber-100">MR</span>
              <span className="text-[10px] text-amber-400 -mt-1 font-bold">✦</span>
            </div>
          </div>

          <h2 className="font-serif text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            Établissements
            <span className="block mt-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent font-serif">
              disponibles
            </span>
          </h2>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400/80">
            Visitez <span className="text-amber-500">•</span> Réservez <span className="text-amber-500">•</span> Payez en ligne
          </p>
        </Reveal>

        {/* 2-column cards layout exactly like the image */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map(({ title, subtitle, href, icon }, i) => (
            <Reveal key={title} delay={i * 0.06} y={24}>
              <Link
                href={href}
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-[24px] border border-amber-500/15 bg-zinc-950/80 p-8 text-center transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.12)] min-h-[220px]"
              >
                {/* Subtle inner gold glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                {/* Custom glowing icon */}
                <div className="relative mb-4 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  {icon}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-amber-200">
                  {title}
                </h3>
                
                {/* Subtitle */}
                <p className="mt-2 text-xs font-medium tracking-wide text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">
                  {subtitle}
                </p>

                {/* Golden separator bottom line */}
                <div className="mx-auto mt-5 h-[2px] w-6 bg-amber-500/40 rounded-full transition-all duration-500 group-hover:w-16 group-hover:bg-amber-400" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
