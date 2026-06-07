'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SectionCarouselProps<T> {
  title: string;
  subtitle?: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Skeleton to show when loading */
  isLoading?: boolean;
  skeletonCount?: number;
  renderSkeleton?: (index: number) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  className?: string;
}

const defaultSkeleton = (i: number) => (
  <div key={i} className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]">
    <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-muted" />
    <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
    <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-muted" />
  </div>
);

export function SectionCarousel<T>({
  title,
  subtitle,
  seeMoreHref,
  seeMoreLabel = 'Voir plus',
  items,
  renderItem,
  isLoading,
  skeletonCount = 4,
  renderSkeleton = defaultSkeleton,
  emptyMessage,
  className,
}: SectionCarouselProps<T>) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    skipSnaps: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    breakpoints: {
      '(min-width: 1024px)': { slidesToScroll: 1 },
      '(min-width: 768px)': { slidesToScroll: 1 },
    },
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateArrows = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateArrows();
    emblaApi.on('select', updateArrows);
    emblaApi.on('reInit', updateArrows);
  }, [emblaApi, updateArrows]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  const showContent = !isLoading && items.length > 0;
  const showEmpty = !isLoading && items.length === 0 && emptyMessage;

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {seeMoreHref && (
            <Link
              href={seeMoreHref}
              className="text-sm font-medium text-primary hover:underline"
            >
              {seeMoreLabel}
            </Link>
          )}
          {showContent && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                aria-label="Précédent"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={scrollNext}
                disabled={!canScrollNext}
                aria-label="Suivant"
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: skeletonCount }).map((_, i) => renderSkeleton(i))}
        </div>
      )}

      {showEmpty && <div className="py-8">{emptyMessage}</div>}

      {showContent && (
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y gap-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
              >
                <div className="transition-transform hover:scale-[1.02] focus-within:scale-[1.02]">
                  {renderItem(item, index)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
