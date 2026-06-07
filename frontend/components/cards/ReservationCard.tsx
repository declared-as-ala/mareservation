'use client';

import Link from 'next/link';
import { Calendar, Clock3, Hash, Users, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Reservation } from '@/lib/api/types';

function getVenueName(r: Reservation): string {
  const v = r.venueId;
  if (typeof v === 'object' && v?.name) return v.name;
  return 'Lieu';
}

function getUnitLabel(r: Reservation): string | null {
  const pickName = (value: unknown) => {
    if (!value || typeof value !== 'object') return null;
    if ('name' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).name === 'string') {
      return (value as Record<string, unknown>).name as string;
    }
    return null;
  };

  return pickName(r.tableId) ?? pickName(r.roomId) ?? pickName(r.seatId) ?? null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
  EXPIRED: 'Expirée',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  COMPLETED: 'outline',
  EXPIRED: 'outline',
};

interface ReservationCardProps {
  reservation: Reservation;
  onCancel?: (id: string) => void;
  cancelLoading?: boolean;
  className?: string;
}

export function ReservationCard({
  reservation,
  onCancel,
  cancelLoading,
  className,
}: ReservationCardProps) {
  const venueName = getVenueName(reservation);
  const start = new Date(reservation.startAt);
  const end = new Date(reservation.endAt);
  const status = reservation.status;
  const canCancel = status === 'PENDING' || status === 'CONFIRMED';
  const reservationRef = reservation.confirmationCode ?? reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase();
  const unitLabel = getUnitLabel(reservation);

  return (
    <Card className={cn('bg-zinc-900/60 border-zinc-800 shadow-md', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <h3 className="font-semibold text-zinc-100">{venueName}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Hash className="size-3.5" />
            #{reservationRef}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{STATUS_LABEL[status] ?? status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Calendar className="size-4 shrink-0" />
          <span>
            {start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Clock3 className="size-4 shrink-0" />
          <span>
            {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
            {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {reservation.partySize != null && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="size-4 shrink-0" />
            {reservation.partySize} personne(s)
          </p>
        )}
        {unitLabel && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <UtensilsCrossed className="size-4 shrink-0" />
            {unitLabel}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Link href={`/mes-reservations/${reservation._id}`}>Voir</Link>
          </Button>
          {canCancel && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onCancel(reservation._id)}
              disabled={cancelLoading}
            >
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
