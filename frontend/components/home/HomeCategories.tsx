import Link from 'next/link';
import { Coffee, UtensilsCrossed, Building2, Film, Calendar } from 'lucide-react';

const CATEGORIES = [
  { label: 'Cafés', href: '/cafes', icon: Coffee },
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed },
  { label: 'Hôtels', href: '/hotels', icon: Building2 },
  { label: 'Cinéma', href: '/cinema', icon: Film },
  { label: 'Événements', href: '/evenements', icon: Calendar },
];

export function HomeCategories() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return (
          <Link
            key={cat.href}
            href={cat.href}
            className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 font-medium transition-colors hover:bg-muted/50 hover:border-primary/30"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-7" />
            </div>
            <span>{cat.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
