'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { Building2, CalendarDays, CheckCircle2, Clock3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-900/80 p-5">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export default function OwnerPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: fetchOwnerDashboard,
  });

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Espace proprietaire</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Suivez vos lieux et les reservations liees a votre activite.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Lieux geres" value={data?.stats.totalVenues ?? 0} icon={Building2} />
          <StatCard label="Reservations" value={data?.stats.totalReservations ?? 0} icon={CalendarDays} />
          <StatCard label="A venir" value={data?.stats.upcomingReservations ?? 0} icon={Clock3} />
          <StatCard label="Confirmees" value={data?.stats.confirmedReservations ?? 0} icon={CheckCircle2} />
        </div>

        <section className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-amber-500/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/20 font-semibold"><Link href="/owner/hotel-dashboard">Tableau de bord hôtel</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/reservations">Reservations</Link></Button>
            <Button asChild variant="outline" className="border-amber-500/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"><Link href="/owner/pending">Demandes en attente</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/availability">Disponibilites & blocages</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/scanner">QR Scanner</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/my-establishment">Mon etablissement</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/resources">Ressources</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/payments">Paiements</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/clients">Clients</Link></Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60"><Link href="/owner/settings">Settings</Link></Button>
          </div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mes lieux</h2>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950/60">
              <Link href="/explorer">Voir le site public</Link>
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-zinc-500">Chargement...</p>
          ) : !data?.venues?.length ? (
            <p className="text-sm text-zinc-500">
              Aucun lieu proprietaire n&apos;a encore ete rattache a votre compte.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.venues.map((venue) => (
                <div key={venue._id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <p className="text-lg font-semibold text-zinc-100">{venue.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{venue.type}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                    <MapPin className="size-4" />
                    {venue.city}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-zinc-800/80 bg-zinc-900/70 p-6">
          <h2 className="mb-5 text-xl font-semibold">Reservations recentes</h2>
          {!data?.recentReservations?.length ? (
            <p className="text-sm text-zinc-500">Aucune reservation recente.</p>
          ) : (
            <div className="space-y-3">
              {data.recentReservations.map((reservation) => (
                <div key={reservation._id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                  <div>
                    <p className="font-medium text-zinc-100">
                      {typeof reservation.venueId === 'object' ? reservation.venueId.name : 'Lieu'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(reservation.startAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-300">{reservation.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
