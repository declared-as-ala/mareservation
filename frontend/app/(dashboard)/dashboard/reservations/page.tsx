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
    <div className="flex items-center gap-3 rounded-2xl border border-[#17140f]/10 bg-white p-4 shadow-[0_1px_0_rgba(23,20,15,0.04)] sm:block sm:p-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6ead0] text-[#8a5a00]">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 sm:mt-4">
        <p className="text-2xl font-semibold tabular-nums leading-none text-[#17140f] sm:text-3xl">{value}</p>
        <p className="mt-1 truncate text-sm font-medium text-[#3b362e]">{title}</p>
        <p className="mt-0.5 hidden text-xs text-[#847b6d] sm:block">{hint}</p>
      </div>
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <section>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5a00]">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Espace client
            </p>
            <h1 className="mt-2 font-serif text-[clamp(1.9rem,4vw,2.6rem)] leading-tight text-[#17140f]">Mes réservations</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#5f584d]">
              Suivez vos séjours à venir, vos demandes en attente et votre historique.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#847b6d]" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher par maison ou code…"
              aria-label="Rechercher une réservation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-full border-[#17140f]/12 bg-white dark:bg-white pl-11 text-[#17140f] placeholder:text-[#9a9183]"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatPanel title="À venir" value={upcoming.length} hint="Séjours confirmés" icon={CalendarDays} />
          <StatPanel title="En attente" value={pending.length} hint="Demandes en cours de traitement par l’hôte" icon={Clock3} />
          <StatPanel title="Historique" value={past.length} hint="Séjours déjà passés" icon={Ticket} />
          <StatPanel title="Annulées" value={cancelled.length} hint="Réservations annulées" icon={XCircle} />
        </div>
      </section>

      {isError ? (
        <div>
          <EmptyState
            icon={<Calendar className="size-12" />}
            title="Impossible de charger vos réservations"
            description={error instanceof Error ? error.message : 'Veuillez réessayer dans un instant.'}
          />
        </div>
      ) : (
        <>
          <Tabs defaultValue="upcoming" className="space-y-5">
            <TabsList className="h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none]">
              <TabsTrigger
                value="pending"
                className="h-9 shrink-0 rounded-full border border-[#17140f]/12 bg-white px-4 text-sm font-medium text-[#5f584d] data-[state=active]:border-[#17140f] data-[state=active]:bg-[#17140f] dark:data-[state=active]:bg-[#17140f] data-[state=active]:text-white dark:data-[state=active]:text-white dark:data-[state=active]:border-[#17140f] data-[state=active]:shadow-none"
              >
                En attente ({pending.length})
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="h-9 shrink-0 rounded-full border border-[#17140f]/12 bg-white px-4 text-sm font-medium text-[#5f584d] data-[state=active]:border-[#17140f] data-[state=active]:bg-[#17140f] dark:data-[state=active]:bg-[#17140f] data-[state=active]:text-white dark:data-[state=active]:text-white dark:data-[state=active]:border-[#17140f] data-[state=active]:shadow-none"
              >
                À venir ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="h-9 shrink-0 rounded-full border border-[#17140f]/12 bg-white px-4 text-sm font-medium text-[#5f584d] data-[state=active]:border-[#17140f] data-[state=active]:bg-[#17140f] dark:data-[state=active]:bg-[#17140f] data-[state=active]:text-white dark:data-[state=active]:text-white dark:data-[state=active]:border-[#17140f] data-[state=active]:shadow-none"
              >
                Passées ({past.length})
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="h-9 shrink-0 rounded-full border border-[#17140f]/12 bg-white px-4 text-sm font-medium text-[#5f584d] data-[state=active]:border-[#17140f] data-[state=active]:bg-[#17140f] dark:data-[state=active]:bg-[#17140f] data-[state=active]:text-white dark:data-[state=active]:text-white dark:data-[state=active]:border-[#17140f] data-[state=active]:shadow-none"
              >
                Annulées ({cancelled.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              <div>
                {isLoading ? (
                  <div className="space-y-4">
                    <ReservationCardSkeleton />
                    <ReservationCardSkeleton />
                  </div>
                ) : searchedPending.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-12" />}
                    title="Aucune demande en attente"
                    description="Toutes vos demandes ont été traitées par les hôtes."
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
              <div>
                {isLoading ? (
                  <div className="space-y-4">
                    <ReservationCardSkeleton />
                    <ReservationCardSkeleton />
                  </div>
                ) : searchedUpcoming.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-12" />}
                    title="Aucun séjour à venir"
                    description="Trouvez une maison d’hôtes, visitez-la en 360° et réservez votre prochaine escapade."
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
              <div>
                {searchedPast.length === 0 ? (
                  <EmptyState title="Aucun séjour passé" />
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
              <div>
                {searchedCancelled.length === 0 ? (
                  <EmptyState title="Aucune réservation annulée" />
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
              <Button asChild className="h-11 rounded-full bg-[#e0a527] px-6 font-semibold text-[#17140f] hover:bg-[#f0b93a]">
                <Link href="/maisons-d-hotes">Découvrir les maisons d’hôtes</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
