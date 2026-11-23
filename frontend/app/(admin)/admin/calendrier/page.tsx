'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGetRaw } from '@/lib/api/client';
import { VenueCalendarManager } from '@/components/booking/VenueCalendarManager';

interface Property {
  id: string;
  name: string;
  city?: string;
  isDemo: boolean;
  owner: { fullName: string } | null;
  roomsCount: number;
}

export default function AdminCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookable-properties'],
    queryFn: async () => (await apiGetRaw<{ data: Property[] }>('/admin-bookings/properties')).data,
  });
  if (isLoading) return <p className="p-6 text-neutral-400">Chargement…</p>;
  if (!data?.length) return <p className="p-6 text-neutral-400">Aucun hébergement.</p>;
  return (
    <div className="p-4 sm:p-6">
      <VenueCalendarManager
        title="Calendrier & disponibilités"
        venues={data.map((p) => ({
          id: p.id,
          name: p.name,
          subtitle: `${p.owner?.fullName ?? 'sans propriétaire'}${p.isDemo ? ' · démo' : ''}`,
        }))}
      />
    </div>
  );
}
