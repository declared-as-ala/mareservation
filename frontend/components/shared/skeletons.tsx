import { cn } from '@/lib/utils';

const skeletonBase = 'animate-pulse rounded-md bg-zinc-800/80';

function Sk({ className }: { className?: string }) {
  return <div className={cn(skeletonBase, className)} />;
}

export function VenueCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <Sk className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Sk className="h-4 w-3/4" />
        <Sk className="h-3 w-1/2" />
        <Sk className="h-9 w-full mt-2 rounded-xl" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <Sk className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Sk className="h-4 w-2/3" />
        <Sk className="h-3 w-1/2" />
        <Sk className="h-3 w-full" />
      </div>
    </div>
  );
}

export function ReservationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-4">
        <Sk className="h-16 w-24 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Sk className="h-4 w-48" />
          <Sk className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Sk className="h-3 w-full" />
        <Sk className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen p-6">
      <Sk className="aspect-[21/9] w-full rounded-2xl" />
      <div className="space-y-2">
        <Sk className="h-9 w-2/3" />
        <Sk className="h-5 w-1/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Sk className="h-32 rounded-xl" />
        <Sk className="h-32 rounded-xl" />
        <Sk className="h-32 rounded-xl" />
      </div>
      <Sk className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Sk className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
