'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyReservations, cancelReservation } from '@/lib/api/reservations';
import { ReservationCard } from '@/components/cards/ReservationCard';
import { ReservationCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Calendar,
  CalendarDays,
  Clock3,
  Search,
  Sparkles,
  Ticket,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function StatPanel({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <Icon className="size-4" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Compte</span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: reservations = [], isLoading, isError, error } = useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: fetchMyReservations,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations', 'me'] }),
  });

  const now = new Date();
  const pending = useMemo(() => reservations.filter((r) => ['PENDING', 'pending'].includes(r.status)), [reservations]);
  const upcoming = useMemo(
    () => reservations.filter((r) => new Date(r.startAt) >= now && ['CONFIRMED', 'confirmed', 'checked_in'].includes(r.status)),
    [reservations, now]
  );
  const past = useMemo(
    () => reservations.filter((r) => new Date(r.startAt) < now && !['CANCELLED', 'cancelled'].includes(r.status)),
    [reservations, now]
  );
  const cancelled = useMemo(() => reservations.filter((r) => ['CANCELLED', 'cancelled'].includes(r.status)), [reservations]);

  const filterBySearch = (list: typeof reservations) => {
    if (!search.trim()) return list;
    const s = search.toLowerCase();

    return list.filter((r) => {
      const venueName = typeof r.venueId === 'object' ? r.venueId?.name : '';
      const code = r.confirmationCode ?? '';
      return venueName?.toLowerCase().includes(s) || code.toLowerCase().includes(s);
    });
  };

  const searchedPending = filterBySearch(pending);
  const searchedUpcoming = filterBySearch(upcoming);
  const searchedPast = filterBySearch(past);
  const searchedCancelled = filterBySearch(cancelled);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-amber-400/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_24%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,11,0.98))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-1.5 text-xs font-medium text-amber-300">
              <Sparkles className="size-3.5" />
              Espace client
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-100">Mes reservations</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Suivez vos reservations a venir, retrouvez votre historique et gerez rapidement vos confirmations.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Rechercher par lieu ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 border-zinc-800 bg-zinc-950/80 pl-11 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatPanel title="Reservations a venir" value={upcoming.length} hint="Vos prochaines sorties confirmees" icon={CalendarDays} />
          <StatPanel title="En attente" value={pending.length} hint="Demandes en cours de traitement" icon={Clock3} />
          <StatPanel title="Historique" value={past.length} hint="Reservations deja passees" icon={Ticket} />
          <StatPanel title="Annulees" value={cancelled.length} hint="Reservations interrompues" icon={XCircle} />
        </div>
      </section>

      {isError ? (
        <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-6">
          <EmptyState
            icon={<Calendar className="size-12" />}
            title="Impossible de charger vos reservations"
            description={error instanceof Error ? error.message : 'Veuillez reessayer dans un instant.'}
          />
        </div>
      ) : (
        <>
          <Tabs defaultValue="upcoming" className="space-y-5">
            <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-zinc-800 bg-transparent p-0">
              <TabsTrigger
                value="pending"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
              >
                En attente ({pending.length})
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
              >
                A venir ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
              >
                Passees ({past.length})
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-sm text-zinc-500 data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
              >
                Annulees ({cancelled.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-5 sm:p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <ReservationCardSkeleton />
                    <ReservationCardSkeleton />
                  </div>
                ) : searchedPending.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-12" />}
                    title="Aucune reservation en attente"
                    description="Toutes vos reservations ont ete traitees."
                  />
                ) : (
                  <div className="space-y-4">
                    {searchedPending.map((r) => (
                      <ReservationCard
                        key={r._id}
                        reservation={r}
                        onCancel={(id) => cancelMutation.mutate(id)}
                        cancelLoading={cancelMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0">
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-5 sm:p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <ReservationCardSkeleton />
                    <ReservationCardSkeleton />
                  </div>
                ) : searchedUpcoming.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-12" />}
                    title="Aucune reservation a venir"
                    description="Explorez les lieux et creez votre prochaine reservation."
                  />
                ) : (
                  <div className="space-y-4">
                    {searchedUpcoming.map((r) => (
                      <ReservationCard
                        key={r._id}
                        reservation={r}
                        onCancel={(id) => cancelMutation.mutate(id)}
                        cancelLoading={cancelMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-5 sm:p-6">
                {searchedPast.length === 0 ? (
                  <EmptyState title="Aucune reservation passee" />
                ) : (
                  <div className="space-y-4">
                    {searchedPast.map((r) => (
                      <ReservationCard key={r._id} reservation={r} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cancelled" className="mt-0">
              <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-5 sm:p-6">
                {searchedCancelled.length === 0 ? (
                  <EmptyState title="Aucune reservation annulee" />
                ) : (
                  <div className="space-y-4">
                    {searchedCancelled.map((r) => (
                      <ReservationCard key={r._id} reservation={r} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {!isLoading && reservations.length === 0 ? (
            <div className="flex justify-center">
              <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
                <Link href="/explorer">Explorer les lieux</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
