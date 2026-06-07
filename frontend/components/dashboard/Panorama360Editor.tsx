'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Armchair,
  AlertTriangle,
  BadgeCheck,
  Ban,
  Camera,
  CheckCircle2,
  DoorOpen,
  Layers3,
  Link2,
  Loader2,
  Move,
  MousePointer2,
  Navigation,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, EmptyState, FormField, SectionTitle, dashInput, StatusBadge } from './primitives';
import { PriceField } from './fields';
import { uploadImageFile } from '@/lib/api/client';
import type { AdminTablePlacement, AdminTableRow } from '@/lib/api/admin';
import type { CoworkingUnit } from '@/lib/api/owner-coworking';
import type { OwnerScene, OwnerSceneHotspot } from '@/lib/api/owner-media';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import {
  ActiveBlocksList,
  BlockScheduler,
  formatBlockPeriod,
  getBlockTargetId,
  isBlockCurrent,
  type BlockableUnit,
  type SchedulerBlock,
} from './BlockScheduler';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });

type EditorMode = 'navigate' | 'place' | 'move' | 'link';

type PlacementApis = {
  fetchScenes: (venueId: string) => Promise<OwnerScene[]>;
  createScene: (venueId: string, payload: { name: string; image: string; description?: string }) => Promise<unknown>;
  deleteScene: (venueId: string, sceneId: string) => Promise<unknown>;
  fetchPlacements: (venueId: string) => Promise<AdminTablePlacement[]>;
  createPlacement: (
    venueId: string,
    payload: { sceneId: string; yaw: number; pitch: number; tableId?: string; reservableUnitId?: string }
  ) => Promise<unknown>;
  updatePlacement: (venueId: string, placementId: string, payload: { yaw: number; pitch: number }) => Promise<unknown>;
  deletePlacement: (venueId: string, placementId: string) => Promise<unknown>;
  fetchTables?: (venueId: string) => Promise<AdminTableRow[]>;
  createTable?: (
    venueId: string,
    payload: { name?: string; capacity: number; price: number; minimumSpend?: number; isVip?: boolean }
  ) => Promise<unknown>;
  updateTable?: (
    venueId: string,
    tableId: string,
    payload: Partial<{ name: string; capacity: number; price: number; minimumSpend?: number; isVip: boolean }>
  ) => Promise<unknown>;
  deleteTable?: (venueId: string, tableId: string) => Promise<unknown>;
  fetchUnits?: (venueId: string) => Promise<CoworkingUnit[]>;
  fetchBlocks?: (venueId: string) => Promise<SchedulerBlock[]>;
  deleteBlock?: (blockId: string) => Promise<unknown>;
  fetchHotspots?: (venueId: string) => Promise<OwnerSceneHotspot[]>;
  createHotspot?: (
    venueId: string,
    payload: {
      sceneId: string;
      targetSceneId: string;
      label: string;
      xPercent: number;
      yPercent: number;
      yaw?: number;
      pitch?: number;
    }
  ) => Promise<unknown>;
  deleteHotspot?: (venueId: string, hotspotId: string) => Promise<unknown>;
};
export type Panorama360EditorApis = PlacementApis;

function yawPitchToPercent(yaw: number, pitch: number) {
  return {
    xPercent: Math.max(0, Math.min(100, (yaw / (2 * Math.PI) + 0.5) * 100)),
    yPercent: Math.max(0, Math.min(100, (-pitch / Math.PI + 0.5) * 100)),
  };
}

function hotspotToYawPitch(hotspot: OwnerSceneHotspot) {
  return {
    yaw: hotspot.yaw ?? (hotspot.xPercent / 100 - 0.5) * 2 * Math.PI,
    pitch: hotspot.pitch ?? -(hotspot.yPercent / 100 - 0.5) * Math.PI,
  };
}

function unwrapTableResponse(value: unknown): AdminTableRow | null {
  if (!value || typeof value !== 'object') return null;
  if ('data' in value && value.data && typeof value.data === 'object') return value.data as AdminTableRow;
  if ('_id' in value) return value as AdminTableRow;
  return null;
}

export function Panorama360Editor({
  venueId,
  mode,
  api,
}: {
  venueId: string;
  mode: 'tables' | 'units';
  api: PlacementApis;
}) {
  const qc = useQueryClient();
  const [editorMode, setEditorMode] = useState<EditorMode>('navigate');
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [targetSceneId, setTargetSceneId] = useState<string>('');
  const [sceneToDelete, setSceneToDelete] = useState<OwnerScene | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockInitialSelectedIds, setBlockInitialSelectedIds] = useState<string[]>([]);
  const [sceneName, setSceneName] = useState('');
  const [newEntity, setNewEntity] = useState({
    name: '',
    capacity: 4,
    price: 0,
    minimumSpend: 0,
    isVip: false,
  });

  const scenesQ = useQuery({
    queryKey: ['panorama-scenes', venueId],
    queryFn: () => api.fetchScenes(venueId),
    enabled: !!venueId,
  });
  const placementsQ = useQuery({
    queryKey: ['panorama-placements', venueId, mode],
    queryFn: () => api.fetchPlacements(venueId),
    enabled: !!venueId,
  });
  const tablesQ = useQuery({
    queryKey: ['panorama-tables', venueId],
    queryFn: () => (api.fetchTables ? api.fetchTables(venueId) : Promise.resolve([])),
    enabled: !!venueId && mode === 'tables' && !!api.fetchTables,
  });
  const unitsQ = useQuery({
    queryKey: ['panorama-units', venueId],
    queryFn: () => (api.fetchUnits ? api.fetchUnits(venueId) : Promise.resolve([])),
    enabled: !!venueId && mode === 'units' && !!api.fetchUnits,
  });
  const hotspotsQ = useQuery({
    queryKey: ['panorama-hotspots', venueId],
    queryFn: () => (api.fetchHotspots ? api.fetchHotspots(venueId) : Promise.resolve([])),
    enabled: !!venueId && !!api.fetchHotspots,
  });
  const blocksQ = useQuery({
    queryKey: ['panorama-blocks', venueId, mode],
    queryFn: () => (api.fetchBlocks ? api.fetchBlocks(venueId) : Promise.resolve([])),
    enabled: !!venueId && !!api.fetchBlocks,
  });

  const scenes = scenesQ.data ?? [];
  const placements = placementsQ.data ?? [];
  const tables = tablesQ.data ?? [];
  const units = unitsQ.data ?? [];
  const hotspots = hotspotsQ.data ?? [];
  const blocks = blocksQ.data ?? [];

  const activeScene = useMemo(
    () => scenes.find((scene) => scene._id === activeSceneId) ?? scenes[0] ?? null,
    [scenes, activeSceneId]
  );

  const blockableUnits = useMemo<BlockableUnit[]>(
    () =>
      mode === 'tables'
        ? tables.map((table) => ({
            id: table._id,
            label: table.name || (table.tableNumber ? `Table ${table.tableNumber}` : 'Table'),
          }))
        : units.map((unit) => ({ id: unit._id, label: unit.label || unit.code || 'Unite' })),
    [mode, tables, units]
  );

  const currentBlockByEntityId = useMemo(() => {
    const map = new Map<string, SchedulerBlock>();
    const from = new Date();
    const to = new Date(Date.now() + 60 * 60 * 1000);
    blocks.forEach((block) => {
      if (!isBlockCurrent(block, from, to)) return;
      const id = getBlockTargetId(block);
      if (id && !map.has(id)) map.set(id, block);
    });
    return map;
  }, [blocks]);

  const placementRows = useMemo(() => {
    const rows = placements.filter((p) => p.sceneId === (activeScene?._id ?? p.sceneId));
    return rows.map((placement) => {
      if (mode === 'tables') {
        const table = tables.find((t) => t._id === placement.tableId);
        const entityId = table?._id ?? placement.tableId ?? '';
        const activeBlock = entityId ? currentBlockByEntityId.get(entityId) : undefined;
        const defaultStatus: AdminTableRow['defaultStatus'] = activeBlock ? 'blocked' : table?.defaultStatus ?? 'available';
        return {
          placement,
          entityId,
          title: table?.name || (table?.tableNumber ? `Table ${table.tableNumber}` : 'Table'),
          capacity: table?.capacity ?? 0,
          price: Number(table?.price ?? 0),
          minimumSpend: table?.minimumSpend,
          status: defaultStatus,
          isVip: !!table?.isVip,
          activeBlock,
          markerTable: table ? { ...table, defaultStatus } : table,
        };
      }
      const unit = units.find((u) => u._id === placement.reservableUnitId);
      const entityId = unit?._id ?? placement.reservableUnitId ?? '';
      const activeBlock = entityId ? currentBlockByEntityId.get(entityId) : undefined;
      const defaultStatus: AdminTableRow['defaultStatus'] = activeBlock || unit?.status === 'maintenance' ? 'blocked' : 'available';
      return {
        placement,
        entityId,
        title: unit?.label || 'Unite',
        capacity: Number(unit?.capacityMax ?? 1),
        price: Number(unit?.basePrice ?? 0),
        minimumSpend: undefined,
        status: defaultStatus,
        isVip: false,
        activeBlock,
        markerTable: {
          _id: unit?._id ?? placement.reservableUnitId ?? `unit-${placement._id}`,
          venueId,
          tableNumber: 0,
          name: unit?.label || 'Unite',
          capacity: Number(unit?.capacityMax ?? 1),
          price: Number(unit?.basePrice ?? 0),
          minimumSpend: undefined,
          defaultStatus,
          isVip: false,
          isActive: true,
          isReservable: unit?.isReservable ?? true,
          locationLabel: unit?.unitType || 'coworking',
        } as unknown as AdminTableRow,
      };
    });
  }, [placements, activeScene?._id, mode, tables, units, venueId, currentBlockByEntityId]);

  const markers = placementRows.map((row) => ({ placement: row.placement, table: row.markerTable }));
  const placedEntityIds = new Set(placements.map((p) => p.tableId ?? p.reservableUnitId).filter(Boolean));
  const selectedBlock = selectedEntityId ? currentBlockByEntityId.get(selectedEntityId) ?? null : null;
  const activeHotspots = hotspots.filter((hotspot) => hotspot.virtualTourId === activeScene?._id);
  const navHotspots = activeHotspots
    .map((hotspot) => {
      const target = scenes.find((scene) => scene._id === hotspot.targetId);
      if (!target) return null;
      const position = hotspotToYawPitch(hotspot);
      return { id: hotspot._id, yaw: position.yaw, pitch: position.pitch, label: target.name };
    })
    .filter((hotspot): hotspot is NonNullable<typeof hotspot> => hotspot !== null);
  const modeForPanorama = editorMode === 'link' ? 'place' : editorMode;
  const activeInstruction =
    editorMode === 'place'
      ? selectedEntityId
        ? 'Cliquez dans la vue pour placer la selection.'
        : mode === 'tables'
        ? 'Selectionnez une table puis cliquez dans la vue.'
        : 'Selectionnez une place puis cliquez dans la vue.'
      : editorMode === 'move'
      ? 'Selectionnez un marqueur, puis cliquez/drag pour repositionner.'
      : editorMode === 'link'
      ? targetSceneId
        ? 'Cliquez dans la vue pour creer une fleche vers la scene cible.'
        : 'Choisissez une scene cible avant de poser le lien.'
      : 'Explorez la vue et controlez vos scenes.';
  const selectedEntityLabel =
    mode === 'tables'
      ? tables.find((table) => table._id === selectedEntityId)?.name ||
        (tables.find((table) => table._id === selectedEntityId)?.tableNumber
          ? `Table ${tables.find((table) => table._id === selectedEntityId)?.tableNumber}`
          : '')
      : units.find((unit) => unit._id === selectedEntityId)?.label ?? '';

  const createSceneMut = useMutation({
    mutationFn: async (file: File) => {
      const image = await uploadImageFile(file);
      const name = sceneName.trim() || `Scene ${new Date().toLocaleDateString('fr-TN')}`;
      await api.createScene(venueId, { name, image });
    },
    onSuccess: async () => {
      setSceneName('');
      await qc.invalidateQueries({ queryKey: ['panorama-scenes', venueId] });
      toast.success('Scene 360 ajoutee.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Echec creation scene.'),
  });

  const deleteSceneMut = useMutation({
    mutationFn: (sceneId: string) => api.deleteScene(venueId, sceneId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-scenes', venueId] });
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
      await qc.invalidateQueries({ queryKey: ['panorama-hotspots', venueId] });
      setActiveSceneId(null);
      setSceneToDelete(null);
      toast.success('Scene supprimee.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur suppression scene.'),
  });

  const createPlacementMut = useMutation({
    mutationFn: (payload: { sceneId: string; yaw: number; pitch: number; tableId?: string; reservableUnitId?: string }) =>
      api.createPlacement(venueId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
      toast.success('Placement cree.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur placement.'),
  });

  const updatePlacementMut = useMutation({
    mutationFn: (payload: { placementId: string; yaw: number; pitch: number }) =>
      api.updatePlacement(venueId, payload.placementId, { yaw: payload.yaw, pitch: payload.pitch }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur deplacement.'),
  });

  const deletePlacementMut = useMutation({
    mutationFn: (placementId: string) => api.deletePlacement(venueId, placementId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
      toast.success('Placement supprime.');
    },
  });

  const createHotspotMut = useMutation({
    mutationFn: (payload: {
      sceneId: string;
      targetSceneId: string;
      label: string;
      xPercent: number;
      yPercent: number;
      yaw?: number;
      pitch?: number;
    }) => {
      if (!api.createHotspot) throw new Error('createHotspot API missing.');
      return api.createHotspot(venueId, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-hotspots', venueId] });
      toast.success('Lien 360 cree.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur creation lien 360.'),
  });

  const deleteHotspotMut = useMutation({
    mutationFn: (hotspotId: string) => {
      if (!api.deleteHotspot) throw new Error('deleteHotspot API missing.');
      return api.deleteHotspot(venueId, hotspotId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-hotspots', venueId] });
      toast.success('Lien 360 supprime.');
    },
  });

  const createTableMut = useMutation({
    mutationFn: (payload: { name?: string; capacity: number; price: number; minimumSpend?: number; isVip?: boolean }) => {
      if (!api.createTable) throw new Error('createTable API missing.');
      return api.createTable(venueId, payload);
    },
    onSuccess: async (value) => {
      await qc.invalidateQueries({ queryKey: ['panorama-tables', venueId] });
      const created = unwrapTableResponse(value);
      if (created?._id) setSelectedEntityId(created._id);
      toast.success('Table creee, cliquez dans la scene pour placer.');
    },
  });

  const updateTableMut = useMutation({
    mutationFn: (payload: {
      tableId: string;
      data: Partial<{ name: string; capacity: number; price: number; minimumSpend?: number; isVip: boolean }>;
    }) => {
      if (!api.updateTable) throw new Error('updateTable API missing.');
      return api.updateTable(venueId, payload.tableId, payload.data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-tables', venueId] });
      toast.success('Table mise a jour.');
    },
  });

  const deleteTableMut = useMutation({
    mutationFn: (tableId: string) => {
      if (!api.deleteTable) throw new Error('deleteTable API missing.');
      return api.deleteTable(venueId, tableId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-tables', venueId] });
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
      toast.success('Table supprimee.');
    },
  });

  const deleteBlockMut = useMutation({
    mutationFn: (blockId: string) => {
      if (!api.deleteBlock) throw new Error('deleteBlock API missing.');
      return api.deleteBlock(blockId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['panorama-blocks', venueId, mode] });
      await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
      await qc.invalidateQueries({ queryKey: mode === 'tables' ? ['owner-table-blocks'] : ['owner-coworking-blocks'] });
      toast.success('Blocage retire.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur suppression blocage.'),
  });

  const openBlockScheduler = (ids: string[] = []) => {
    setBlockInitialSelectedIds(ids.filter(Boolean));
    setBlockDialogOpen(true);
  };

  const refreshBlocks = async () => {
    await qc.invalidateQueries({ queryKey: ['panorama-blocks', venueId, mode] });
    await qc.invalidateQueries({ queryKey: ['panorama-placements', venueId, mode] });
    await qc.invalidateQueries({ queryKey: mode === 'tables' ? ['owner-table-blocks'] : ['owner-coworking-blocks'] });
  };

  const onPositionClick = async (yaw: number, pitch: number) => {
    if (!activeScene?._id) return;
    if (editorMode === 'link') {
      const target = scenes.find((scene) => scene._id === targetSceneId);
      if (!target) {
        toast.error('Choisissez une scene cible.');
        return;
      }
      const { xPercent, yPercent } = yawPitchToPercent(yaw, pitch);
      await createHotspotMut.mutateAsync({
        sceneId: activeScene._id,
        targetSceneId: target._id,
        label: target.name,
        xPercent,
        yPercent,
        yaw,
        pitch,
      });
      return;
    }
    if (editorMode !== 'place' || !selectedEntityId) return;
    if (mode === 'tables') {
      await createPlacementMut.mutateAsync({
        sceneId: activeScene._id,
        yaw,
        pitch,
        tableId: selectedEntityId,
      });
    } else {
      await createPlacementMut.mutateAsync({
        sceneId: activeScene._id,
        yaw,
        pitch,
        reservableUnitId: selectedEntityId,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/[0.07] bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-amber-400/[0.06] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle
              title="Studio visite 360"
              subtitle="Ajoutez des vues, reliez les scenes, placez les tables et gardez tout reservable."
              icon={Camera}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              {[
                { label: 'Scenes', value: scenes.length, icon: Layers3 },
                { label: mode === 'tables' ? 'Tables' : 'Unites', value: mode === 'tables' ? tables.length : units.length, icon: Armchair },
                { label: 'Liens', value: hotspots.length, icon: Link2 },
                { label: 'Blocages', value: blocks.filter((block) => block.isActive !== false && new Date(block.endsAt).getTime() >= Date.now()).length, icon: Ban },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-neutral-500">
                      <Icon className="size-3.5 text-amber-400" />
                      {stat.label}
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-white">{stat.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={dashInput}
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                placeholder="Nom de la nouvelle scene, ex. Terrasse, Salle principale..."
              />
              <label className={cn(dashInput, 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-4 font-semibold text-amber-300')}>
                <Upload className="size-4" /> Ajouter une vue 360
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) createSceneMut.mutate(file);
                  }}
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-white/[0.1]"
              onClick={() => {
                setEditorMode('navigate');
                setSelectedPlacementId(null);
                setSelectedEntityId(null);
              }}
            >
              <Navigation className="mr-2 size-4" /> Reinitialiser
            </Button>
            {api.fetchBlocks && (
              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={() => openBlockScheduler(selectedEntityId ? [selectedEntityId] : [])}
              >
                <Ban className="mr-2 size-4" />
                {mode === 'tables' ? 'Bloquer une table' : 'Bloquer une place'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto p-3">
          {scenes.map((scene, index) => {
            const isActive = activeScene?._id === scene._id;
            return (
              <button
                key={scene._id}
                type="button"
                onClick={() => setActiveSceneId(scene._id)}
                className={cn(
                  'group flex min-w-[190px] items-center gap-3 rounded-xl border p-2 text-left transition-all',
                  isActive
                    ? 'border-amber-400/40 bg-amber-400/[0.08]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]'
                )}
              >
                <span className="relative flex size-14 shrink-0 overflow-hidden rounded-lg bg-black">
                  <img src={scene.image} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-neutral-100">{scene.name || `Scene ${index + 1}`}</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">
                    {placements.filter((placement) => placement.sceneId === scene._id).length} placement(s) · {hotspots.filter((hotspot) => hotspot.virtualTourId === scene._id).length} lien(s)
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {!activeScene ? (
        <EmptyState
          icon={Camera}
          title="Aucune vue 360"
          description="Ajoutez une image equirectangulaire 360 pour commencer."
        />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_430px]">
          <Card className="p-3">
            <div className="mb-3 grid gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {[
                  { id: 'navigate' as EditorMode, label: 'Explorer', icon: Navigation },
                  { id: 'place' as EditorMode, label: mode === 'tables' ? 'Placer table' : 'Placer unite', icon: MousePointer2 },
                  { id: 'move' as EditorMode, label: 'Deplacer', icon: Move },
                  { id: 'link' as EditorMode, label: 'Lier scene', icon: Link2, disabled: !api.createHotspot || scenes.length < 2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = editorMode === item.id;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      disabled={item.disabled}
                      onClick={() => setEditorMode(item.id)}
                      className={cn('h-10 shrink-0 rounded-xl text-xs sm:text-sm', !active && 'border-white/[0.08]')}
                    >
                      <Icon className="mr-1.5 size-4" /> {item.label}
                    </Button>
                  );
                })}
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto h-10 shrink-0 cursor-pointer rounded-xl px-3 sm:px-4"
                  onClick={() => setSceneToDelete(activeScene)}
                  aria-label={`Supprimer la scene ${activeScene.name}`}
                >
                  <Trash2 className="mr-1.5 size-4" /> Supprimer la scene
                </Button>
              </div>

              {editorMode === 'link' && (
                <div className="grid min-w-0 gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-2 sm:grid-cols-[auto_minmax(0,360px)_1fr] sm:items-center">
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/20 px-3 text-xs font-bold uppercase text-amber-300">
                    <Link2 className="size-4" />
                    Destination
                  </span>
                  <select
                    className={cn(dashInput, 'h-10 w-full min-w-0 py-0')}
                    value={targetSceneId}
                    onChange={(e) => setTargetSceneId(e.target.value)}
                  >
                    <option value="" className="bg-[#0D0D0D]">Choisir une scene cible</option>
                    {scenes
                      .filter((scene) => scene._id !== activeScene._id)
                      .map((scene) => (
                        <option key={scene._id} value={scene._id} className="bg-[#0D0D0D]">
                          {scene.name}
                        </option>
                      ))}
                  </select>
                  <p className="min-w-0 text-xs leading-relaxed text-neutral-400">
                    Cliquez ensuite dans la vue pour poser une fleche vers cette scene.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-neutral-400">
              <BadgeCheck className="size-4 text-amber-400" />
              <span>{activeInstruction}</span>
              {selectedEntityLabel && (
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-semibold text-amber-300">
                  Selection: {selectedEntityLabel}
                </span>
              )}
              {selectedEntityId && (
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-semibold',
                    selectedBlock
                      ? 'border-red-500/25 bg-red-500/10 text-red-300'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  )}
                >
                  {selectedBlock
                    ? `Bloquee: ${formatBlockPeriod(selectedBlock.startsAt, selectedBlock.endsAt)}`
                    : 'Disponible maintenant'}
                </span>
              )}
            </div>

            <div className="relative aspect-[16/9] min-h-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <PanoramaEngine
                imageUrl={activeScene.image}
                markers={markers}
                selectedMarkerId={selectedPlacementId}
                mode={modeForPanorama}
                scenes={scenes}
                activeSceneId={activeScene._id}
                navHotspots={navHotspots}
                onNavHotspotClick={(hotspotId) => {
                  const hotspot = hotspots.find((item) => item._id === hotspotId);
                  if (hotspot?.targetId) setActiveSceneId(hotspot.targetId);
                }}
                onSceneChange={setActiveSceneId}
                onPositionClick={onPositionClick}
                onMarkerClick={(placementId) => {
                  setSelectedPlacementId(placementId);
                  const row = placementRows.find((item) => item.placement._id === placementId);
                  if (row?.entityId) setSelectedEntityId(row.entityId);
                }}
                onMarkerMoved={(placementId, yaw, pitch) => {
                  if (editorMode !== 'move') return;
                  updatePlacementMut.mutate({ placementId, yaw, pitch });
                }}
              />
            </div>

            {activeHotspots.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeHotspots.map((hotspot) => {
                  const target = scenes.find((scene) => scene._id === hotspot.targetId);
                  return (
                    <span
                      key={hotspot._id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-300"
                    >
                      <DoorOpen className="size-3.5 text-amber-400" />
                      Vers {target?.name ?? hotspot.label}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => deleteHotspotMut.mutate(hotspot._id)}
                        aria-label="Supprimer lien 360"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            {api.fetchBlocks && (
              <ActiveBlocksList
                blocks={blocks}
                units={blockableUnits}
                mode={mode}
                onDelete={(blockId) => deleteBlockMut.mutate(blockId)}
                deletingId={deleteBlockMut.variables ?? null}
              />
            )}

            {mode === 'tables' && (
              <Card className="p-4">
                <SectionTitle
                  title="Creer une table"
                  subtitle="Une fois creee, elle devient selectionnee. Cliquez ensuite dans la vue."
                  icon={Plus}
                />
                <div className="space-y-3">
                  <FormField label="Nom">
                    <input
                      className={dashInput}
                      value={newEntity.name}
                      onChange={(e) => setNewEntity((state) => ({ ...state, name: e.target.value }))}
                      placeholder="Ex. Table terrasse"
                    />
                  </FormField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Capacite">
                      <input
                        type="number"
                        min={1}
                        className={dashInput}
                        value={newEntity.capacity}
                        onChange={(e) => setNewEntity((state) => ({ ...state, capacity: Number(e.target.value || 1) }))}
                      />
                    </FormField>
                    <PriceField
                      label="Prix"
                      value={newEntity.price}
                      onChange={(value) => setNewEntity((state) => ({ ...state, price: Number(value || 0) }))}
                    />
                  </div>
                  <PriceField
                    label="Minimum consommation"
                    value={newEntity.minimumSpend}
                    onChange={(value) => setNewEntity((state) => ({ ...state, minimumSpend: Number(value || 0) }))}
                    helper="Optionnel. Laissez 0 si aucun minimum."
                  />
                  <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-neutral-300">
                    Table VIP
                    <input
                      type="checkbox"
                      checked={newEntity.isVip}
                      onChange={(e) => setNewEntity((state) => ({ ...state, isVip: e.target.checked }))}
                      className="size-4 accent-amber-400"
                    />
                  </label>
                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl"
                    disabled={createTableMut.isPending}
                    onClick={async () => {
                      await createTableMut.mutateAsync({
                        name: newEntity.name.trim() || undefined,
                        capacity: Math.max(1, newEntity.capacity),
                        price: Math.max(0, newEntity.price),
                        minimumSpend: newEntity.minimumSpend > 0 ? newEntity.minimumSpend : undefined,
                        isVip: newEntity.isVip,
                      });
                      setEditorMode('place');
                    }}
                  >
                    <Plus className="mr-1.5 size-4" /> Creer et placer
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <SectionTitle
                title={mode === 'tables' ? 'Gestion des tables' : 'Gestion des unites'}
                subtitle="Selection, placement, prix et suppression dans un seul endroit."
                icon={Armchair}
              />
              <div className="space-y-3">
                {(mode === 'tables' ? tables : units).length === 0 ? (
                  <EmptyState
                    icon={Armchair}
                    title={mode === 'tables' ? 'Aucune table' : 'Aucune unite'}
                    description={mode === 'tables' ? 'Creez votre premiere table puis placez-la dans la vue.' : 'Ajoutez vos unites coworking depuis les operations coworking.'}
                  />
                ) : null}

                {mode === 'tables'
                  ? tables.map((table) => {
                      const placement = placements.find((item) => item.tableId === table._id && item.sceneId === activeScene._id);
                      const isSelected = selectedEntityId === table._id;
                      const isPlacedSomewhere = placedEntityIds.has(table._id);
                      const activeBlock = currentBlockByEntityId.get(table._id);
                      return (
                        <div
                          key={table._id}
                          className={cn(
                            'rounded-2xl border p-3 transition-all',
                            isSelected
                              ? 'border-amber-400/40 bg-amber-400/[0.07]'
                              : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.16]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              className="flex min-w-0 items-center gap-3 text-left"
                              onClick={() => {
                                setSelectedEntityId(table._id);
                                if (placement?._id) setSelectedPlacementId(placement._id);
                              }}
                            >
                              <span className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black',
                                isSelected ? 'border-amber-400/35 bg-amber-400 text-black' : 'border-white/[0.08] bg-black/30 text-amber-300'
                              )}>
                                {table.tableNumber}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-neutral-100">{table.name || `Table ${table.tableNumber}`}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                                  <span>{table.capacity} pers.</span>
                                  <span>{Number(table.price || 0)} TND</span>
                                  {table.minimumSpend ? <span>Min. {table.minimumSpend} TND</span> : null}
                                </span>
                              </span>
                            </button>
                            <StatusBadge
                              status={activeBlock ? 'suspended' : placement ? 'active' : isPlacedSomewhere ? 'pending' : 'draft'}
                              label={activeBlock ? 'Bloquee' : placement ? 'Dans cette scene' : isPlacedSomewhere ? 'Placee ailleurs' : 'Non placee'}
                            />
                          </div>

                          <div
                            className={cn(
                              'mt-3 rounded-xl border px-3 py-2 text-xs',
                              activeBlock
                                ? 'border-red-500/20 bg-red-500/10 text-red-200'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            )}
                          >
                            {activeBlock
                              ? `Indisponible: ${formatBlockPeriod(activeBlock.startsAt, activeBlock.endsAt)}`
                              : 'Disponible maintenant. Cliquez sur Bloquer pour fermer ce creneau.'}
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <PriceField
                              label="Prix"
                              value={table.price}
                              onChange={(value) => updateTableMut.mutate({ tableId: table._id, data: { price: Number(value || 0) } })}
                            />
                            <PriceField
                              label="Minimum"
                              value={table.minimumSpend}
                              onChange={(value) =>
                                updateTableMut.mutate({
                                  tableId: table._id,
                                  data: { minimumSpend: value == null ? undefined : Number(value) },
                                })
                              }
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              className="h-9 rounded-xl text-xs"
                              onClick={() => {
                                setSelectedEntityId(table._id);
                                setEditorMode('place');
                              }}
                            >
                              <MousePointer2 className="mr-1 size-3.5" /> Placer
                            </Button>
                            {placement && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl text-xs"
                                  onClick={() => {
                                    setSelectedEntityId(table._id);
                                    setSelectedPlacementId(placement._id);
                                    setEditorMode('move');
                                  }}
                                >
                                  <Move className="mr-1 size-3.5" /> Deplacer
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-red-500/25 text-xs text-red-300 hover:bg-red-500/10"
                                  onClick={() => deletePlacementMut.mutate(placement._id)}
                                >
                                  Retirer marker
                                </Button>
                              </>
                            )}
                            {api.fetchBlocks && (
                              activeBlock ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-emerald-500/25 text-xs text-emerald-300 hover:bg-emerald-500/10"
                                  disabled={deleteBlockMut.isPending && deleteBlockMut.variables === activeBlock._id}
                                  onClick={() => deleteBlockMut.mutate(activeBlock._id)}
                                >
                                  Debloquer
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-amber-400/25 text-xs text-amber-300 hover:bg-amber-400/10"
                                  onClick={() => openBlockScheduler([table._id])}
                                >
                                  <Ban className="mr-1 size-3.5" /> Bloquer
                                </Button>
                              )
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              className="ml-auto h-9 rounded-xl border-red-500/25 text-xs text-red-300 hover:bg-red-500/10"
                              onClick={() => {
                                if (window.confirm('Supprimer cette table et ses placements ?')) deleteTableMut.mutate(table._id);
                              }}
                            >
                              <Trash2 className="mr-1 size-3.5" /> Supprimer
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  : units.map((unit) => {
                      const placement = placements.find((item) => item.reservableUnitId === unit._id && item.sceneId === activeScene._id);
                      const isSelected = selectedEntityId === unit._id;
                      const activeBlock = currentBlockByEntityId.get(unit._id);
                      return (
                        <div
                          key={unit._id}
                          className={cn(
                            'rounded-2xl border p-3 transition-all',
                            isSelected ? 'border-amber-400/40 bg-amber-400/[0.07]' : 'border-white/[0.08] bg-white/[0.025]'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntityId(unit._id);
                              if (placement?._id) setSelectedPlacementId(placement._id);
                            }}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-neutral-100">{unit.label}</span>
                            <span className="text-[11px] text-neutral-500">{unit.basePrice} TND · {unit.capacityMax ?? 1} place(s)</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <StatusBadge
                              status={activeBlock ? 'suspended' : placement ? 'active' : 'draft'}
                              label={activeBlock ? 'Bloquee' : placement ? 'Placee' : 'A placer'}
                            />
                            <CheckCircle2 className={cn('size-4', isSelected ? 'text-amber-400' : 'text-neutral-700')} />
                          </span>
                          </button>

                          <div
                            className={cn(
                              'mt-3 rounded-xl border px-3 py-2 text-xs',
                              activeBlock
                                ? 'border-red-500/20 bg-red-500/10 text-red-200'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            )}
                          >
                            {activeBlock
                              ? `Indisponible: ${formatBlockPeriod(activeBlock.startsAt, activeBlock.endsAt)}`
                              : 'Disponible maintenant.'}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              className="h-9 rounded-xl text-xs"
                              onClick={() => {
                                setSelectedEntityId(unit._id);
                                setEditorMode('place');
                              }}
                            >
                              <MousePointer2 className="mr-1 size-3.5" /> Placer
                            </Button>
                            {placement && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-xl text-xs"
                                onClick={() => {
                                  setSelectedEntityId(unit._id);
                                  setSelectedPlacementId(placement._id);
                                  setEditorMode('move');
                                }}
                              >
                                <Move className="mr-1 size-3.5" /> Deplacer
                              </Button>
                            )}
                            {api.fetchBlocks && (
                              activeBlock ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-emerald-500/25 text-xs text-emerald-300 hover:bg-emerald-500/10"
                                  disabled={deleteBlockMut.isPending && deleteBlockMut.variables === activeBlock._id}
                                  onClick={() => deleteBlockMut.mutate(activeBlock._id)}
                                >
                                  Debloquer
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-amber-400/25 text-xs text-amber-300 hover:bg-amber-400/10"
                                  onClick={() => openBlockScheduler([unit._id])}
                                >
                                  <Ban className="mr-1 size-3.5" /> Bloquer
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {api.fetchBlocks && (
        <BlockScheduler
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
          venueId={venueId}
          units={blockableUnits}
          mode={mode}
          initialSelectedIds={blockInitialSelectedIds}
          onCreated={() => {
            void refreshBlocks();
          }}
        />
      )}

      <Modal
        open={!!sceneToDelete}
        onClose={() => {
          if (!deleteSceneMut.isPending) setSceneToDelete(null);
        }}
        title="Supprimer cette scene 360 ?"
        subtitle="Cette action retirera aussi les liens 360 et les marqueurs attaches a cette scene."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/[0.1]"
              disabled={deleteSceneMut.isPending}
              onClick={() => setSceneToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-xl"
              disabled={!sceneToDelete || deleteSceneMut.isPending}
              onClick={() => {
                if (sceneToDelete?._id) deleteSceneMut.mutate(sceneToDelete._id);
              }}
            >
              {deleteSceneMut.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 size-4" />
              )}
              Supprimer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-100">{sceneToDelete?.name ?? 'Scene 360'}</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                Les clients ne verront plus cette vue dans la visite immersive. Les tables restent dans votre liste,
                mais leurs placements dans cette scene seront retires.
              </p>
            </div>
          </div>

          {sceneToDelete?.image && (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <img
                src={sceneToDelete.image}
                alt=""
                className="h-36 w-full object-cover"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
