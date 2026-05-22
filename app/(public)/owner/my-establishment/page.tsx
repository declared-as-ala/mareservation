'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Loader2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiGetRaw, apiPatchRaw, apiPostRaw } from '@/lib/api/client';
import type { Venue } from '@/lib/api/types';
import { PageHeader, EmptyState, FormField, dashInput } from '@/components/dashboard/primitives';
import { VenueEditor } from '@/components/dashboard/VenueEditor';
import { Modal } from '@/components/dashboard/Modal';
import { cn } from '@/lib/utils';
import { Panorama360Editor, type Panorama360EditorApis } from '@/components/dashboard/Panorama360Editor';
import {
  createOwnerVenueScene,
  createOwnerVenueSceneHotspot,
  deleteOwnerVenueScene,
  deleteOwnerVenueSceneHotspot,
  fetchOwnerVenueSceneHotspots,
  fetchOwnerVenueScenes,
} from '@/lib/api/owner-media';
import {
  createOwnerTablePlacement,
  createOwnerUnitPlacement,
  createOwnerVenueTable,
  deleteOwnerTablePlacement,
  deleteOwnerUnitPlacement,
  deleteOwnerVenueTable,
  fetchOwnerTablePlacements,
  fetchOwnerUnitPlacements,
  fetchOwnerVenueTables,
  updateOwnerTablePlacement,
  updateOwnerUnitPlacement,
  updateOwnerVenueTable,
} from '@/lib/api/owner-placements';
import { deleteOwnerTableBlock, fetchOwnerTableBlocks } from '@/lib/api/owner-table';
import { deleteOwnerCoworkingBlock, fetchOwnerCoworkingBlocks, fetchOwnerCoworkingUnits } from '@/lib/api/owner-coworking';

const CREATION_TYPES: { value: string; label: string }[] = [
  { value: 'CAFE', label: 'Café' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'HOTEL', label: 'Hôtel' },
  { value: 'COWORKING', label: 'Coworking' },
  { value: 'CINEMA', label: 'Cinéma' },
  { value: 'EVENT_SPACE', label: 'Salle / Événementiel' },
];

const OPS_LINK: Record<string, { href: string; label: string }> = {
  HOTEL: { href: '/owner/rooms', label: 'Gérer les chambres' },
  COWORKING: { href: '/owner/coworking-operations', label: 'Gérer les espaces' },
  RESTAURANT: { href: '/owner/table-operations', label: 'Gérer les tables & le service' },
  CAFE: { href: '/owner/table-operations', label: 'Gérer les tables & le service' },
  CAFE_LOUNGE: { href: '/owner/table-operations', label: 'Gérer les tables & le service' },
};

const PUBLIC_PREFIX: Record<string, string> = {
  HOTEL: 'hotel',
  COWORKING: 'coworking',
  CINEMA: 'cinema',
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  CAFE_LOUNGE: 'cafe',
};

export default function OwnerMyEstablishmentPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', type: 'CAFE', city: '', address: '', phone: '' });

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['owner-venues-management'],
    queryFn: () => apiGetRaw<Venue[]>('/owner/venues'),
  });

  const active = useMemo(
    () => venues.find((v) => v._id === activeId) ?? venues[0] ?? null,
    [venues, activeId]
  );

  const patchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!active) throw new Error('no venue');
      await apiPatchRaw(`/owner/venues/${active._id}`, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-venues-management'] }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await apiPostRaw<{ _id?: string; data?: { _id: string } }>('/owner/venues', draft);
      return (created as { data?: { _id: string } })?.data?._id ?? (created as { _id?: string })?._id;
    },
    onSuccess: (newId) => {
      toast.success('Établissement créé');
      setCreateOpen(false);
      setDraft({ name: '', type: 'CAFE', city: '', address: '', phone: '' });
      qc.invalidateQueries({ queryKey: ['owner-venues-management'] });
      if (newId) setActiveId(newId);
    },
    onError: () => toast.error('La création a échoué'),
  });

  const opsLink = active ? OPS_LINK[String(active.type).toUpperCase()] : undefined;
  const activeType = String(active?.type || '').toUpperCase();
  const isTableVenue = activeType === 'CAFE' || activeType === 'RESTAURANT' || activeType === 'CAFE_LOUNGE';
  const isCoworkingVenue = activeType === 'COWORKING';

  const tableApis: Panorama360EditorApis = {
    fetchScenes: fetchOwnerVenueScenes,
    createScene: (venueId, payload) => createOwnerVenueScene(venueId, { name: payload.name, image: payload.image }),
    deleteScene: deleteOwnerVenueScene,
    fetchHotspots: fetchOwnerVenueSceneHotspots,
    createHotspot: createOwnerVenueSceneHotspot,
    deleteHotspot: deleteOwnerVenueSceneHotspot,
    fetchPlacements: fetchOwnerTablePlacements,
    createPlacement: (venueId, payload) =>
      createOwnerTablePlacement(venueId, {
        tableId: String(payload.tableId || ''),
        sceneId: payload.sceneId,
        yaw: payload.yaw,
        pitch: payload.pitch,
      }),
    updatePlacement: (venueId, placementId, payload) => updateOwnerTablePlacement(venueId, placementId, payload),
    deletePlacement: (venueId, placementId) => deleteOwnerTablePlacement(venueId, placementId),
    fetchTables: fetchOwnerVenueTables,
    createTable: createOwnerVenueTable,
    updateTable: updateOwnerVenueTable,
    deleteTable: deleteOwnerVenueTable,
    fetchBlocks: fetchOwnerTableBlocks,
    deleteBlock: deleteOwnerTableBlock,
  };

  const unitApis: Panorama360EditorApis = {
    fetchScenes: fetchOwnerVenueScenes,
    createScene: (venueId, payload) => createOwnerVenueScene(venueId, { name: payload.name, image: payload.image }),
    deleteScene: deleteOwnerVenueScene,
    fetchHotspots: fetchOwnerVenueSceneHotspots,
    createHotspot: createOwnerVenueSceneHotspot,
    deleteHotspot: deleteOwnerVenueSceneHotspot,
    fetchPlacements: fetchOwnerUnitPlacements,
    createPlacement: (venueId, payload) =>
      createOwnerUnitPlacement(venueId, {
        reservableUnitId: String(payload.reservableUnitId || ''),
        sceneId: payload.sceneId,
        yaw: payload.yaw,
        pitch: payload.pitch,
      }),
    updatePlacement: (venueId, placementId, payload) => updateOwnerUnitPlacement(venueId, placementId, payload),
    deletePlacement: (venueId, placementId) => deleteOwnerUnitPlacement(venueId, placementId),
    fetchUnits: fetchOwnerCoworkingUnits,
    fetchBlocks: fetchOwnerCoworkingBlocks,
    deleteBlock: deleteOwnerCoworkingBlock,
  };

  return (
    <>
      <PageHeader
        title="Mon établissement"
        subtitle="Photos, tarifs, description — tout ce que vos clients voient."
        icon={Building2}
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            Nouvel établissement
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      ) : venues.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun établissement"
          description="Créez votre premier établissement pour commencer à recevoir des réservations."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black"
            >
              <Plus className="size-4" /> Créer un établissement
            </button>
          }
        />
      ) : (
        <>
          {venues.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {venues.map((v) => {
                const isActive = active?._id === v._id;
                return (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => setActiveId(v._id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                        : 'border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-neutral-200'
                    )}
                  >
                    {v.coverImage ? (
                      <span className="relative size-6 overflow-hidden rounded-md">
                        <Image src={v.coverImage} alt="" fill className="object-cover" sizes="24px" />
                      </span>
                    ) : (
                      <Building2 className="size-4" />
                    )}
                    {v.name}
                  </button>
                );
              })}
            </div>
          )}

          {active && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400/80">
                    {String(active.type).replace('_', ' ')}
                  </span>
                  {active.slug && (
                    <Link
                      href={`/${PUBLIC_PREFIX[String(active.type).toUpperCase()] ?? 'lieu'}/${active.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-amber-300"
                    >
                      Voir la fiche publique <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </div>
                {opsLink && (
                  <Link
                    href={opsLink.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-amber-400/30 hover:text-amber-300"
                  >
                    {opsLink.label} <ArrowUpRight className="size-3.5" />
                  </Link>
                )}
              </div>

              <VenueEditor
                key={active._id}
                venue={active}
                onPatch={(payload) => patchMutation.mutateAsync(payload)}
                extraTabs={
                  isTableVenue || isCoworkingVenue
                    ? [
                        {
                          id: 'visite-360',
                          label: 'Visite 360°',
                          content: (
                            <Panorama360Editor
                              venueId={active._id}
                              mode={isCoworkingVenue ? 'units' : 'tables'}
                              api={isCoworkingVenue ? unitApis : tableApis}
                            />
                          ),
                        },
                      ]
                    : []
                }
              />
            </>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvel établissement"
        subtitle="Les détails (photos, tarifs…) se complètent juste après."
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!draft.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Créer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nom de l’établissement" required>
            <input
              className={dashInput}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ex. Nour Coffee House"
            />
          </FormField>
          <FormField label="Catégorie">
            <select
              className={dashInput}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            >
              {CREATION_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#0D0D0D]">
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ville">
              <input
                className={dashInput}
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              />
            </FormField>
            <FormField label="Téléphone">
              <input
                className={dashInput}
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Adresse">
            <input
              className={dashInput}
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
