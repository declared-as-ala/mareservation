'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem, MenuCategory } from '@/lib/api/types';

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entree: 'Entrées',
  plat: 'Plats',
  dessert: 'Desserts',
  boisson: 'Boissons',
  autre: 'Autres',
};

const CATEGORY_ORDER: MenuCategory[] = ['entree', 'plat', 'dessert', 'boisson', 'autre'];

/**
 * Premium tabbed menu display for café / restaurant detail pages.
 * Generated with Magic MCP, adapted to the Exploria360 design system.
 */
export function VenueMenuSection({ items }: { items: MenuItem[] }) {
  const available = items.filter((i) => i.isAvailable !== false);

  const counts = available.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const categories = CATEGORY_ORDER.filter((c) => (counts[c] ?? 0) > 0);
  const [selected, setSelected] = useState<MenuCategory>(categories[0] ?? 'plat');
  const activeCategory = categories.includes(selected) ? selected : categories[0];

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0C0C0C] p-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/[0.03]">
          <UtensilsCrossed className="size-8 text-neutral-700" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-400">Menu bientôt disponible</h3>
          <p className="mt-1 text-sm text-neutral-600">La carte de ce lieu n&apos;est pas encore en ligne.</p>
        </div>
      </div>
    );
  }

  const shown = available.filter((i) => i.category === activeCategory);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0C0C0C]">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] p-4">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelected(cat)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
              activeCategory === cat
                ? 'bg-amber-400 text-black'
                : 'bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200'
            )}
          >
            {CATEGORY_LABELS[cat]}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                activeCategory === cat ? 'bg-black/15 text-black' : 'bg-white/[0.06] text-neutral-500'
              )}
            >
              {counts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {shown.map((item) => (
              <div key={item._id} className="group flex gap-4">
                {item.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-20 shrink-0 rounded-xl border border-white/[0.06] object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-100 transition-colors group-hover:text-amber-300">
                      {item.name}
                    </h3>
                    {item.isPopular && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                        <Star className="size-2.5 fill-amber-400" />
                        Populaire
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm leading-relaxed text-neutral-500">{item.description}</p>
                  )}
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.allergens.map((a) => (
                        <span
                          key={a}
                          className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-neutral-600"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-3">
                    <span className="flex-1 border-b border-dotted border-white/[0.1]" />
                    <span className="shrink-0 text-base font-bold text-amber-400">
                      {item.price.toLocaleString('fr-TN')} TND
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
