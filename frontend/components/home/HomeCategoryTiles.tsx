import Link from 'next/link';
import Image from 'next/image';
import { Coffee, UtensilsCrossed, Building2, Film, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { label: 'Cafés', href: '/cafes', icon: Coffee, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80' },
  { label: 'Hôtels', href: '/hotels', icon: Building2, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80' },
  { label: 'Cinéma', href: '/cinema', icon: Film, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80' },
  { label: 'Événements', href: '/evenements', icon: Calendar, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80' },
];

export function HomeCategoryTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.href}
          href={cat.href}
          className={cn(
            'group relative flex min-h-[120px] flex-col justify-end overflow-hidden rounded-xl border bg-muted',
            'transition-transform hover:scale-[1.02] focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <Image src={cat.image} alt="" fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 640px) 50vw, 200px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <span className="relative z-10 p-4 font-semibold text-white drop-shadow">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
