'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { BookingSettingsForm } from '@/components/booking/BookingSettingsForm';

export default function OwnerBookingSettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['owner-dashboard'], queryFn: fetchOwnerDashboard });
  const venues = (data?.venues ?? []).filter((v) => v.type === 'HOTEL' || v.type === 'MAISON_DHOTE');
  const [venueId, setVenueId] = useState('');
  const current = venueId || venues[0]?._id || '';
  if (isLoading) return <p className="p-6 text-neutral-400">Chargement…</p>;
  if (!venues.length) return <p className="p-6 text-neutral-400">Aucune maison d&apos;hôtes rattachée à votre compte.</p>;
  return (
    <div className="space-y-6 p-4 text-white sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl font-black sm:text-3xl"><Settings2 className="size-6 text-amber-400" aria-hidden="true" /> Paramètres de réservation</h1>
          <p className="mt-1 text-sm text-neutral-400">Mode de confirmation, prix, frais, règles, équipements et position sur la carte.</p>
        </div>
        {venues.length > 1 && (
          <select aria-label="Maison" value={current} onChange={(e) => setVenueId(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0B0B0C] px-3 text-sm">
            {venues.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        )}
      </header>
      <div className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-5 sm:p-7">
        <BookingSettingsForm key={current} venueId={current} mode="owner" />
      </div>
    </div>
  );
}
