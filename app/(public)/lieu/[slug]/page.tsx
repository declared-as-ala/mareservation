'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchVenueByIdOrSlug,
  getVenueAvailabilityStreamUrl,
  fetchVenueTablePlacements,
  fetchVenueScenes,
  type PublicTablePlacement,
  type VirtualScene,
  type VirtualHotspot,
} from '@/lib/api/venues';
import { fetchScenes } from '@/lib/api/scenes';
import { fetchVenueRooms, fetchRoomScenes, ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import type { HotelRoom } from '@/lib/api/types';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { DetailHeader } from '@/components/detail/DetailHeader';
import { Button } from '@/components/ui/button';
import { TypeBadge } from '@/components/shared/TypeBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VenueGallery } from '@/components/venue/VenueGallery';
import { VenueMap } from '@/components/venue/VenueMap';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { ShareButton } from '@/components/venue/ShareButton';
import { useCartStore } from '@/stores/cart';
import {
  Video,
  Eye,
  Users,
  ShoppingCart,
  Lock,
  Phone,
  MapPin,
  Clock,
  Crown,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  BedDouble,
  Bath,
  Maximize2,
  Wifi,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TablePlacement } from '@/lib/api/types';
import type { Venue } from '@/lib/api/types';
import { StepReservationModal } from '@/components/reservation/StepReservationModal';
import { TablePickerSheet } from '@/components/reservation/TablePickerSheet';
import { getReservationCTA } from '@/lib/reservation-labels';

const RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;

const MatterportClientViewer = dynamic(
  () => import('@/components/immersive/MatterportClientViewer'),
  { ssr: false }
);

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

const VirtualTourViewer = dynamic(
  () => import('@/components/immersive/VirtualTourViewer').then((m) => ({ default: m.VirtualTourViewer })),
  { ssr: false }
);

function getVenueImage(venue: { coverImage?: string; media?: { kind: string; url: string }[] }) {
  if (venue.coverImage) return venue.coverImage;
  const hero = venue.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url ?? null;
}

function getAllImages(venue: Venue): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const add = (url: string | undefined | null) => {
    if (url && !seen.has(url)) { seen.add(url); result.push(url); }
  };
  add(venue.coverImage);
  venue.gallery?.forEach(add);
  venue.media?.filter((m) => m.kind !== 'HERO_IMAGE').forEach((m) => add(m.url));
  return result;
}

/* ── Room card (grid item) ───────────────────────────────────────────── */
function RoomCard({ room, onClick }: { room: HotelRoom; onClick: () => void }) {
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre';
  const isSuite = ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(
    room.roomType?.toUpperCase() ?? ''
  );
  const has360 = (room.panoramicImages?.length ?? 0) > 0 || room.hasVirtualTour;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden transition-all duration-200 hover:border-amber-400/30 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-400/5"
    >
      {/* Image */}
      <div className="relative h-44 bg-zinc-900 overflow-hidden">
        {room.coverImage ? (
          <Image
            src={room.coverImage}
            alt={room.name ?? `Chambre ${room.roomNumber}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BedDouble className="size-10 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm border',
            isSuite
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              : 'bg-black/40 text-white/90 border-white/10'
          )}>
            {isSuite && <Crown className="size-2.5" />}
            {typeLabel}
          </span>
          {has360 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-amber-400/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              <ScanLine className="size-2.5" /> 360°
            </span>
          )}
        </div>
        {/* Price */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-amber-300">
            {room.pricePerNight} DT
            <span className="text-white/40 ml-1 font-normal">/nuit</span>
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div>
          <p className="font-semibold text-sm text-white truncate">
            {room.name ?? `Chambre ${room.roomNumber}`}
          </p>
          {room.roomNumber && <p className="text-[10px] text-zinc-500 mt-0.5">N° {room.roomNumber}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><Users className="size-3" /> {room.capacityAdults ?? room.capacity ?? 2} pers.</span>
          {room.surface && <span className="flex items-center gap-1"><Maximize2 className="size-3" /> {room.surface} m²</span>}
          {room.bedType && <span className="flex items-center gap-1"><BedDouble className="size-3" /> {room.bedType}</span>}
        </div>
        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="rounded-full bg-white/[0.06] border border-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400 capitalize">
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-500">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-amber-400/70 font-medium group-hover:text-amber-400 transition-colors">
          Voir la chambre →
        </p>
      </div>
    </button>
  );
}

/* ── Room detail view (after clicking a card) ────────────────────────── */
function RoomDetailView({
  room, tourScenes, tourHotspots, sceneIdx, onSceneIdxChange, onBack,
}: {
  room: HotelRoom;
  tourScenes: VirtualScene[];
  tourHotspots: VirtualHotspot[];
  sceneIdx: number;
  onSceneIdxChange: (i: number) => void;
  onBack: () => void;
}) {
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre';
  const isSuite = ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(
    room.roomType?.toUpperCase() ?? ''
  );

  // Build unified 360° scene list: virtual tour scenes first, then panoramic images
  const immersiveScenes: { id: string; name: string; image: string }[] =
    tourScenes.length > 0
      ? tourScenes.map((s) => ({ id: s._id, name: s.name, image: s.image }))
      : (room.panoramicImages ?? []).map((url, i) => ({
          id: `pano-${i}`,
          name: `Vue ${i + 1}`,
          image: url,
        }));

  const currentScene = immersiveScenes[sceneIdx] ?? immersiveScenes[0];

  // Navigation hotspots for current scene
  const activeHotspots = tourHotspots.filter((h) => currentScene && h.virtualTourId === currentScene.id);
  const psvNavHotspots = activeHotspots
    .map((h) => {
      const target = immersiveScenes.find((s) => s.id === h.targetId);
      if (!target) return null;
      return {
        id: h._id,
        yaw: (h.xPercent / 100 - 0.5) * 2 * Math.PI,
        pitch: -(h.yPercent / 100 - 0.5) * Math.PI,
        label: target.name,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Toutes les chambres
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: 360° viewer */}
        <div className="space-y-3">
          {immersiveScenes.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ScanLine className="size-4 text-amber-400" /> Vue 360°
                </h3>
                {immersiveScenes.length > 1 && (
                  <span className="text-xs text-zinc-400">
                    {sceneIdx + 1} / {immersiveScenes.length}
                  </span>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950 shadow-xl">
                {/* Panorama */}
                <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                  <div className="absolute inset-0">
                    <PanoramaEngineClient
                      imageUrl={currentScene.image}
                      markers={[]}
                      mode="navigate"
                      navHotspots={psvNavHotspots}
                      onNavHotspotClick={(id) => {
                        const h = activeHotspots.find((x) => x._id === id);
                        if (!h) return;
                        const idx = immersiveScenes.findIndex((s) => s.id === h.targetId);
                        if (idx !== -1) onSceneIdxChange(idx);
                      }}
                    />
                  </div>
                  {/* Scene label */}
                  <div className="absolute top-3 left-3 z-20 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                      <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                      {currentScene.name}
                    </span>
                  </div>
                  {/* Arrows */}
                  {sceneIdx > 0 && (
                    <button type="button" onClick={() => onSceneIdxChange(sceneIdx - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all">
                      <ChevronLeft className="size-4" />
                    </button>
                  )}
                  {sceneIdx < immersiveScenes.length - 1 && (
                    <button type="button" onClick={() => onSceneIdxChange(sceneIdx + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all">
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                  {/* Progress bar */}
                  {immersiveScenes.length > 1 && (
                    <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-zinc-800/60">
                      <div className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${((sceneIdx + 1) / immersiveScenes.length) * 100}%` }} />
                    </div>
                  )}
                </div>
                {/* Thumbnail strip */}
                {immersiveScenes.length > 1 && (
                  <div className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800/60">
                    <div className="flex gap-2 p-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {immersiveScenes.map((s, idx) => {
                        const isActive = idx === sceneIdx;
                        return (
                          <button key={s.id} type="button" onClick={() => onSceneIdxChange(idx)}
                            className={cn(
                              'relative shrink-0 h-[52px] w-[78px] rounded-lg overflow-hidden border-2 transition-all',
                              isActive ? 'border-amber-400 shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-transparent opacity-50 hover:opacity-80 hover:border-zinc-600'
                            )}>
                            <Image src={s.image} alt={s.name} fill className="object-cover" sizes="78px" />
                            {isActive && <div className="absolute inset-0 bg-amber-400/10" />}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pb-0.5 pt-2 px-1">
                              <p className="text-[8px] text-white font-medium truncate text-center">{s.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No 360° — show gallery if available */
            room.gallery?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {room.gallery.slice(0, 4).map((url, i) => (
                  <div key={i} className={cn('relative rounded-xl overflow-hidden bg-zinc-900', i === 0 && room.gallery.length > 1 ? 'col-span-2 h-56' : 'h-32')}>
                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Right: room info */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border',
                isSuite ? 'bg-amber-400/15 text-amber-300 border-amber-400/25' : 'bg-white/[0.06] text-zinc-300 border-white/[0.08]'
              )}>
                {isSuite && <Crown className="size-3" />}
                {typeLabel}
              </span>
              {room.status === 'available' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Disponible
                </span>
              ) : room.status === 'reserved' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  Réservée
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-bold text-white">{room.name ?? `Chambre ${room.roomNumber}`}</h2>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {room.pricePerNight} DT <span className="text-sm font-normal text-zinc-400">/ nuit</span>
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Users, label: `${room.capacityAdults ?? room.capacity ?? 2} adultes` },
              ...(room.surface ? [{ icon: Maximize2, label: `${room.surface} m²` }] : []),
              ...(room.bedType ? [{ icon: BedDouble, label: room.bedType }] : []),
              ...(room.bathroomType ? [{ icon: Bath, label: room.bathroomType }] : []),
              ...(room.floor != null ? [{ icon: Star, label: `Étage ${room.floor}` }] : []),
              ...(room.view ? [{ icon: Eye, label: room.view }] : []),
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <Icon className="size-3.5 text-amber-400/70 shrink-0" />
                <span className="text-xs text-zinc-300 truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {room.description && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{room.description}</p>
            </div>
          )}

          {/* Amenities */}
          {room.amenities?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Équipements</h4>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.07] px-2.5 py-1 text-xs text-zinc-300 capitalize">
                    <Wifi className="size-2.5 text-zinc-500" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reserve CTA */}
          <button
            type="button"
            className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold py-3.5 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-400/20"
          >
            Réserver cette chambre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Thin PanoramaEngine wrapper used inside room detail ─────────────── */
const PanoramaEngineClient = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

export default function VenueDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useCartStore((s) => s.addItem);
  const [activeTablePlacement, setActiveTablePlacement] = useState<TablePlacement | null>(null);
  const [selectedTable, setSelectedTable] = useState<PublicTablePlacement | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeImmersiveSceneIdx, setActiveImmersiveSceneIdx] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [roomSceneIdx, setRoomSceneIdx] = useState(0);

  const [selectedSlotStartAt] = useState(() =>
    new Date(Date.now() + RESERVATION_DURATION_MS).toISOString()
  );
  const selectedSlotEndAt = useMemo(
    () => new Date(new Date(selectedSlotStartAt).getTime() + RESERVATION_DURATION_MS).toISOString(),
    [selectedSlotStartAt]
  );

  const { data: venue, isLoading, error, refetch } = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const isMatterport =
    venue?.immersiveProvider === 'matterport' &&
    venue?.immersiveSourceType === 'url' &&
    !!venue?.immersiveUrl;

  const { data: allPlacements = [] } = useQuery({
    queryKey: ['venue-placements', venue?._id, selectedSlotStartAt, selectedSlotEndAt],
    queryFn: () =>
      fetchVenueTablePlacements(venue!._id, {
        startAt: selectedSlotStartAt,
        endAt: selectedSlotEndAt,
      }),
    enabled: !!venue?._id,
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ['venue-scenes', venue?._id],
    queryFn: () => fetchScenes(venue!._id),
    enabled: !!venue?._id,
  });

  const { data: tourData } = useQuery({
    queryKey: ['venue-tour', venue?._id],
    queryFn: () => fetchVenueScenes(venue!._id),
    enabled: !!venue?._id,
  });
  const tourScenes = tourData?.scenes ?? [];
  const tourHotspots = tourData?.hotspots ?? [];

  const isHotelVenue = (venue as any)?.type === 'HOTEL';

  const { data: hotelRooms = [] } = useQuery({
    queryKey: ['public-hotel-rooms', venue?._id],
    queryFn: () => fetchVenueRooms(venue!._id),
    enabled: !!venue?._id && isHotelVenue,
  });

  const { data: roomTourData } = useQuery({
    queryKey: ['public-room-scenes', selectedRoom?._id],
    queryFn: () => fetchRoomScenes(selectedRoom!.venueId, selectedRoom!._id),
    enabled: !!selectedRoom?._id && (selectedRoom?.hasVirtualTour ?? false),
  });

  // Auto-select first scene
  const effectiveSceneId = activeSceneId ?? (scenes[0]?._id ?? null);

  // Filter placements to active scene (if scenes exist)
  const scenePlacements =
    scenes.length > 0 && effectiveSceneId
      ? allPlacements.filter((p) => !p.sceneId || p.sceneId === effectiveSceneId)
      : allPlacements;

  useEffect(() => {
    if (!venue?._id) return;
    const source = new EventSource(getVenueAvailabilityStreamUrl(venue._id));
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['venue-placements', venue._id] });
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [venue?._id, queryClient]);

  if (!slug) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Identifiant manquant.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/explorer">Explorer</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <DetailPageSkeleton />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState
          title="Lieu introuvable"
          message="Ce lieu n'existe pas ou a été déplacé."
          onRetry={() => refetch()}
        />
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/explorer">Explorer les lieux</Link>
        </Button>
      </div>
    );
  }

  const img = getVenueImage(venue);
  const allImages = getAllImages(venue);

  const hasNewImmersive =
    !!venue.immersiveType &&
    venue.immersiveType !== 'none' &&
    ((venue.immersiveSourceType === 'url' && !!venue.immersiveUrl) ||
      (venue.immersiveSourceType === 'upload' && !!venue.immersiveFile));
  const hasTour360 = tourScenes.length > 0;
  const hasAnyImmersive = hasTour360 || hasNewImmersive;

  // Build unified scene list: tour scenes first, then single panoramic file
  const immersiveSceneList = tourScenes.length > 0
    ? tourScenes.map((s) => ({ id: s._id, name: s.name, image: s.image, description: s.description }))
    : scenes.length > 0 && scenes[0]?.image
      ? scenes.map((s) => ({ id: s._id, name: s.name, image: s.image ?? '' }))
      : venue.immersiveFile
        ? [{ id: '__single__', name: venue.name ?? 'Vue 360°', image: venue.immersiveFile }]
        : [];

  const currentImmersiveScene = immersiveSceneList[activeImmersiveSceneIdx] ?? immersiveSceneList[0];

  const tabsDefaultValue = hasAnyImmersive ? 'visite360' : 'apercu';
  const hasTablePlacements = allPlacements.length > 0;

  const panoramaMarkers = scenePlacements
    .filter((p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null)
    .map((p) => ({
      placement: {
        _id: p._id, venueId: p.venueId, tableId: p.tableId, sceneId: p.sceneId,
        positionType: p.positionType as 'yaw_pitch', yaw: p.yaw, pitch: p.pitch,
        createdAt: '', updatedAt: '',
      },
      table: p.table ? {
        _id: p.table._id, venueId: p.venueId, tableNumber: p.table.tableNumber,
        name: p.table.name, capacity: p.table.capacity, locationLabel: p.table.locationLabel || '',
        price: p.table.price, minimumSpend: p.table.minimumSpend, defaultStatus: p.table.status,
        isVip: p.table.isVip, isActive: true,
      } : undefined,
    }));

  const panoAvailableCount = scenePlacements.filter((p) => p.table.status === 'available').length;
  const panoReservedCount = scenePlacements.filter((p) => p.table.status !== 'available').length;

  // Navigation hotspots for the current scene, converted from xPercent/yPercent → yaw/pitch
  const activeNavHotspots = tourHotspots.filter(
    (h) => currentImmersiveScene && h.virtualTourId === currentImmersiveScene.id
  );
  const psvNavHotspots = activeNavHotspots
    .map((h) => {
      const target = immersiveSceneList.find((s) => s.id === h.targetId);
      if (!target) return null;
      return {
        id: h._id,
        yaw: (h.xPercent / 100 - 0.5) * 2 * Math.PI,
        pitch: -(h.yPercent / 100 - 0.5) * Math.PI,
        label: target.name,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
  const hasReservableTables =
    hasTablePlacements ||
    ((venue.tables as Array<unknown> | undefined)?.length ?? 0) > 0;

  const handleTablePlacementAddToCart = (placement: TablePlacement) => {
    const table = (
      venue.tables as { _id: string; tableNumber?: number; name?: string }[] | undefined
    )?.find((t) => t._id === placement.tableId);
    const label = table ? `Table ${table.tableNumber ?? table.name ?? ''}`.trim() : 'Table';
    addItem({
      id: `venue-${venue._id}-table-${placement.tableId}-${Date.now()}`,
      type: venue.type === 'HOTEL' ? 'venue_room' : 'venue_table',
      title: venue.name,
      imageUrl: img ?? undefined,
      unitLabel: label,
      unitType: venue.type,
      dateTime: selectedSlotStartAt,
      price: venue.startingPrice ?? 0,
      quantity: 1,
      venueId: venue._id,
      slug: venue.slug,
    });
    toast.success(`${label} ajoutée au panier`);
  };

  const handleImmersiveTableSelect = (placement: PublicTablePlacement) => {
    setSelectedTable(placement);
  };


  const firstTour = venue.virtualTours?.[0];
  const tablePlacements = (venue.tablePlacements || []).filter(
    (p: TablePlacement) => p.virtualTourId === firstTour?._id
  ) as TablePlacement[];

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-200 hover:border-amber-400/40 hover:bg-amber-400/[0.08] hover:text-amber-400 hover:shadow-lg hover:shadow-amber-400/10"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour
        </button>
      </div>

      {/* Hero header */}
      <div className="relative">
        <DetailHeader
          title={venue.name}
          subtitle={[venue.city, venue.address].filter(Boolean).join(' — ')}
          imageUrl={img}
          imageAlt={venue.name}
          badges={
            <>
              <TypeBadge type={venue.type} />
              {venue.immersiveType === 'virtual-tour' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-black/30 px-2 py-0.5 text-xs font-medium text-white">
                  <Video className="size-3" /> Visite virtuelle
                </span>
              )}
              {venue.immersiveType === 'view-360' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-black/30 px-2 py-0.5 text-xs font-medium text-white">
                  <Eye className="size-3" /> Vue 360°
                </span>
              )}
            </>
          }
          metaRight={
            <div className="flex flex-col items-end gap-2">
              <ShareButton title={venue.name} />
            </div>
          }
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue={tabsDefaultValue} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            {isHotelVenue && hotelRooms.length > 0 && (
              <TabsTrigger value="chambres" className="gap-1.5">
                <BedDouble className="size-3.5" />
                Chambres & Suites
                <span className="inline-flex items-center justify-center rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                  {hotelRooms.length}
                </span>
              </TabsTrigger>
            )}
            {hasAnyImmersive && (
              <TabsTrigger value="visite360" className="gap-1.5">
                <ScanLine className="size-3.5" />
                Visite 360°
                {immersiveSceneList.length > 1 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                    {immersiveSceneList.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {hasTablePlacements && (
              <TabsTrigger value="tables" className="gap-1.5">
                Tables
                <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                  {allPlacements.length}
                </span>
              </TabsTrigger>
            )}
            <TabsTrigger value="infos">Infos pratiques</TabsTrigger>
          </TabsList>

          {/* ── Aperçu ── */}
          <TabsContent value="apercu" className="space-y-8 mt-4">
            {venue.description && (
              <div>
                <h2 className="font-semibold mb-2">Description</h2>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {venue.description}
                </p>
              </div>
            )}
            {allImages.length > 1 && (
              <VenueGallery images={allImages} venueName={venue.name} />
            )}
          </TabsContent>

          {/* ── Chambres & Suites (HOTEL only) ── */}
          {isHotelVenue && (
            <TabsContent value="chambres" className="mt-4">
              {selectedRoom ? (
                /* ── Room detail view ── */
                <RoomDetailView
                  room={selectedRoom}
                  tourScenes={roomTourData?.scenes ?? []}
                  tourHotspots={roomTourData?.hotspots ?? []}
                  sceneIdx={roomSceneIdx}
                  onSceneIdxChange={setRoomSceneIdx}
                  onBack={() => { setSelectedRoom(null); setRoomSceneIdx(0); }}
                />
              ) : (
                /* ── Room grid ── */
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    {hotelRooms.length} chambre{hotelRooms.length !== 1 ? 's' : ''} disponible{hotelRooms.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hotelRooms.map((room) => (
                      <RoomCard key={room._id} room={room} onClick={() => { setSelectedRoom(room); setRoomSceneIdx(0); }} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* ── Visite 360° (merged: tour scenes + immersive file) ── */}
          {hasAnyImmersive && (
            <TabsContent value="visite360" className="mt-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Visite 360°</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {immersiveSceneList.length > 1
                        ? 'Cliquez et faites glisser pour explorer · Naviguez entre les scènes'
                        : 'Cliquez et faites glisser pour explorer à 360°'}
                    </p>
                  </div>
                  {immersiveSceneList.length > 1 && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-3 py-1 text-xs font-semibold text-amber-400">
                      {activeImmersiveSceneIdx + 1} / {immersiveSceneList.length}
                    </span>
                  )}
                </div>

                {/* Matterport embed */}
                {isMatterport && venue.immersiveUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950" style={{ paddingBottom: '56.25%', position: 'relative' }}>
                    <iframe src={venue.immersiveUrl} title="Visite virtuelle" className="absolute inset-0 w-full h-full" allowFullScreen />
                  </div>
                ) : currentImmersiveScene ? (
                  /* 360° panorama viewer with scene navigation */
                  <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950 shadow-2xl">
                    {/* Panorama */}
                    <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                      <div className="absolute inset-0">
                        <PanoramaEngine
                          imageUrl={currentImmersiveScene.image}
                          markers={panoramaMarkers}
                          selectedMarkerId={null}
                          mode="navigate"
                          scenes={[]}
                          activeSceneId={null}
                          onSceneChange={() => {}}
                          navHotspots={psvNavHotspots}
                          onNavHotspotClick={(hotspotId) => {
                            const hotspot = activeNavHotspots.find((h) => h._id === hotspotId);
                            if (!hotspot) return;
                            const targetIdx = immersiveSceneList.findIndex((s) => s.id === hotspot.targetId);
                            if (targetIdx !== -1) setActiveImmersiveSceneIdx(targetIdx);
                          }}
                          onMarkerClick={(placementId) => {
                            const p = scenePlacements.find((pl) => pl._id === placementId);
                            if (p) handleImmersiveTableSelect(p);
                          }}
                        />
                      </div>

                      {/* Scene name badge */}
                      <div className="absolute top-3 left-3 z-20 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                          <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                          {currentImmersiveScene.name}
                        </span>
                      </div>

                      {/* Prev arrow */}
                      {activeImmersiveSceneIdx > 0 && (
                        <button
                          type="button"
                          aria-label="Scène précédente"
                          onClick={() => setActiveImmersiveSceneIdx((i) => i - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                      )}

                      {/* Next arrow */}
                      {activeImmersiveSceneIdx < immersiveSceneList.length - 1 && (
                        <button
                          type="button"
                          aria-label="Scène suivante"
                          onClick={() => setActiveImmersiveSceneIdx((i) => i + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                      )}

                      {/* Table availability badges */}
                      {panoramaMarkers.length > 0 && (
                        <div className="absolute bottom-3 left-3 z-20 flex gap-2 pointer-events-none">
                          {panoAvailableCount > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                              <span className="size-1.5 rounded-full bg-white/80" />
                              {panoAvailableCount} disponible{panoAvailableCount !== 1 ? 's' : ''}
                            </div>
                          )}
                          {panoReservedCount > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                              <span className="size-1.5 rounded-full bg-white/80" />
                              {panoReservedCount} réservée{panoReservedCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progress bar */}
                      {immersiveSceneList.length > 1 && (
                        <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-zinc-800/60">
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${((activeImmersiveSceneIdx + 1) / immersiveSceneList.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {immersiveSceneList.length > 1 && (
                      <div className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800/60">
                        <div
                          className="flex gap-2 p-2.5 overflow-x-auto scroll-smooth"
                          style={{ scrollbarWidth: 'none' }}
                          role="list"
                          aria-label="Scènes de la visite"
                        >
                          {immersiveSceneList.map((scene, idx) => {
                            const isActive = idx === activeImmersiveSceneIdx;
                            return (
                              <button
                                key={scene.id}
                                type="button"
                                role="listitem"
                                aria-label={`${scene.name}${isActive ? ' (actuelle)' : ''}`}
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => setActiveImmersiveSceneIdx(idx)}
                                className={cn(
                                  'relative shrink-0 h-[60px] w-[90px] rounded-lg overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                                  isActive
                                    ? 'border-amber-400 shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                                    : 'border-transparent opacity-55 hover:opacity-90 hover:border-zinc-600'
                                )}
                              >
                                <Image src={scene.image} alt={scene.name} fill className="object-cover" sizes="90px" />
                                {isActive && <div className="absolute inset-0 bg-amber-400/10" />}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-3 pb-0.5 px-1">
                                  <p className="text-[9px] text-white font-medium truncate text-center leading-tight">
                                    {scene.name}
                                  </p>
                                </div>
                                {isActive && (
                                  <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Reservation modal */}
                {selectedTable && (
                  <StepReservationModal
                    open={!!selectedTable}
                    onOpenChange={(open) => { if (!open) setSelectedTable(null); }}
                    placement={selectedTable}
                    venue={venue as Venue}
                    imageUrl={img ?? undefined}
                    initialStartAt={selectedSlotStartAt}
                    initialEndAt={selectedSlotEndAt}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* ── Tables ── */}
          {hasTablePlacements && (
            <TabsContent value="tables" className="mt-4">
              {(() => {
                const availableCount = allPlacements.filter(
                  (p) => p.table.status === 'available'
                ).length;
                const reservedCount = allPlacements.filter(
                  (p) => p.table.status !== 'available'
                ).length;
                return (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {availableCount} disponible{availableCount !== 1 ? 's' : ''}
                    </div>
                    {reservedCount > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400">
                        <span className="size-2 rounded-full bg-red-500" />
                        {reservedCount} réservée{reservedCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allPlacements.map((placement) => {
                  const { table } = placement;
                  const isAvailable = table.status === 'available';
                  const price = table.price ?? venue.startingPrice ?? 0;
                  const isSelected = selectedTable?._id === placement._id;

                  return (
                    <button
                      key={placement._id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && handleImmersiveTableSelect(placement)}
                      className={`group relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                        isAvailable
                          ? isSelected
                            ? 'border-amber-400/50 bg-amber-400/5 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400/20'
                            : 'border-white/[0.08] bg-white/[0.04] hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-400/10 cursor-pointer active:scale-[0.98]'
                          : 'border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {/* Status pill */}
                      <span className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isAvailable
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                          : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                      }`}>
                        <span className={`size-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {isAvailable ? 'Disponible' : 'Réservée'}
                      </span>

                      {/* Table number */}
                      <div className={`size-12 rounded-2xl flex items-center justify-center text-base font-black mb-3 transition-all ${
                        isAvailable
                          ? isSelected
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'bg-amber-400/10 text-amber-400 group-hover:bg-amber-400/20'
                          : 'bg-white/[0.04] text-neutral-600'
                      }`}>
                        {table.tableNumber}
                      </div>

                      <h4 className="font-bold text-neutral-100 pr-24 leading-tight text-sm">
                        {table.name || `Table ${table.tableNumber}`}
                        {table.isVip && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            <Crown className="size-2.5 inline -mt-px" /> VIP
                          </span>
                        )}
                      </h4>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" /> {table.capacity} pers. max
                        </span>
                        {table.locationLabel && (
                          <span className="flex items-center gap-1 text-neutral-600">
                            <MapPin className="size-3" /> {table.locationLabel}
                          </span>
                        )}
                        {price > 0 && (
                          <span className="font-semibold text-amber-400">{price} TND min.</span>
                        )}
                      </div>

                      {/* Hover CTA hint */}
                      {isAvailable && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          {isSelected ? '✓ Sélectionnée' : 'Cliquer pour sélectionner →'}
                        </div>
                      )}
                      {!isAvailable && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
                          <Lock className="size-3.5" />
                          Indisponible
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedTable && (
                <StepReservationModal
                  open={!!selectedTable}
                  onOpenChange={(open) => { if (!open) setSelectedTable(null); }}
                  placement={selectedTable}
                  venue={venue as Venue}
                  imageUrl={img ?? undefined}
                  initialStartAt={selectedSlotStartAt}
                  initialEndAt={selectedSlotEndAt}
                />
              )}
            </TabsContent>
          )}

          {/* ── Infos pratiques ── */}
          <TabsContent value="infos" className="mt-4 space-y-6">
            <dl className="space-y-3 text-sm">
              {venue.address && (
                <div>
                  <dt className="font-medium flex items-center gap-1.5 mb-0.5">
                    <MapPin className="size-3.5" /> Adresse
                  </dt>
                  <dd className="text-muted-foreground pl-5">
                    {venue.address}, {venue.city}
                  </dd>
                </div>
              )}
              {venue.phone && (
                <div>
                  <dt className="font-medium flex items-center gap-1.5 mb-0.5">
                    <Phone className="size-3.5" /> Téléphone
                  </dt>
                  <dd className="pl-5">
                    <a href={`tel:${venue.phone}`} className="text-primary hover:underline">
                      {venue.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {venue.address && venue.city && (
              <VenueMap address={venue.address} city={venue.city} />
            )}
          </TabsContent>
        </Tabs>

        {/* Similar venues at bottom */}
        <div className="mt-8">
          <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
        </div>
      </div>

      {/* ── Floating reservation button ── */}
      {hasReservableTables && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-3.5 text-sm shadow-2xl shadow-amber-400/40 transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingCart className="size-4" />
            {getReservationCTA(venue.type)}
          </button>
        </div>
      )}

      {/* ── Table picker sheet ── */}
      {hasReservableTables && (
        <TablePickerSheet
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          venue={venue as Venue}
          imageUrl={img ?? undefined}
          initialStartAt={selectedSlotStartAt}
          initialEndAt={selectedSlotEndAt}
        />
      )}
    </div>
  );
}
