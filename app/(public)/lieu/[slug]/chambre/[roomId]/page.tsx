'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  ScanLine,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchRoomScenes, fetchVenueRooms, ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import type { HotelRoom, Venue } from '@/lib/api/types';
import { RoomBookingModal } from '@/components/hotel/RoomBookingModal';
import { Button } from '@/components/ui/button';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

function roomTitle(room: HotelRoom) {
  return room.name || `Chambre ${room.roomNumber}`;
}

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const roomId = params.roomId as string;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data: venue, isLoading: venueLoading } = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['public-hotel-rooms', venue?._id],
    queryFn: () => fetchVenueRooms(venue!._id),
    enabled: !!venue?._id,
  });

  const room = rooms.find((item) => item._id === roomId) ?? null;

  const { data: tourData } = useQuery({
    queryKey: ['public-room-scenes', room?._id],
    queryFn: () => fetchRoomScenes(room!.venueId, room!._id),
    enabled: !!room?._id,
  });

  const gallery = useMemo(() => {
    if (!room) return [];
    const seen = new Set<string>();
    const images: string[] = [];
    [room.coverImage, ...(room.gallery || [])].forEach((url) => {
      if (url && !seen.has(url)) {
        seen.add(url);
        images.push(url);
      }
    });
    return images;
  }, [room]);

  const scenes = useMemo(() => {
    if (!room) return [];
    if ((tourData?.scenes?.length ?? 0) > 0) {
      return tourData!.scenes.map((scene) => ({ id: scene._id, name: scene.name, image: scene.image }));
    }
    return (room.panoramicImages ?? []).map((image, index) => ({
      id: `pano-${index}`,
      name: `Vue ${index + 1}`,
      image,
    }));
  }, [room, tourData]);

  const activeScene = scenes[activeSceneIdx] ?? scenes[0];
  const typeLabel = room ? ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre' : '';
  const isSuite = room ? ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(room.roomType?.toUpperCase() ?? '') : false;
  const cover = gallery[0];
  const loading = venueLoading || roomsLoading;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-[420px] animate-pulse rounded-[28px] bg-white/[0.04]" />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="h-96 animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        </div>
      </main>
    );
  }

  if (!venue || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-white">
        <div className="max-w-md text-center">
          <BedDouble className="mx-auto size-12 text-zinc-700" />
          <h1 className="mt-4 text-xl font-bold">Chambre introuvable</h1>
          <p className="mt-2 text-sm text-zinc-500">Cette chambre n'existe pas ou n'est plus disponible.</p>
          <Button asChild className="mt-5 bg-amber-300 text-black hover:bg-amber-200">
            <Link href={`/lieu/${slug}`}>Retour à l'hôtel</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="relative overflow-hidden bg-zinc-950">
        <div className="relative h-[360px] sm:h-[440px] lg:h-[520px]">
          {cover ? (
            <Image
              src={cover}
              alt={roomTitle(room)}
              fill
              priority
              quality={95}
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <BedDouble className="size-16 text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/15 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/35" />

          <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push(`/lieu/${slug}`)}
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-md transition-all hover:border-amber-300/45 hover:bg-amber-300/10 hover:text-amber-200"
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                Retour à l'hôtel
              </button>
              {scenes.length > 0 && (
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200 backdrop-blur-md">
                  <ScanLine className="size-3.5" />
                  Vue 360°
                </span>
              )}
            </div>

            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200 backdrop-blur-md">
                    {isSuite && <Crown className="size-3" />}
                    {typeLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur-md">
                    {venue.name}
                  </span>
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {roomTitle(room)}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium text-white/75">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-amber-300" />
                    {[venue.city, room.view].filter(Boolean).join(' · ')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">
                    <Users className="size-4 text-amber-300" />
                    {room.capacityAdults ?? room.capacity ?? 2} pers.
                  </span>
                  {room.surface && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">
                      <Maximize2 className="size-4 text-amber-300" />
                      {room.surface} m²
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-2xl shadow-black/25 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/80">Détails</p>
                <h2 className="mt-2 text-2xl font-black text-white">Confort & configuration</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-amber-300">{room.pricePerNight}</p>
                <p className="text-xs font-semibold text-zinc-500">DT / nuit</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard icon={Users} label="Capacité" value={`${room.capacityAdults ?? room.capacity ?? 2} pers.`} />
              <InfoCard icon={BedDouble} label="Literie" value={room.bedType || 'Selon disponibilité'} />
              <InfoCard icon={Bath} label="Salle de bain" value={room.bathroomType || 'Privée'} />
              <InfoCard icon={Maximize2} label="Surface" value={room.surface ? `${room.surface} m²` : 'Non précisée'} />
            </div>

            {room.description && (
              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-400 sm:text-base">
                {room.description}
              </p>
            )}
          </div>

          {(gallery.length > 0 || activeScene) && (
            <div className="grid gap-4 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-4 shadow-2xl shadow-black/25 sm:p-6 md:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-[170px_minmax(0,1fr)]">
              {gallery.length > 0 && (
            <div className="order-1 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-zinc-400">
                    <ImageIcon className="size-4 text-amber-300" />
                    Galerie photo
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">Cliquez pour agrandir</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 md:max-h-[620px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1">
                {gallery.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setLightbox(index)}
                    className={cn(
                      'group relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl bg-zinc-900 outline-none ring-1 ring-white/[0.06] transition-all hover:ring-amber-300/35 focus-visible:ring-2 focus-visible:ring-amber-300 md:w-full xl:h-28',
                      index === 0 && 'ring-amber-300/35'
                    )}
                  >
                    <Image src={image} alt={`${roomTitle(room)} photo ${index + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeScene && (
            <div className="order-2 min-w-0 rounded-2xl border border-white/[0.08] bg-zinc-950 p-3 shadow-2xl shadow-black/35">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-white">
                    <ScanLine className="size-5 text-amber-300" />
                    Expérience 360°
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">Grand aperçu immersif pour explorer la chambre.</p>
                </div>
                {scenes.length > 1 && (
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                    {activeSceneIdx + 1} / {scenes.length}
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-zinc-950">
                <div className="relative h-[420px] sm:h-[520px] xl:h-[640px]">
                  <PanoramaEngine imageUrl={activeScene.image} markers={[]} mode="navigate" />
                  <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {activeScene.name}
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200 backdrop-blur-sm">
                    Glissez pour explorer
                  </div>
                  {activeSceneIdx > 0 && (
                    <button type="button" onClick={() => setActiveSceneIdx((idx) => idx - 1)} className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white transition-colors hover:bg-amber-300/20">
                      <ChevronLeft className="size-5" />
                    </button>
                  )}
                  {activeSceneIdx < scenes.length - 1 && (
                    <button type="button" onClick={() => setActiveSceneIdx((idx) => idx + 1)} className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white transition-colors hover:bg-amber-300/20">
                      <ChevronRight className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          )}

          {(room.amenities?.length > 0 || room.services?.length) && (
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-white">
                <Sparkles className="size-5 text-amber-300" />
                Équipements & services
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[...(room.amenities || []), ...(room.services || [])].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-zinc-300">
                    <Check className="size-4 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-white/[0.08] bg-[#0B0B0B] p-5 shadow-2xl shadow-black/35">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/80">Réservation</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-black text-white">{room.pricePerNight} DT</p>
                <p className="text-xs text-zinc-500">par nuit</p>
              </div>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                room.status === 'reserved' || room.defaultStatus === 'reserved'
                  ? 'bg-red-500/10 text-red-300'
                  : 'bg-emerald-500/10 text-emerald-300'
              )}>
                {room.status === 'reserved' || room.defaultStatus === 'reserved' ? 'Réservée' : 'Disponible'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black shadow-lg shadow-amber-400/20 transition-all hover:-translate-y-0.5 hover:bg-amber-200"
            >
              <CalendarDays className="size-4" />
              Réserver cette chambre
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
              Les disponibilités finales sont confirmées pendant la réservation.
            </p>
          </div>
        </aside>
      </section>

      {lightbox !== null && gallery[lightbox] && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md" onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fermer">
            <X className="size-5" />
          </button>
          {lightbox > 0 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setLightbox(lightbox - 1); }} className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Photo précédente">
              <ChevronLeft className="size-5" />
            </button>
          )}
          {lightbox < gallery.length - 1 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setLightbox(lightbox + 1); }} className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Photo suivante">
              <ChevronRight className="size-5" />
            </button>
          )}
          <div className="relative h-[80vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image src={gallery[lightbox]} alt={`Photo ${lightbox + 1}`} fill className="object-contain" sizes="100vw" priority />
          </div>
        </div>
      )}

      <RoomBookingModal room={room} venue={venue as Venue} open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </main>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="size-3.5 text-amber-300" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}
