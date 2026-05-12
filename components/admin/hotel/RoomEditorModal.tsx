'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X, BedDouble, Users, Square, Bath, DollarSign,
  Upload, Loader2, Plus, Trash2, Crown, Eye, Wind,
  Wifi, Car, Waves, Sparkles, Coffee, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { uploadImageFile } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AdminHotelRoom } from '@/lib/api/admin';

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
  'Douche à l\'italienne',
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

interface RoomEditorModalProps {
  hotelId: string;
  room?: AdminHotelRoom | null;
  onClose: () => void;
  onSave: (payload: Partial<AdminHotelRoom>, isNew: boolean) => Promise<void>;
}

export function RoomEditorModal({ hotelId, room, onClose, onSave }: RoomEditorModalProps) {
  const isNew = !room;

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
  });

  const [customAmenity, setCustomAmenity] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function handleSave() {
    if (!form.roomNumber || !form.roomType || !form.capacity || !form.pricePerNight) {
      toast.error('Numéro, type, capacité et prix requis.');
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {isNew ? 'Nouvelle chambre' : `Modifier — ${room?.name || `Chambre ${room?.roomNumber}`}`}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isNew ? 'Remplissez les informations de la chambre.' : 'Modifiez les informations ci-dessous.'}
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cover image */}
          <div>
            <Label className="text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3 block">Photo principale</Label>
            <div className="relative h-40 w-full rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-[#D4AF37]/40 transition-colors group cursor-pointer"
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="size-6 text-white" />
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

          {/* Basic info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">N° chambre *</Label>
              <Input
                type="number"
                value={form.roomNumber ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: parseInt(e.target.value) || undefined }))}
                placeholder="101"
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Nom personnalisé</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Suite Royale"
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Type & Bed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Type de chambre *</Label>
              <select
                value={form.roomType ?? 'STANDARD'}
                onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none focus:border-[#D4AF37]/50"
              >
                {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Type de lit</Label>
              <select
                value={form.bedType ?? 'King'}
                onChange={(e) => setForm((f) => ({ ...f, bedType: e.target.value }))}
                className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
              >
                {BED_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Capacity & Surface */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Adultes *</Label>
              <Input
                type="number" min={1} max={10}
                value={form.capacityAdults ?? 2}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  setForm((f) => ({ ...f, capacityAdults: v, capacity: v + (f.capacityChildren ?? 0) }));
                }}
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Enfants</Label>
              <Input
                type="number" min={0} max={6}
                value={form.capacityChildren ?? 0}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setForm((f) => ({ ...f, capacityChildren: v, capacity: (f.capacityAdults ?? 2) + v }));
                }}
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Surface (m²)</Label>
              <Input
                type="number" min={1}
                value={form.surface ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, surface: parseInt(e.target.value) || undefined }))}
                placeholder="35"
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Prix / nuit (DT) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <Input
                  type="number" min={0}
                  value={form.pricePerNight ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerNight: parseFloat(e.target.value) || 0 }))}
                  placeholder="150"
                  className="pl-8 bg-zinc-900 border-zinc-700 text-white rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Salle de bain</Label>
              <select
                value={form.bathroomType ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bathroomType: e.target.value }))}
                className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
              >
                <option value="">Sélectionner...</option>
                {BATHROOM_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Description</Label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Décrivez la chambre, sa vue, ses particularités..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
            />
          </div>

          {/* Amenities */}
          <div>
            <Label className="text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3 block">Équipements</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {COMMON_AMENITIES.map(({ key }) => {
                const active = form.amenities?.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAmenity(key)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-all',
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
            {/* Custom amenity */}
            <div className="flex gap-2">
              <Input
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomAmenity()}
                placeholder="Ajouter un équipement personnalisé..."
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl text-sm"
              />
              <Button type="button" onClick={addCustomAmenity} size="sm" variant="outline" className="border-zinc-700 rounded-xl">
                <Plus className="size-4" />
              </Button>
            </div>
            {/* Extra amenities */}
            {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.find((c) => c.key === a)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.find((c) => c.key === a)).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
                    {a}
                    <button onClick={() => toggleAmenity(a)} className="text-zinc-500 hover:text-red-400">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
            {[
              { key: 'isVip', label: 'Chambre VIP / Premium', desc: 'Badge VIP affiché sur la carte', icon: Crown },
              { key: 'hasBalcony', label: 'Balcon ou terrasse', desc: 'Vue extérieure privée', icon: Eye },
              { key: 'isReservable', label: 'Réservable en ligne', desc: 'Les clients peuvent réserver cette chambre', icon: Check },
              { key: 'isActive', label: 'Chambre active', desc: 'Visible dans le catalogue', icon: Check },
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

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-6 py-4">
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-400 rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl px-6 shadow-lg shadow-[#D4AF37]/20"
          >
            {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Sauvegarde...</> : isNew ? 'Créer la chambre' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
