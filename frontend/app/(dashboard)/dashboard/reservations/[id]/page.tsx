'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchReservationById } from '@/lib/api/reservations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { Calendar, MapPin, ArrowLeft } from 'lucide-react';

function getVenueName(r: { venueId: string | { name?: string; address?: string; city?: string } }) {
  const v = r.venueId;
  if (typeof v === 'object' && v?.name) return v.name;
  return 'Lieu';
}
function getVenueAddress(r: { venueId: string | { address?: string; city?: string } }) {
  const v = r.venueId;
  if (typeof v === 'object') return [v.address, v.city].filter(Boolean).join(', ');
  return '';
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
  EXPIRED: 'Expirée',
};

export default function ReservationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: reservation, isLoading, error, refetch } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservationById(id),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Réservation introuvable.</p>
        <Button asChild><Link href="/mes-reservations">Retour</Link></Button>
      </div>
    );
  }

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !reservation) {
    return (
      <div className="space-y-4">
        <ErrorState onRetry={() => refetch()} />
        <Button variant="outline" asChild><Link href="/mes-reservations">Mes réservations</Link></Button>
      </div>
    );
  }

  const start = new Date(reservation.startAt);
  const end = new Date(reservation.endAt);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/mes-reservations" className="gap-2">
          <ArrowLeft className="size-4" /> Mes réservations
        </Link>
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getVenueName(reservation)}</h1>
            {reservation.confirmationCode && (
              <p className="text-muted-foreground">Code : {reservation.confirmationCode}</p>
            )}
          </div>
          <Badge>{STATUS_LABEL[reservation.status] ?? reservation.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span>
              {start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {getVenueAddress(reservation) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              <span>{getVenueAddress(reservation)}</span>
            </div>
          )}
          {reservation.partySize != null && (
            <p>Nombre de personnes : {reservation.partySize}</p>
          )}
          {reservation.totalPrice != null && (
            <p className="font-medium">Total : {reservation.totalPrice} TND</p>
          )}
        </CardContent>
      </Card>
      <Button asChild>
        <Link href={`/reservation/${id}/confirmation`}>Voir le ticket</Link>
      </Button>
    </div>
  );
}
