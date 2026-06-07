import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ className, variant = 'text', width, height, animation = 'pulse' }: SkeletonProps) {
  const baseClasses = 'bg-zinc-800';

  const animationClass = animation === 'pulse'
    ? 'animate-pulse'
    : animation === 'wave'
      ? 'animate-shimmer'
      : '';

  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, animationClass, variantClasses[variant], className)}
      style={style}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/60">
      <Skeleton variant="circular" width={48} height={48} className="mx-auto" />
      <Skeleton variant="text" height={24} className="w-3/4 mx-auto" />
      <Skeleton variant="text" height={16} className="w-1/2 mx-auto" />
      <div className="space-y-2 pt-4">
        <Skeleton variant="text" height={48} />
        <Skeleton variant="text" height={48} />
      </div>
      <Skeleton variant="text" height={48} className="mt-4" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={16} className="w-1/3" />
            <Skeleton variant="text" height={14} className="w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="text" height={14} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-zinc-800/60">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} variant="text" height={14} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ cols = 3, count }: { cols?: number; count?: number }) {
  const items = count || cols * 2;
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
