'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  X, BedDouble, DollarSign,
  Upload, Loader2, Plus, Trash2, Crown, Eye, Wind,
  Wifi, Car, Waves, Sparkles, Coffee, Check,
  ImagePlus, Info, Image as ImageIcon, Compass, SlidersHorizontal,
  RotateCw, Route, Link2, ArrowRight, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { uploadImageFile } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AdminHotelRoom } from '@/lib/api/admin';
import { RoomTourModal } from './RoomTourModal';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

const ROOM_TYPES = [
  { value: 'STANDARD', label: 'Chambre Standard' },
  { value: 'SUPERIOR', label: 'Chambre Supérieure' },
  { value: 'DELUXE', label: 'Chambre Deluxe' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'JUNIOR_SUITE', label: 'Junior Suite' },
  { value: 'PRESIDENTIAL', label: 'Suite Présidentielle' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'APARTMENT', label: 'Appartement' },
  { value: 'BUNGALOW', label: 'Bungalow' },
  { value: 'PENTHOUSE', label: 'Penthouse' },
];

const BED_TYPES = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Bunk'];

const BATHROOM_TYPES = [
  'Salle de bain privée',
  'Salle de bain avec baignoire',
  'Salle de bain avec jacuzzi',
  "Douche à l'italienne",
  'Salle de bain de luxe',
  'Deux salles de bain',
];

const COMMON_AMENITIES = [
  { key: 'WiFi gratuit', icon: Wifi },
  { key: 'Climatisation', icon: Wind },
  { key: 'Minibar', icon: Coffee },
  { key: 'Balcon privé', icon: Eye },
  { key: 'Vue mer', icon: Waves },
  { key: 'Jacuzzi', icon: Sparkles },
  { key: 'Piscine privée', icon: Waves },
  { key: 'Parking', icon: Car },
  { key: 'TV satellite', icon: null },
  { key: 'Coffre-fort', icon: null },
  { key: 'Butler privé', icon: null },
  { key: 'Service en chambre 24h', icon: null },
  { key: 'Petit-déjeuner inclus', icon: null },
  { key: 'Machine Nespresso', icon: Coffee },
];

type TabKey = 'infos' | 'photos' | 'pano' | 'options';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'infos', label: 'Infos', icon: Info },
  { key: 'photos', label: 'Photos', icon: ImageIcon },
  { key: 'pano', label: 'Vue 360°', icon: Compass },
  { key: 'options', label: 'Options', icon: SlidersHorizontal },
];

interface RoomEditorModalProps {
  hotelId: string;
  room?: AdminHotelRoom | null;
  onClose: () => void;
  onSave: (payload: Partial<AdminHotelRoom>, isNew: boolean) => Promise<void>;
  /** @deprecated multi-scene tour builder — 360 is now managed inline in the Vue 360° tab */
  onOpenTour?: (room: AdminHotelRoom) => void;
}

export function RoomEditorModal({ hotelId, room, onClose, onSave }: RoomEditorModalProps) {
  const isNew = !room;
  const [tab, setTab] = useState<TabKey>('infos');
  const [tourOpen, setTourOpen] = useState(false);

  const [form, setForm] = useState<Partial<AdminHotelRoom>>({
    roomNumber: room?.roomNumber ?? undefined,
    name: room?.name ?? '',
    roomType: room?.roomType ?? 'STANDARD',
    capacity: room?.capacity ?? 2,
    capacityAdults: room?.capacityAdults ?? 2,
    capacityChildren: room?.capacityChildren ?? 0,
    bedType: room?.bedType ?? 'King',
    pricePerNight: room?.pricePerNight ?? 0,
    surface: room?.surface ?? undefined,
    description: room?.description ?? '',
    bathroomType: room?.bathroomType ?? '',
    amenities: room?.amenities ?? [],
    isVip: room?.isVip ?? false,
    hasBalcony: room?.hasBalcony ?? false,
    hasVirtualTour: room?.hasVirtualTour ?? false,
    isReservable: room?.isReservable !== false,
    isActive: room?.isActive !== false,
    status: room?.status ?? 'available',
    coverImage: room?.coverImage ?? '',
    gallery: room?.gallery ?? [],
    panoramicImages: room?.panoramicImages ?? [],
  });

  const [panoramicUploading, setPanoramicUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [customAmenity, setCustomAmenity] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPano, setPreviewPano] = useState<string | null>(null);

  const panoCount = (form.panoramicImages ?? []).length;
  const photoCount = (form.gallery ?? []).length;

  function toggleAmenity(key: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities?.includes(key)
        ? f.amenities.filter((a) => a !== key)
        : [...(f.amenities ?? []), key],
    }));
  }

  function addCustomAmenity() {
    if (!customAmenity.trim()) return;
    setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), customAmenity.trim()] }));
    setCustomAmenity('');
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const url = await uploadImageFile(file);
      setForm((f) => ({ ...f, coverImage: url }));
      toast.success('Image uploadée.');
    } catch {
      toast.error("Erreur lors de l'upload.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadPanoramic(files: FileList | File[]) {
    setPanoramicUploading(true);
    try {
      const arr = Array.from(files);
      const urls = await Promise.all(arr.map((f) => uploadImageFile(f)));
      setForm((f) => ({
        ...f,
        panoramicImages: [...(f.panoramicImages ?? []), ...urls],
        hasVirtualTour: true,
      }));
      toast.success(`${urls.length} vue 360° ajoutée${urls.length > 1 ? 's' : ''}.`);
    } catch {
      toast.error("Erreur lors de l'upload 360°.");
    } finally {
      setPanoramicUploading(false);
    }
  }

  function removePanoramic(url: string) {
    setForm((f) => {
      const next = (f.panoramicImages ?? []).filter((u) => u !== url);
      return { ...f, panoramicImages: next, hasVirtualTour: next.length > 0 };
    });
  }

  function movePanoramic(url: string, dir: -1 | 1) {
    setForm((f) => {
      const list = [...(f.panoramicImages ?? [])];
      const i = list.indexOf(url);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, panoramicImages: list };
    });
  }

  async function uploadGalleryFiles(files: FileList | File[]) {
    setGalleryUploading(true);
    try {
      const arr = Array.from(files);
      const urls = await Promise.all(arr.map((f) => uploadImageFile(f)));
      setForm((f) => ({ ...f, gallery: [...(f.gallery ?? []), ...urls] }));
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''}.`);
    } catch {
      toast.error("Erreur lors de l'upload de la galerie.");
    } finally {
      setGalleryUploading(false);
    }
  }

  function removeGalleryImage(url: string) {
    setForm((f) => ({ ...f, gallery: (f.gallery ?? []).filter((u) => u !== url) }));
  }

  function moveGalleryImage(url: string, dir: -1 | 1) {
    setForm((f) => {
      const list = [...(f.gallery ?? [])];
      const i = list.indexOf(url);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, gallery: list };
    });
  }

  async function handleSave() {
    if (!form.roomNumber || !form.roomType || !form.capacity || !form.pricePerNight) {
      toast.error('Numéro, type, capacité et prix requis. (onglet Infos)');
      setTab('infos');
      return;
    }
    setSaving(true);
    try {
      await onSave(form, isNew);
      onClose();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-2xl max-h-[94vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-amber-500/[0.06] to-transparent px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">
              {isNew ? 'Nouvelle chambre' : `${room?.name || `Chambre ${room?.roomNumber}`}`}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isNew ? 'Renseignez les informations puis ajoutez photos et vues 360°.' : 'Modifiez les détails, photos et expériences 360°.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 gap-1 border-b border-zinc-800 px-3 sm:px-4">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            const badge = key === 'photos' ? photoCount : key === 'pano' ? panoCount : 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-semibold transition-colors',
                  active ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <Icon className="size-4" />
                {label}
                {badge > 0 && (
                  <span className={cn(
                    'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                    active ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {badge}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="room-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* ── INFOS ── */}
          {tab === 'infos' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">N° chambre *</Label>
                  <Input
                    type="number"
                    value={form.roomNumber ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, roomNumber: parseInt(e.target.value) || undefined }))}
                    placeholder="101"
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Nom personnalisé</Label>
                  <Input
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Suite Royale"
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Type de chambre *</Label>
                  <select
                    value={form.roomType ?? 'STANDARD'}
                    onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:border-[#D4AF37]/50 focus:outline-none"
                  >
                    {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Type de lit</Label>
                  <select
                    value={form.bedType ?? 'King'}
                    onChange={(e) => setForm((f) => ({ ...f, bedType: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
                  >
                    {BED_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Adultes *</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={form.capacityAdults ?? 2}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      setForm((f) => ({ ...f, capacityAdults: v, capacity: v + (f.capacityChildren ?? 0) }));
                    }}
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Enfants</Label>
                  <Input
                    type="number" min={0} max={6}
                    value={form.capacityChildren ?? 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setForm((f) => ({ ...f, capacityChildren: v, capacity: (f.capacityAdults ?? 2) + v }));
                    }}
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Surface (m²)</Label>
                  <Input
                    type="number" min={1}
                    value={form.surface ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, surface: parseInt(e.target.value) || undefined }))}
                    placeholder="35"
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Prix / nuit (DT) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
                    <Input
                      type="number" min={0}
                      value={form.pricePerNight ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, pricePerNight: parseFloat(e.target.value) || 0 }))}
                      placeholder="150"
                      className="rounded-xl border-zinc-700 bg-zinc-900 pl-8 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-zinc-400">Salle de bain</Label>
                  <select
                    value={form.bathroomType ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bathroomType: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {BATHROOM_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs text-zinc-400">Description</Label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Décrivez la chambre, sa vue, ses particularités..."
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ── PHOTOS ── */}
          {tab === 'photos' && (
            <div className="space-y-6">
              {/* Cover */}
              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-300">Photo principale</Label>
                <div
                  className="group relative h-44 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 transition-colors hover:border-[#D4AF37]/40"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) uploadCover(file);
                    };
                    input.click();
                  }}
                >
                  {form.coverImage ? (
                    <>
                      <Image src={form.coverImage} alt="cover" fill className="object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
                          <Upload className="size-3.5" /> Changer
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
                      {uploadingCover ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                      <span className="text-sm">{uploadingCover ? 'Upload en cours...' : 'Cliquer pour uploader'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Galerie photo ({photoCount})
                  </Label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
                    <input
                      type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { const files = e.target.files; if (files?.length) uploadGalleryFiles(files); e.currentTarget.value = ''; }}
                    />
                    {galleryUploading ? <><Loader2 className="size-3.5 animate-spin" /> Upload…</> : <><Plus className="size-3.5" /> Ajouter</>}
                  </label>
                </div>
                {photoCount === 0 ? (
                  <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 text-zinc-500 transition-colors hover:border-amber-400/40">
                    <input
                      type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { const files = e.target.files; if (files?.length) uploadGalleryFiles(files); e.currentTarget.value = ''; }}
                    />
                    <ImagePlus className="size-5" />
                    <span className="text-xs">Cliquer pour ajouter plusieurs photos</span>
                  </label>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(form.gallery ?? []).map((url, idx) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-700">
                        <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="120px" />
                        <div className="absolute inset-0 flex flex-col bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex justify-end p-1">
                            <button type="button" onClick={() => removeGalleryImage(url)} className="flex size-6 items-center justify-center rounded-full bg-red-500/90 hover:bg-red-500" aria-label="Supprimer">
                              <Trash2 className="size-3 text-white" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between p-1">
                            <button type="button" onClick={() => moveGalleryImage(url, -1)} disabled={idx === 0} className="flex size-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black disabled:opacity-30">‹</button>
                            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{idx + 1}</span>
                            <button type="button" onClick={() => moveGalleryImage(url, 1)} disabled={idx === photoCount - 1} className="flex size-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black disabled:opacity-30">›</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-zinc-500">
                  La première photo apparaît en grand sur la carte chambre côté client.
                </p>
              </div>
            </div>
          )}

          {/* ── VUE 360° ── */}
          {tab === 'pano' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
                  <Compass className="size-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-200">Vues immersives 360°</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                    Uploadez des images <strong className="text-zinc-300">équirectangulaires (ratio 2:1)</strong>.
                    Le client pourra tourner la vue à 360° directement sur la page de la chambre.
                  </p>
                </div>
              </div>

              {/* ── Multi-scene tour (scenes linked by hotspots) ── */}
              <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.08] to-transparent p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
                    <Route className="size-4 text-purple-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-purple-200">
                      Visite multi-scènes
                      <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-1.5 text-[9px] font-bold uppercase tracking-wide text-purple-300">
                        Avec liens
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                      Créez plusieurs scènes (chambre, salle de bain, balcon…) et <strong className="text-zinc-300">reliez-les entre elles</strong> avec
                      des hotspots cliquables. Le client navigue d&apos;une vue à l&apos;autre comme dans un vrai tour virtuel.
                    </p>

                    {isNew ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400">
                        <Lock className="size-3.5 text-zinc-500" />
                        Enregistrez d&apos;abord la chambre pour construire la visite multi-scènes.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTourOpen(true)}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:-translate-y-0.5 hover:shadow-purple-500/40"
                      >
                        <Link2 className="size-4" />
                        Construire / éditer la visite 360°
                        <ArrowRight className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">ou vue 360° simple</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Big upload zone */}
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400/30 bg-amber-400/[0.04] text-amber-300/80 transition-colors hover:border-amber-400/60 hover:bg-amber-400/[0.08]">
                <input
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { const files = e.target.files; if (files?.length) uploadPanoramic(files); e.currentTarget.value = ''; }}
                />
                {panoramicUploading ? (
                  <><Loader2 className="size-6 animate-spin" /><span className="text-sm font-semibold">Upload 360° en cours…</span></>
                ) : (
                  <>
                    <RotateCw className="size-6" />
                    <span className="text-sm font-semibold">Ajouter une ou plusieurs vues 360°</span>
                    <span className="text-[11px] text-amber-300/50">JPG / PNG · équirectangulaire 2:1</span>
                  </>
                )}
              </label>

              {/* Existing panoramas with live preview */}
              {panoCount > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {panoCount} vue{panoCount > 1 ? 's' : ''} 360° · ordre d&apos;affichage
                  </p>
                  {(form.panoramicImages ?? []).map((url, idx) => (
                    <div key={url} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                      {/* Live rotatable preview */}
                      <div className="relative h-48 w-full bg-black">
                        {previewPano === url ? (
                          <PanoramaEngine
                            imageUrl={url}
                            markers={[]}
                            mode="navigate"
                            scenes={[]}
                            activeSceneId={null}
                            onSceneChange={() => undefined}
                            onMarkerClick={() => undefined}
                          />
                        ) : (
                          <>
                            <Image src={url} alt={`360° ${idx + 1}`} fill className="object-cover" sizes="480px" />
                            <button
                              type="button"
                              onClick={() => setPreviewPano(url)}
                              className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/50"
                            >
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-[12px] font-black text-black shadow-lg">
                                <RotateCw className="size-3.5" /> Tester la rotation 360°
                              </span>
                            </button>
                          </>
                        )}
                        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                          Scène {idx + 1}
                        </div>
                        {previewPano === url && (
                          <button
                            type="button"
                            onClick={() => setPreviewPano(null)}
                            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white hover:bg-black"
                            aria-label="Arrêter l'aperçu"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Row actions */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => movePanoramic(url, -1)} disabled={idx === 0} className="flex size-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30">↑</button>
                          <button type="button" onClick={() => movePanoramic(url, 1)} disabled={idx === panoCount - 1} className="flex size-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30">↓</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePanoramic(url)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                        >
                          <Trash2 className="size-3.5" /> Retirer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {panoCount === 0 && !panoramicUploading && (
                <p className="text-center text-xs text-zinc-600">
                  Aucune vue 360° pour cette chambre. Les clients ne verront que les photos.
                </p>
              )}
            </div>
          )}

          {/* ── OPTIONS ── */}
          {tab === 'options' && (
            <div className="space-y-6">
              {/* Amenities */}
              <div>
                <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-300">Équipements</Label>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMMON_AMENITIES.map(({ key }) => {
                    const active = form.amenities?.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleAmenity(key)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all',
                          active
                            ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                        )}
                      >
                        <div className={cn('flex size-4 items-center justify-center rounded-sm border', active ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-600')}>
                          {active && <Check className="size-2.5 text-black" />}
                        </div>
                        {key}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomAmenity()}
                    placeholder="Ajouter un équipement personnalisé..."
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-sm text-white"
                  />
                  <Button type="button" onClick={addCustomAmenity} size="sm" variant="outline" className="rounded-xl border-zinc-700">
                    <Plus className="size-4" />
                  </Button>
                </div>
                {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.find((c) => c.key === a)).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.find((c) => c.key === a)).map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
                        {a}
                        <button onClick={() => toggleAmenity(a)} className="text-zinc-500 hover:text-red-400"><X className="size-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                {[
                  { key: 'isVip', label: 'Chambre VIP / Premium', desc: 'Badge VIP affiché sur la carte', icon: Crown },
                  { key: 'hasBalcony', label: 'Balcon ou terrasse', desc: 'Vue extérieure privée', icon: Eye },
                  { key: 'isReservable', label: 'Réservable en ligne', desc: 'Les clients peuvent réserver cette chambre', icon: Check },
                  { key: 'isActive', label: 'Chambre active', desc: 'Visible dans le catalogue', icon: BedDouble },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="size-4 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{label}</p>
                        <p className="text-xs text-zinc-500">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={!!form[key as keyof typeof form]}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><ImageIcon className="size-3.5" /> {photoCount}</span>
            <span className="inline-flex items-center gap-1 text-amber-400/80"><Compass className="size-3.5" /> {panoCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl border-zinc-700 text-zinc-400">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#D4AF37] px-6 font-semibold text-black shadow-lg shadow-[#D4AF37]/20 hover:bg-[#c9a227]"
            >
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Sauvegarde...</> : isNew ? 'Créer la chambre' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>

    {/* Full-screen multi-scene tour builder (scenes + linking hotspots) */}
    {tourOpen && room && (
      <RoomTourModal venueId={hotelId} room={room} onClose={() => setTourOpen(false)} />
    )}
    </>
  );
}
