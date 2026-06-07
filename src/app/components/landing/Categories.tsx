import {
  Coffee,
  Wine,
  UtensilsCrossed,
  Sparkles,
  Users,
  Building2,
  Sun,
  Heart,
} from 'lucide-react';
import { categories } from '../../data/landingData';

const iconMap = {
  coffee: Coffee,
  cocktail: Wine,
  restaurant: UtensilsCrossed,
  champagne: Sparkles,
  events: Users,
  hotel: Building2,
  beach: Sun,
  spa: Heart,
} as const;

export function Categories() {
  return (
    <section className="w-full bg-landing-bg py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-landing-gold text-lg md:text-xl font-medium mb-10 md:mb-12">
          <span className="block w-16 h-px bg-landing-border mx-auto mb-4" />
          Tous les lieux où l'expérience compte
          <span className="block w-16 h-px bg-landing-border mx-auto mt-4" />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 md:gap-8">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon];
            return (
              <div
                key={cat.label}
                className="flex flex-col items-center text-center gap-3 group"
              >
                <div className="flex items-center justify-center w-12 h-12 text-landing-gold">
                  <Icon className="w-8 h-8 md:w-9 md:h-9" strokeWidth={1.25} />
                </div>
                <span className="text-landing-text text-sm font-medium leading-snug">
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
