'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import {
  fetchVenueByIdOrSlug,
  getVenueAvailabilityStreamUrl,
  fetchVenueTablePlacements,
  fetchVenueScenes,
  type PublicTablePlacement,
} from '@/lib/api/venues';
import { fetchScenes } from '@/lib/api/scenes';
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
  const tabsDefaultValue = hasTour360 ? 'tour360' : hasNewImmersive ? 'visite' : 'apercu';
  const hasTablePlacements = allPlacements.length > 0;
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
            {hasTour360 && (
              <TabsTrigger value="tour360" className="gap-1.5">
                <span className="inline-block size-2 rounded-full bg-[#D4AF37] animate-pulse" aria-hidden="true" />
                Visite 360°
              </TabsTrigger>
            )}
            {hasNewImmersive && (
              <TabsTrigger value="visite">Expérience immersive</TabsTrigger>
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

          {/* ── Visite 360° interactive ── */}
          {hasTour360 && (
            <TabsContent value="tour360" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">Visite virtuelle 360°</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Naviguez entre les scènes en cliquant sur les points dorés
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                    {tourScenes.length} scène{tourScenes.length > 1 ? 's' : ''}
                  </span>
                </div>
                <VirtualTourViewer
                  scenes={tourScenes}
                  hotspots={tourHotspots}
                />
              </div>
            </TabsContent>
          )}

          {/* ── Visite immersive ── */}
          <TabsContent value="visite" className="mt-4">
            <div className="space-y-4">
              {(() => {
                const hasNewImmersiveLocal =
                  venue.immersiveType &&
                  venue.immersiveType !== 'none' &&
                  ((venue.immersiveSourceType === 'url' && venue.immersiveUrl) ||
                    (venue.immersiveSourceType === 'upload' && venue.immersiveFile));

                const tableReservationModal = selectedTable ? (
                  <StepReservationModal
                    open={!!selectedTable}
                    onOpenChange={(open) => { if (!open) setSelectedTable(null); }}
                    placement={selectedTable}
                    venue={venue as Venue}
                    imageUrl={img ?? undefined}
                    initialStartAt={selectedSlotStartAt}
                    initialEndAt={selectedSlotEndAt}
                  />
                ) : null;

                if (hasNewImmersiveLocal) {
                  const typeLabel =
                    venue.immersiveType === 'virtual-tour' ? 'Visite virtuelle' : 'Vue 360°';

                  if (isMatterport && venue.immersiveUrl) {
                    return (
                      <div className="space-y-3">
                        <h3 className="font-semibold">{typeLabel}</h3>
                        <MatterportClientViewer
                          embedUrl={venue.immersiveUrl}
                          placements={allPlacements}
                          onTableSelect={handleImmersiveTableSelect}
                        />
                        {tableReservationModal}
                      </div>
                    );
                  }

                  if (venue.immersiveSourceType === 'upload' && venue.immersiveFile) {
                    const isVideo = /\.(mp4|webm|ogg)$/i.test(venue.immersiveFile);
                    if (isVideo) {
                      return (
                        <div className="space-y-3">
                          <h3 className="font-semibold">{typeLabel}</h3>
                          <div className="aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                            <video
                              src={venue.immersiveFile}
                              controls
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      );
                    }

                    const panoramaMarkers = scenePlacements
                      .filter((p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null)
                      .map((p) => ({
                        placement: {
                          _id: p._id,
                          venueId: p.venueId,
                          tableId: p.tableId,
                          sceneId: p.sceneId,
                          positionType: p.positionType as 'yaw_pitch',
                          yaw: p.yaw,
                          pitch: p.pitch,
                          createdAt: '',
                          updatedAt: '',
                        },
                        table: p.table
                          ? {
                              _id: p.table._id,
                              venueId: p.venueId,
                              tableNumber: p.table.tableNumber,
                              name: p.table.name,
                              capacity: p.table.capacity,
                              locationLabel: p.table.locationLabel || '',
                              price: p.table.price,
                              minimumSpend: p.table.minimumSpend,
                              defaultStatus: p.table.status,
                              isVip: p.table.isVip,
                              isActive: true,
                            }
                          : undefined,
                      }));

                    const panoAvailableCount = scenePlacements.filter(
                      (p) => p.table.status === 'available'
                    ).length;
                    const panoReservedCount = scenePlacements.filter(
                      (p) => p.table.status !== 'available'
                    ).length;

                    return (
                      <div className="space-y-3">
                        <h3 className="font-semibold">{typeLabel}</h3>
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                          <PanoramaEngine
                            imageUrl={
                              scenes.length > 0 && effectiveSceneId
                                ? (scenes.find((s) => s._id === effectiveSceneId)?.image ?? venue.immersiveFile)
                                : venue.immersiveFile
                            }
                            markers={panoramaMarkers}
                            selectedMarkerId={null}
                            mode="navigate"
                            scenes={scenes}
                            activeSceneId={effectiveSceneId}
                            onSceneChange={setActiveSceneId}
                            onMarkerClick={(placementId) => {
                              const p = scenePlacements.find((pl) => pl._id === placementId);
                              if (p) handleImmersiveTableSelect(p);
                            }}
                          />
                          {allPlacements.length > 0 && (
                            <div className="absolute bottom-3 left-3 z-20 flex gap-2 pointer-events-none">
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                                <span className="size-1.5 rounded-full bg-white/80" />
                                {panoAvailableCount} disponible{panoAvailableCount !== 1 ? 's' : ''}
                              </div>
                              {panoReservedCount > 0 && (
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                                  <span className="size-1.5 rounded-full bg-white/80" />
                                  {panoReservedCount} réservée{panoReservedCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {tableReservationModal}
                      </div>
                    );
                  }

                  if (venue.immersiveSourceType === 'url' && venue.immersiveUrl) {
                    const yawPitchPlacements = allPlacements.filter(
                      (p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null
                    );
                    return (
                      <div className="space-y-3">
                        <h3 className="font-semibold">{typeLabel}</h3>
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                          <iframe
                            src={venue.immersiveUrl}
                            title={typeLabel}
                            className="h-full w-full"
                            allowFullScreen
                          />
                          {yawPitchPlacements.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none z-10">
                              <div className="relative w-full h-full">
                                {yawPitchPlacements.map((p) => {
                                  const tableNum = p.table?.tableNumber ?? '?';
                                  const xPct = 50 + ((p.yaw ?? 0) / (2 * Math.PI)) * 100;
                                  const yPct = 50 - ((p.pitch ?? 0) / Math.PI) * 100;
                                  const status = p.table?.status ?? 'available';
                                  const isAvailable = status === 'available';
                                  const isVip = p.table?.isVip;
                                  return (
                                    <div
                                      key={p._id}
                                      className="absolute flex flex-col items-center pointer-events-none"
                                      style={{
                                        left: `${xPct}%`,
                                        top: `${yPct}%`,
                                        transform: 'translateX(-50%) translateY(-100%)',
                                      }}
                                    >
                                      <div
                                        className={`text-white text-[9px] font-bold px-2 py-[2px] rounded-full shadow-lg whitespace-nowrap mb-1 select-none ${
                                          isAvailable
                                            ? isVip
                                              ? 'bg-amber-500'
                                              : 'bg-emerald-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                                      >
                                        {isAvailable
                                          ? isVip
                                            ? '★ VIP · Disponible'
                                            : '✓ Disponible'
                                          : '✗ Réservée'}
                                      </div>
                                      <div
                                        className="w-0 h-0 mb-0.5"
                                        style={{
                                          borderLeft: '4px solid transparent',
                                          borderRight: '4px solid transparent',
                                          borderTopWidth: '5px',
                                          borderTopStyle: 'solid',
                                          borderTopColor: isAvailable
                                            ? isVip
                                              ? '#f59e0b'
                                              : '#22c55e'
                                            : '#ef4444',
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={!isAvailable}
                                        className={`pointer-events-auto w-9 h-9 rounded-full border-2 border-white/80 text-white text-xs font-extrabold shadow-xl flex items-center justify-center select-none transition-transform focus:outline-none ${
                                          isAvailable
                                            ? isVip
                                              ? 'bg-amber-500 hover:scale-110 hover:bg-amber-400 cursor-pointer'
                                              : 'bg-emerald-500 hover:scale-110 hover:bg-emerald-400 cursor-pointer'
                                            : 'bg-red-500/70 opacity-65 cursor-not-allowed'
                                        }`}
                                        style={{ boxShadow: '0 3px 12px rgba(0,0,0,0.5)' }}
                                        onClick={
                                          isAvailable
                                            ? (e) => {
                                                e.stopPropagation();
                                                handleImmersiveTableSelect(p);
                                              }
                                            : undefined
                                        }
                                      >
                                        {tableNum}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {tableReservationModal}
                      </div>
                    );
                  }
                }

                if (venue.virtualTours && venue.virtualTours.length > 0) {
                  return (
                    <div className="space-y-2">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                        {venue.virtualTours[0].embedUrl ? (
                          <iframe
                            src={venue.virtualTours[0].embedUrl}
                            title="Visite virtuelle"
                            className="h-full w-full"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            Visite virtuelle disponible
                          </div>
                        )}
                        {tablePlacements.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="relative w-full h-full">
                              {tablePlacements.map((p) => {
                                const table = (
                                  venue.tables as
                                    | { _id: string; tableNumber?: number; name?: string }[]
                                    | undefined
                                )?.find((t) => t._id === p.tableId);
                                const label = table
                                  ? String(table.tableNumber ?? table.name ?? '').slice(0, 3)
                                  : 'T';
                                const xPercent = 50 + ((p.yaw ?? 0) / (2 * Math.PI)) * 100;
                                const yPercent = 50 - ((p.pitch ?? 0) / Math.PI) * 100;
                                return (
                                  <button
                                    key={p._id}
                                    type="button"
                                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/80 text-primary-foreground shadow-md pointer-events-auto flex items-center justify-center text-xs font-medium hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                                    style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                                    aria-label={label || 'Table'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTablePlacement(
                                        activeTablePlacement?._id === p._id ? null : p
                                      );
                                    }}
                                  >
                                    {label || 'T'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {activeTablePlacement && (
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                          <h3 className="font-semibold">Table sélectionnée</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Sélectionnez une date et continuez votre réservation.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                handleTablePlacementAddToCart(activeTablePlacement);
                                setActiveTablePlacement(null);
                              }}
                            >
                              Ajouter au panier
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link
                                href={`/login?returnTo=${encodeURIComponent(`/lieu/${venue.slug || venue._id}`)}`}
                              >
                                Réserver (connexion)
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setActiveTablePlacement(null)}
                            >
                              Fermer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <p className="text-muted-foreground">
                    Aucune expérience immersive pour ce lieu.
                  </p>
                );
              })()}
            </div>
          </TabsContent>

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
