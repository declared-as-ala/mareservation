'use client';

import Link from 'next/link';
import { BedDouble, Calendar, Clock3, Hash, Moon, Users, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

// The table engine uses UPPERCASE statuses, the maison booking engine lowercase ones.
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CHECKED_IN: 'En cours',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
  COMPLETED: 'Terminée',
  EXPIRED: 'Expirée',
};

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-900 ring-amber-300/60',
  CONFIRMED: 'bg-emerald-100 text-emerald-900 ring-emerald-300/60',
  CHECKED_IN: 'bg-emerald-100 text-emerald-900 ring-emerald-300/60',
  CANCELLED: 'bg-red-50 text-red-800 ring-red-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
};

const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

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
  const status = String(reservation.status ?? '').toUpperCase();
  const canCancel = status === 'PENDING' || status === 'CONFIRMED';
  // Overnight stay (maison / room) vs. a time slot (table, seat).
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const isStay = nights >= 1;
  const reservationRef = reservation.confirmationCode ?? reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase();
  const unitLabel = getUnitLabel(reservation);

  return (
    <Card className={cn('bg-zinc-900/60 border-zinc-800 shadow-md', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-100">{venueName}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Hash className="size-3.5" aria-hidden="true" />
            {reservationRef}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STATUS_TONE[status] ?? 'bg-zinc-800 text-zinc-300 ring-zinc-700')}>
          {STATUS_LABEL[status] ?? reservation.status}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Calendar className="size-4 shrink-0" aria-hidden="true" />
          <span>{isStay ? `${fmtDay(start)} → ${fmtDay(end)}` : fmtDay(start)}</span>
        </div>
        {isStay ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Moon className="size-4 shrink-0" aria-hidden="true" />
            <span>{nights} nuit{nights > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock3 className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {reservation.partySize != null && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            {reservation.partySize} {isStay ? `voyageur${reservation.partySize > 1 ? 's' : ''}` : 'personne(s)'}
          </p>
        )}
        {unitLabel && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            {isStay ? <BedDouble className="size-4 shrink-0" aria-hidden="true" /> : <UtensilsCrossed className="size-4 shrink-0" aria-hidden="true" />}
            {unitLabel}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Link href={`/mes-reservations/${reservation._id}`}>Voir le détail</Link>
          </Button>
          {canCancel && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-red-700 hover:bg-red-50 hover:text-red-800"
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
