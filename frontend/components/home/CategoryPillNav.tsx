'use client';

import Link from 'next/link';
import { BedDouble, UtensilsCrossed, Coffee, Calendar, Briefcase, Sparkles, Clapperboard } from 'lucide-react';

interface Pill {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const PILLS: Pill[] = [
  { label: 'Hôtels', href: '/hotels', Icon: BedDouble },
  { label: 'Restaurants', href: '/restaurants', Icon: UtensilsCrossed },
  { label: 'Cafés', href: '/cafes', Icon: Coffee },
  { label: 'Événements', href: '/evenements', Icon: Calendar },
  { label: 'Coworking', href: '/coworking', Icon: Briefcase },
  { label: 'Bien-être', href: '/bien-etre', Icon: Sparkles },
  { label: 'Cinéma', href: '/cinema', Icon: Clapperboard },
];

export function CategoryPillNav() {
  return (
    <section className="bg-[#0B0B0C] px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-4">
      <div className="mx-auto max-w-7xl">
        {/* Mobile: horizontal scroll */}
        <div className="md:hidden">
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 snap-x snap-mandatory">
            {PILLS.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.08] bg-[#111111] px-4 py-2 transition-all duration-200 hover:border-amber-400/40 hover:bg-amber-400/[0.06] active:scale-95"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-400/[0.10] text-amber-400 transition-colors group-hover:bg-amber-400/20">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-[12px] font-semibold text-white/85 whitespace-nowrap">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop: centered pills */}
        <div className="hidden md:flex md:items-center md:justify-center md:gap-2 md:rounded-2xl md:border md:border-white/[0.06] md:bg-[#0f0f10] md:px-3 md:py-3">
          {PILLS.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="group relative flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200 hover:bg-amber-400/[0.08]"
            >
              <Icon className="size-4 text-amber-400/80 transition-colors group-hover:text-amber-400" />
              <span className="text-sm font-semibold text-white/75 transition-colors group-hover:text-white">
                {label}
              </span>
              <span className="absolute inset-x-3 bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
