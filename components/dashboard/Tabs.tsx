'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** Animated underline tab bar — shared dashboard pattern. */
export function Tabs({
  items,
  active,
  onChange,
  layoutId = 'dash-tab-underline',
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-white/[0.07]', className)}>
      {items.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative whitespace-nowrap px-3.5 pb-3 pt-1.5 text-sm font-medium transition-colors',
              isActive ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive ? 'bg-amber-400/15 text-amber-400' : 'bg-white/[0.06] text-neutral-500'
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-400"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
