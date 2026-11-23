'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { VenueCalendarManager } from '@/components/booking/VenueCalendarManager';

export default function OwnerCalendarPage() {
  const { data, isLoading } = useQuery({ queryKey: ['owner-dashboard'], queryFn: fetchOwnerDashboard });
  const venues = (data?.venues ?? []).filter((v) => v.type === 'HOTEL' || v.type === 'MAISON_DHOTE');
  if (isLoading) return <p className="p-6 text-neutral-400">Chargement…</p>;
  if (!venues.length) return <p className="p-6 text-neutral-400">Aucune maison d&apos;hôtes rattachée à votre compte.</p>;
  return (
    <div className="p-4 sm:p-6">
      <VenueCalendarManager title="Disponibilités & Calendrier" venues={venues.map((v) => ({ id: v._id, name: v.name }))} />
    </div>
  );
}
