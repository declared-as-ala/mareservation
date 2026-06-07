'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Camera,
  ImagePlus,
  Plus,
  ScanLine,
  ShieldBan,
  Trash2,
} from 'lucide-react';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import {
  createOwnerCoworkingAddon,
  createOwnerCoworkingUnit,
  deleteOwnerCoworkingBlock,
  fetchOwnerCoworkingAddons,
  fetchOwnerCoworkingBlocks,
  fetchOwnerCoworkingKpis,
  fetchOwnerCoworkingPolicy,
  fetchOwnerCoworkingUnits,
  saveOwnerCoworkingPolicy,
} from '@/lib/api/owner-coworking';
import {
  appendOwnerVenueGalleryImage,
  deleteOwnerVenueScene,
  fetchOwnerVenueScenes,
  removeOwnerVenueGalleryImage,
  uploadOwnerVenueCover,
  uploadOwnerVenueImmersiveSet,
} from '@/lib/api/owner-media';
import { OpsCard, OpsField, OpsGrid, OpsHeader, OpsKpi, OpsPage, OpsSectionTitle, opsInputClassName } from '@/components/owner/ops-primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ActiveBlocksList, BlockScheduler, type BlockableUnit } from '@/components/dashboard/BlockScheduler';

type ActiveTab = 'overview' | 'units' | 'addons' | 'policy' | 'blocks' | 'media';

export default function OwnerCoworkingOperationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<ActiveTab>('overview');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({
    unitType: 'coworking_desk' as 'coworking_desk' | 'coworking_office' | 'coworking_meeting_room',
    label: '',
    code: '',
    capacityMax: 1,
    basePrice: 0,
  });
  const [addonForm, setAddonForm] = useState({ key: '', name: '', unitPrice: 0, maxQty: 1 });
  const [policyForm, setPolicyForm] = useState({
    openingHour: 8,
    closingHour: 22,
    halfDayHours: 4,
    fullDayHours: 8,
    maxBookingHours: 12,
    allowOvertime: false,
    overtimeAfterHours: 8,
    overtimeHourlyRate: 0,
  });

  const { data: ownerData } = useQuery({ queryKey: ['owner-dashboard'], queryFn: fetchOwnerDashboard });
  const venues = useMemo(() => (ownerData?.venues ?? []).filter((v) => v.type === 'COWORKING'), [ownerData?.venues]);
  const venueId = selectedVenueId || venues[0]?._id || '';
  const activeVenue = venues.find((v) => v._id === venueId);

  const unitsQ = useQuery({ queryKey: ['owner-coworking-units', venueId], queryFn: () => fetchOwnerCoworkingUnits(venueId), enabled: !!venueId });
  const addonsQ = useQuery({ queryKey: ['owner-coworking-addons', venueId], queryFn: () => fetchOwnerCoworkingAddons(venueId), enabled: !!venueId });
  const policyQ = useQuery({ queryKey: ['owner-coworking-policy', venueId], queryFn: () => fetchOwnerCoworkingPolicy(venueId), enabled: !!venueId });
  const blocksQ = useQuery({ queryKey: ['owner-coworking-blocks', venueId], queryFn: () => fetchOwnerCoworkingBlocks(venueId), enabled: !!venueId });
  const kpisQ = useQuery({ queryKey: ['owner-coworking-kpis', venueId], queryFn: () => fetchOwnerCoworkingKpis(venueId), enabled: !!venueId });
  const scenesQ = useQuery({ queryKey: ['owner-coworking-scenes', venueId], queryFn: () => fetchOwnerVenueScenes(venueId), enabled: !!venueId });

  useEffect(() => {
    if (!policyQ.data) return;
    setPolicyForm({
      openingHour: Number(policyQ.data.openingHour ?? 8),
      closingHour: Number(policyQ.data.closingHour ?? 22),
      halfDayHours: Number(policyQ.data.halfDayHours ?? 4),
      fullDayHours: Number(policyQ.data.fullDayHours ?? 8),
      maxBookingHours: Number(policyQ.data.maxBookingHours ?? 12),
      allowOvertime: !!policyQ.data.allowOvertime,
      overtimeAfterHours: Number(policyQ.data.overtimeAfterHours ?? 8),
      overtimeHourlyRate: Number(policyQ.data.overtimeHourlyRate ?? 0),
    });
  }, [policyQ.data]);

  const refreshMedia = () => {
    qc.invalidateQueries({ queryKey: ['owner-dashboard'] });
    qc.invalidateQueries({ queryKey: ['owner-venues-management'] });
    qc.invalidateQueries({ queryKey: ['owner-coworking-scenes', venueId] });
  };

  const unitMut = useMutation({
    mutationFn: () => createOwnerCoworkingUnit(venueId, unitForm),
    onSuccess: () => {
      toast.success('Unite coworking creee.');
      setUnitForm({ unitType: 'coworking_desk', label: '', code: '', capacityMax: 1, basePrice: 0 });
      qc.invalidateQueries({ queryKey: ['owner-coworking-units'] });
      qc.invalidateQueries({ queryKey: ['owner-coworking-kpis'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const addonMut = useMutation({
    mutationFn: () => createOwnerCoworkingAddon(venueId, addonForm),
    onSuccess: () => {
      toast.success('Addon coworking cree.');
      setAddonForm({ key: '', name: '', unitPrice: 0, maxQty: 1 });
      qc.invalidateQueries({ queryKey: ['owner-coworking-addons'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const policyMut = useMutation({
    mutationFn: () => saveOwnerCoworkingPolicy(venueId, policyForm),
    onSuccess: () => {
      toast.success('Politique coworking sauvegardee.');
      qc.invalidateQueries({ queryKey: ['owner-coworking-policy'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const delBlockMut = useMutation({
    mutationFn: (id: string) => deleteOwnerCoworkingBlock(id),
    onSuccess: () => {
      toast.success('Bloc supprime.');
      qc.invalidateQueries({ queryKey: ['owner-coworking-blocks'] });
      qc.invalidateQueries({ queryKey: ['owner-coworking-kpis'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  async function onUploadProfile(file: File) {
    if (!venueId) return;
    await uploadOwnerVenueCover(venueId, file);
    toast.success('Photo de profil mise a jour.');
    refreshMedia();
  }

  async function onUploadGallery(file: File) {
    if (!venueId || !activeVenue) return;
    await appendOwnerVenueGalleryImage(venueId, activeVenue.gallery ?? [], file);
    toast.success('Image ajoutee a la galerie.');
    refreshMedia();
  }

  async function onRemoveGallery(imageUrl: string) {
    if (!venueId || !activeVenue) return;
    await removeOwnerVenueGalleryImage(venueId, activeVenue.gallery ?? [], imageUrl);
    toast.success('Image retiree de la galerie.');
    refreshMedia();
  }

  async function onUploadImmersive(files: FileList | null) {
    if (!venueId || !files?.length || !activeVenue) return;
    await uploadOwnerVenueImmersiveSet(venueId, Array.from(files), {
      baseSceneName: sceneName,
      currentImmersiveFile: activeVenue.immersiveFile || '',
    });
    setSceneName('');
    toast.success('Vue 360 et snapshots mis a jour.');
    refreshMedia();
  }

  async function onDeleteScene(sceneId: string) {
    if (!venueId) return;
    await deleteOwnerVenueScene(venueId, sceneId);
    toast.success('Snapshot supprime.');
    refreshMedia();
  }

  const units = unitsQ.data ?? [];
  const addons = addonsQ.data ?? [];
  const blocks = blocksQ.data ?? [];
  const kpis = kpisQ.data;
  const scenes = scenesQ.data ?? [];
  const blockableUnits = useMemo<BlockableUnit[]>(
    () => units.map((unit) => ({ id: unit._id, label: unit.label || unit.code || 'Unite' })),
    [units]
  );

  return (
    <OpsPage>
      <Link href="/owner" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-300">
        <ArrowLeft className="size-4" /> Espace proprietaire
      </Link>

      <OpsHeader
        title="Coworking Operations"
        subtitle="Production workspace: units, addons, policies, blocks et media studio."
        right={
          <Select value={venueId || 'none'} onValueChange={(v) => setSelectedVenueId(v === 'none' ? '' : v)}>
            <SelectTrigger className="ops-input min-w-[240px]">
              <SelectValue placeholder="Selectionner un coworking" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
              <SelectItem value="none">Selectionner un coworking</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v._id} value={v._id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <OpsGrid className="sm:grid-cols-2 xl:grid-cols-6">
        <OpsKpi label="Reservations (30j)" value={kpis ? String(kpis.totalReservations) : '--'} icon={<BarChart3 className="size-4 text-amber-300" />} />
        <OpsKpi label="CA (30j)" value={kpis ? `${kpis.revenue.toFixed(2)} TND` : '--'} icon={<BriefcaseBusiness className="size-4 text-amber-300" />} />
        <OpsKpi label="Heures vendues" value={kpis ? `${kpis.bookedHours}h` : '--'} icon={<CalendarClock className="size-4 text-amber-300" />} />
        <OpsKpi label="Utilisation" value={kpis ? `${kpis.utilizationPct}%` : '--'} icon={<BarChart3 className="size-4 text-amber-300" />} />
        <OpsKpi label="Blocs actifs" value={kpis ? String(kpis.activeBlocks) : '--'} icon={<ShieldBan className="size-4 text-amber-300" />} />
        <OpsKpi label="A venir" value={kpis ? String(kpis.upcoming) : '--'} icon={<CalendarClock className="size-4 text-amber-300" />} />
      </OpsGrid>

      <OpsCard>
        <div className="flex flex-wrap gap-2">
          {([
            ['overview', 'Overview'],
            ['units', 'Units'],
            ['addons', 'Add-ons'],
            ['policy', 'Policies'],
            ['blocks', 'Availability Blocks'],
            ['media', 'Media Studio'],
          ] as Array<[ActiveTab, string]>).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-zinc-700 bg-zinc-950/60 text-zinc-300'
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </OpsCard>

      {tab === 'overview' ? (
        <OpsGrid className="xl:grid-cols-2">
          <OpsCard>
            <OpsSectionTitle title="Operations Status" subtitle="Alertes et synthese coworking." />
            <div className="space-y-2">
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
                Unites actives: <span className="font-semibold text-zinc-100">{units.length}</span>
              </p>
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
                Add-ons actifs: <span className="font-semibold text-zinc-100">{addons.length}</span>
              </p>
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
                Snapshots 360: <span className="font-semibold text-zinc-100">{scenes.length}</span>
              </p>
            </div>
          </OpsCard>
          <OpsCard>
            <OpsSectionTitle title="Quick Actions" subtitle="Acces direct aux surfaces critiques." />
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionLink href="/owner/my-establishment" label="Mon etablissement" />
              <ActionLink href="/owner/reservations" label="Reservations" />
              <ActionLink href="/owner/reports" label="Rapports" />
              <ActionLink href="/owner/settings" label="Parametres" />
            </div>
          </OpsCard>
        </OpsGrid>
      ) : null}

      {tab === 'units' ? (
        <OpsGrid className="xl:grid-cols-[1.1fr_1fr]">
          <OpsCard>
            <OpsSectionTitle title="Creer unite coworking" />
            <OpsGrid className="grid-cols-1 md:grid-cols-2">
              <OpsField label="Type unite">
                <Select
                  value={unitForm.unitType}
                  onValueChange={(v) =>
                    setUnitForm((p) => ({ ...p, unitType: v as 'coworking_desk' | 'coworking_office' | 'coworking_meeting_room' }))
                  }
                >
                  <SelectTrigger className="ops-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectItem value="coworking_desk">Hot desk</SelectItem>
                    <SelectItem value="coworking_office">Private office</SelectItem>
                    <SelectItem value="coworking_meeting_room">Meeting room</SelectItem>
                  </SelectContent>
                </Select>
              </OpsField>
              <OpsField label="Code">
                <input className={opsInputClassName()} value={unitForm.code} onChange={(e) => setUnitForm((p) => ({ ...p, code: e.target.value }))} />
              </OpsField>
              <OpsField label="Label" helper="Nom affiche au client">
                <input className={opsInputClassName()} value={unitForm.label} onChange={(e) => setUnitForm((p) => ({ ...p, label: e.target.value }))} />
              </OpsField>
              <OpsField label="Capacite max">
                <input type="number" min={1} className={opsInputClassName()} value={unitForm.capacityMax} onChange={(e) => setUnitForm((p) => ({ ...p, capacityMax: Number(e.target.value) }))} />
              </OpsField>
              <OpsField label="Base price (TND)">
                <input type="number" min={0} className={opsInputClassName()} value={unitForm.basePrice} onChange={(e) => setUnitForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} />
              </OpsField>
            </OpsGrid>
            <Button onClick={() => unitMut.mutate()} disabled={!venueId || unitMut.isPending} className="mt-3 h-11 bg-amber-400 text-black hover:bg-amber-300">
              <Plus className="mr-1 size-4" /> Ajouter unite
            </Button>
          </OpsCard>
          <OpsCard>
            <OpsSectionTitle title="Unites existantes" />
            <div className="space-y-2">
              {units.length === 0 ? <p className="text-sm text-zinc-500">Aucune unite creee.</p> : null}
              {units.map((u) => (
                <div key={u._id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="font-semibold text-zinc-100">{u.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{u.unitType} · cap {u.capacityMax ?? 1} · {u.basePrice} TND</p>
                </div>
              ))}
            </div>
          </OpsCard>
        </OpsGrid>
      ) : null}

      {tab === 'addons' ? (
        <OpsGrid className="xl:grid-cols-[1.1fr_1fr]">
          <OpsCard>
            <OpsSectionTitle title="Creer add-on coworking" />
            <OpsGrid className="grid-cols-1 md:grid-cols-2">
              <OpsField label="Key">
                <input className={opsInputClassName()} value={addonForm.key} onChange={(e) => setAddonForm((p) => ({ ...p, key: e.target.value }))} />
              </OpsField>
              <OpsField label="Nom">
                <input className={opsInputClassName()} value={addonForm.name} onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))} />
              </OpsField>
              <OpsField label="Prix unitaire">
                <input type="number" min={0} className={opsInputClassName()} value={addonForm.unitPrice} onChange={(e) => setAddonForm((p) => ({ ...p, unitPrice: Number(e.target.value) }))} />
              </OpsField>
              <OpsField label="Max qty">
                <input type="number" min={1} className={opsInputClassName()} value={addonForm.maxQty} onChange={(e) => setAddonForm((p) => ({ ...p, maxQty: Number(e.target.value) }))} />
              </OpsField>
            </OpsGrid>
            <Button onClick={() => addonMut.mutate()} disabled={!venueId || addonMut.isPending} className="mt-3 h-11 bg-amber-400 text-black hover:bg-amber-300">
              <Plus className="mr-1 size-4" /> Ajouter add-on
            </Button>
          </OpsCard>
          <OpsCard>
            <OpsSectionTitle title="Add-ons existants" />
            <div className="space-y-2">
              {addons.length === 0 ? <p className="text-sm text-zinc-500">Aucun add-on cree.</p> : null}
              {addons.map((a) => (
                <div key={a._id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="font-semibold text-zinc-100">{a.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{a.key} · {a.unitPrice} TND · max {a.maxQty ?? '-'}</p>
                </div>
              ))}
            </div>
          </OpsCard>
        </OpsGrid>
      ) : null}

      {tab === 'policy' ? (
        <OpsCard>
          <OpsSectionTitle title="Policies & Overtime" subtitle="Regles horaires et depassements." />
          <OpsGrid className="grid-cols-1 md:grid-cols-3">
            <NumberField label="Ouverture" value={policyForm.openingHour} onChange={(v) => setPolicyForm((p) => ({ ...p, openingHour: v }))} />
            <NumberField label="Fermeture" value={policyForm.closingHour} onChange={(v) => setPolicyForm((p) => ({ ...p, closingHour: v }))} />
            <NumberField label="Half-day (h)" value={policyForm.halfDayHours} onChange={(v) => setPolicyForm((p) => ({ ...p, halfDayHours: v }))} />
            <NumberField label="Full-day (h)" value={policyForm.fullDayHours} onChange={(v) => setPolicyForm((p) => ({ ...p, fullDayHours: v }))} />
            <NumberField label="Max booking (h)" value={policyForm.maxBookingHours} onChange={(v) => setPolicyForm((p) => ({ ...p, maxBookingHours: v }))} />
            <NumberField label="Overtime apres (h)" value={policyForm.overtimeAfterHours} onChange={(v) => setPolicyForm((p) => ({ ...p, overtimeAfterHours: v }))} />
            <OpsField label="Tarif overtime /h">
              <input type="number" className={opsInputClassName()} value={policyForm.overtimeHourlyRate} onChange={(e) => setPolicyForm((p) => ({ ...p, overtimeHourlyRate: Number(e.target.value || 0) }))} />
            </OpsField>
            <div className="flex items-end">
              <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 text-sm text-zinc-200">
                <input type="checkbox" checked={policyForm.allowOvertime} onChange={(e) => setPolicyForm((p) => ({ ...p, allowOvertime: e.target.checked }))} />
                Autoriser overtime
              </label>
            </div>
          </OpsGrid>
          <Button onClick={() => policyMut.mutate()} disabled={!venueId || policyMut.isPending} className="mt-3 h-11 bg-amber-400 text-black hover:bg-amber-300">
            <CalendarClock className="mr-1 size-4" /> Sauvegarder policies
          </Button>
        </OpsCard>
      ) : null}

      {tab === 'blocks' ? (
        <div className="space-y-4">
          <OpsCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <OpsSectionTitle
                title="Availability Blocks"
                subtitle="Simple: choisir une place, choisir 1h / journee / plusieurs jours, confirmer."
              />
              <Button
                type="button"
                onClick={() => setBlockDialogOpen(true)}
                disabled={!venueId || unitsQ.isLoading}
                className="h-11 bg-amber-400 text-black hover:bg-amber-300"
              >
                <ShieldBan className="mr-1 size-4" /> Bloquer une place
              </Button>
            </div>
          </OpsCard>
          <ActiveBlocksList
            blocks={blocks}
            units={blockableUnits}
            mode="units"
            onDelete={(id) => delBlockMut.mutate(id)}
            deletingId={delBlockMut.variables ?? null}
          />
        </div>
      ) : null}

      {tab === 'media' ? (
        <OpsGrid className="xl:grid-cols-[1fr_1fr]">
          <OpsCard>
            <OpsSectionTitle title="Media Studio" subtitle="Photo profil, galerie, vue 360 et snapshots." />
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-sm font-semibold text-zinc-100">Photo profil ({'coverImage'})</p>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 hover:border-amber-400/40">
                  <Camera className="size-4" /> Upload / Replace
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void onUploadProfile(e.target.files[0])} />
                </label>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-sm font-semibold text-zinc-100">Galerie</p>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 hover:border-amber-400/40">
                  <ImagePlus className="size-4" /> Ajouter image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void onUploadGallery(e.target.files[0])} />
                </label>
                <div className="mt-3 space-y-2">
                  {(activeVenue?.gallery ?? []).length === 0 ? <p className="text-xs text-zinc-500">Aucune image galerie.</p> : null}
                  {(activeVenue?.gallery ?? []).map((url) => (
                    <div key={url} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs">
                      <span className="truncate text-zinc-300">{url}</span>
                      <Button type="button" size="sm" variant="destructive" className="h-7 bg-red-500/15 text-red-300 hover:bg-red-500/25" onClick={() => void onRemoveGallery(url)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-sm font-semibold text-zinc-100">Vue 360 + snapshots</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input className={opsInputClassName()} placeholder="Nom snapshot (optionnel)" value={sceneName} onChange={(e) => setSceneName(e.target.value)} />
                  <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 hover:border-amber-400/40">
                    <ScanLine className="size-4" /> Upload 360
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onUploadImmersive(e.target.files)} />
                  </label>
                </div>
              </div>
            </div>
          </OpsCard>

          <OpsCard>
            <OpsSectionTitle title="Etat 360" subtitle="Primary + snapshots synchronises." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs text-zinc-500">Primary 360</p>
                <p className="text-sm font-semibold text-zinc-100">{activeVenue?.immersiveFile ? 'Configured' : 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs text-zinc-500">Snapshots</p>
                <p className="text-sm font-semibold text-zinc-100">{scenes.length}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {scenes.length === 0 ? <p className="text-xs text-zinc-500">Aucun snapshot.</p> : null}
              {scenes.map((s) => (
                <div key={s._id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="truncate text-sm text-zinc-200">{s.name}</span>
                  <Button type="button" size="sm" variant="destructive" className="h-8 bg-red-500/15 text-red-300 hover:bg-red-500/25" onClick={() => void onDeleteScene(s._id)}>
                    <Trash2 className="mr-1 size-3.5" /> Delete
                  </Button>
                </div>
              ))}
            </div>
          </OpsCard>
        </OpsGrid>
      ) : null}
      <BlockScheduler
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        venueId={venueId}
        units={blockableUnits}
        mode="units"
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['owner-coworking-blocks'] });
          qc.invalidateQueries({ queryKey: ['owner-coworking-kpis'] });
        }}
      />
    </OpsPage>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-400/40 hover:text-amber-300">
      {label}
    </Link>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <OpsField label={label}>
      <input type="number" className={opsInputClassName()} value={value} onChange={(e) => onChange(Number(e.target.value || 0))} />
    </OpsField>
  );
}
