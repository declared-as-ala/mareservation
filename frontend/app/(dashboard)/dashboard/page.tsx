'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMyReservations } from '@/lib/api/reservations';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReservationCard } from '@/components/cards/ReservationCard';
import { ReservationCardSkeleton } from '@/components/shared/skeletons';
import { Calendar, User, FileText } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations', 'me'],
    queryFn: fetchMyReservations,
  });

  const now = new Date();
  const upcoming = reservations.filter((r) => new Date(r.startAt) >= now && r.status !== 'CANCELLED');
  const past = reservations.filter((r) => new Date(r.startAt) < now && r.status !== 'CANCELLED');
  const cancelled = reservations.filter((r) => r.status === 'CANCELLED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue, {user?.fullName ?? 'Utilisateur'}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total réservations</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reservations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passées</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{past.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Annulées</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cancelled.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Réservations récentes</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/reservations">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <ReservationCardSkeleton />
                <ReservationCardSkeleton />
              </div>
            ) : upcoming.length === 0 && past.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Aucune réservation.</p>
            ) : (
              <div className="space-y-4">
                {[...upcoming, ...past].slice(0, 3).map((r) => (
                  <ReservationCard key={r._id} reservation={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/reservations">
                <Calendar className="mr-2 size-4" />
                Mes réservations
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 size-4" />
                Mon profil
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/explorer">
                <FileText className="mr-2 size-4" />
                Explorer les lieux
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
