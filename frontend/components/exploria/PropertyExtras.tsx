'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { searchGuesthouses } from '@/lib/api/bookings';
import { formatMoney } from '@/lib/booking/dates';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#111112]" aria-hidden="true" />,
});

/** Location map — rendered only when real coordinates exist. */
export function PropertyLocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <div className="h-72 overflow-hidden rounded-[1.5rem] border border-white/10 sm:h-96">
      <TunisiaMap single className="size-full" markers={[{ id: 'here', lat, lng, label: name.slice(0, 24), title: name }]} ariaLabel={`Localisation de ${name}`} />
    </div>
  );
}

/** Other public guesthouses, same governorate first. */
export function SimilarGuesthouses({ currentId, governorate }: { currentId: string; governorate?: string | null }) {
  const { data } = useQuery({
    queryKey: ['similar', currentId, governorate],
    queryFn: async () => {
      const near = governorate ? await searchGuesthouses(new URLSearchParams({ governorate })) : { results: [] as any[] };
      let list = near.results.filter((r: any) => r.id !== currentId);
      if (list.length < 3) {
        const all = await searchGuesthouses(new URLSearchParams());
        list = [...list, ...all.results.filter((r) => r.id !== currentId && !list.some((x: any) => x.id === r.id))];
      }
      return list.slice(0, 3);
    },
    staleTime: 60_000,
  });
  if (!data?.length) return null;
  return (
    <section aria-labelledby="similar-title" className="mt-16">
      <h2 id="similar-title" className="font-serif text-3xl font-medium text-white">Découvrez d’autres maisons d’hôtes à proximité</h2>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((r: any) => (
          <li key={r.id}>
            <Link href={`/accommodation/${r.slug}`} className="group block overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#111112] hover:border-white/25">
              <div className="aspect-[4/3] bg-[#1a1a1b]">
                {r.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverImage} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-neutral-400">{[r.city, r.governorate].filter(Boolean).join(', ')}{r.isDemo ? ' · Démo' : ''}</p>
                <p className="mt-1 font-serif text-lg text-white">{r.name}</p>
                {r.fromPrice != null && <p className="mt-1 text-sm text-neutral-400">Dès <span className="font-semibold text-white">{formatMoney(r.fromPrice)}</span> / nuit</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
