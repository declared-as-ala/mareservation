'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchFavorites, toggleFavorite } from '@/lib/api/favorites';
import { Button } from '@/components/ui/button';
import type { Venue } from '@/lib/api/types';
import { getVenueHref } from '@/lib/venueHref';

function FavoriteVenueCard({ venue }: { venue: Venue }) {
  const qc = useQueryClient();
  const removeMut = useMutation({
    mutationFn: () => toggleFavorite(venue._id),
    onSuccess: () => {
      toast.success('Retiré des favoris');
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const img = venue.coverImage;
  const href = getVenueHref(venue);

  return (
    <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/40 transition-all duration-200 shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-800">
        {img ? (
          <Image src={img} alt={venue.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 50vw" />
        ) : (
          <div className="size-full flex items-center justify-center">
            <MapPin className="size-10 text-zinc-600" />
          </div>
        )}
        <button
          type="button"
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-red-500/80 transition-colors"
          aria-label="Retirer des favoris"
        >
          {removeMut.isPending
            ? <Loader2 className="size-3.5 animate-spin text-white" />
            : <Heart className="size-3.5 fill-red-400 text-red-400" />}
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-zinc-100 mb-1">{venue.name}</h3>
        <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-3">
          <MapPin className="size-3.5 shrink-0" />
          {venue.city}
        </div>
        <Button asChild size="sm" className="w-full rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 gap-1.5">
          <Link href={href}>
            Voir le lieu <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Mes favoris</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {venues.length} lieu{venues.length !== 1 ? 'x' : ''} sauvegardé{venues.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 animate-pulse">
              <div className="aspect-[16/9] bg-zinc-800 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto size-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
            <Heart className="size-9 text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Aucun favori</h2>
          <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
            Appuyez sur le ❤️ sur une carte lieu pour le sauvegarder ici.
          </p>
          <Button asChild className="rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold">
            <Link href="/explorer">Explorer les lieux</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <FavoriteVenueCard key={venue._id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
