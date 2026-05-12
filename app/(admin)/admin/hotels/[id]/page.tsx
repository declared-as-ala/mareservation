'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Loader2, BedDouble, Users, Calendar,
  MapPin, Phone, Star, Globe2, Plus, Trash2, Edit2,
  Crown, Eye, DollarSign, TrendingUp, CheckCircle2,
  Clock, XCircle, Upload, Building2, Wifi, Car,
  Waves, Bath, Square, Settings2, ImagePlus, Check,
  ChevronRight, AlertCircle, RefreshCw, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadImageFile } from '@/lib/api/client';
import {
  fetchAdminHotelById,
  updateAdminVenue,
  fetchAdminHotelRooms,
  createAdminHotelRoom,
  updateAdminHotelRoom,
  deleteAdminHotelRoom,
  fetchAdminHotelBookings,
  fetchAdminHotelScenes,
  type AdminHotel,
  type AdminHotelRoom,
  type AdminHotelBooking,
} from '@/lib/api/admin';
import { RoomEditorModal } from '@/components/admin/hotel/RoomEditorModal';
import { VirtualTourBuilder } from '@/components/admin/hotel/VirtualTourBuilder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ROOM_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard', SUPERIOR: 'Supérieure', DELUXE: 'Deluxe',
  SUITE: 'Suite', JUNIOR_SUITE: 'Junior Suite', PRESIDENTIAL: 'Présidentielle',
  VILLA: 'Villa', APARTMENT: 'Appartement', BUNGALOW: 'Bungalow', PENTHOUSE: 'Penthouse',
};

const HOTEL_AMENITIES = [
  'piscine', 'spa', 'wifi', 'parking', 'restaurant', 'bar', 'fitness', 'concierge 24h',
  'hammam', 'tennis', 'plage privée', 'animation', 'baby-sitting', 'navette aéroport',
  'room service', 'salle de conférence', 'thalassothérapie', 'golf',
];

// ── Status badge ───────────────────────────────────────────────────────────────

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    CONFIRMED: { label: 'Confirmé', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PENDING: { label: 'En attente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    CANCELLED: { label: 'Annulé', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const s = map[status] ?? { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-700' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', s.className)}>
      {s.label}
    </span>
  );
}

// ── Room card (in grid) ────────────────────────────────────────────────────────

function RoomGridCard({ room, onEdit, onDelete }: { room: AdminHotelRoom; onEdit: () => void; onDelete: () => void }) {
  const typeLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-all duration-200"
    >
      {/* Cover */}
      <div className="relative h-36 bg-zinc-800 overflow-hidden">
        {room.coverImage ? (
          <Image src={room.coverImage} alt={room.name ?? typeLabel} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BedDouble className="size-10 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
            room.isVip
              ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
              : 'bg-zinc-900/80 border-zinc-700 text-zinc-300'
          )}>
            {room.isVip && <Crown className="inline size-2.5 mr-1" />}{typeLabel}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
            room.status === 'available'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : room.status === 'reserved'
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-zinc-500/20 border-zinc-700 text-zinc-400'
          )}>
            {room.status === 'available' ? 'Disponible' : room.status === 'reserved' ? 'Réservée' : 'Bloquée'}
          </span>
        </div>

        {/* Price */}
        <div className="absolute bottom-2 right-2">
          <span className="rounded-lg bg-black/80 border border-white/10 px-2 py-0.5 text-xs font-bold text-[#D4AF37]">
            {room.pricePerNight} DT/nuit
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <p className="text-sm font-semibold text-white leading-snug">
            {room.name || `Chambre ${room.roomNumber}`}
          </p>
          <p className="text-xs text-zinc-500">N° {room.roomNumber}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {room.capacityAdults && (
            <span className="flex items-center gap-1"><Users className="size-3" />{room.capacityAdults} adultes</span>
          )}
          {room.surface && (
            <span className="flex items-center gap-1"><Square className="size-3" />{room.surface} m²</span>
          )}
          {room.bedType && (
            <span className="flex items-center gap-1"><BedDouble className="size-3" />{room.bedType}</span>
          )}
        </div>

        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="rounded-full bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400">{a}</span>
            ))}
            {room.amenities.length > 3 && (
              <span className="rounded-full bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-500">+{room.amenities.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-800">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700 text-zinc-400 hover:text-white rounded-lg" onClick={onEdit}>
            <Edit2 className="size-3 mr-1" /> Modifier
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 border-zinc-700 text-red-500/60 hover:text-red-400 hover:border-red-500/30 rounded-lg" onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Hotel info form ───────────────────────────────────────────────────────────

function HotelInfoTab({ hotel, onSaved }: { hotel: AdminHotel; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: hotel.name ?? '',
    shortDescription: hotel.shortDescription ?? '',
    description: hotel.description ?? '',
    city: hotel.city ?? '',
    governorate: hotel.governorate ?? '',
    address: hotel.address ?? '',
    phone: hotel.phone ?? '',
    startingPrice: hotel.startingPrice ?? 0,
    priceRangeMin: hotel.priceRangeMin ?? 0,
    priceRangeMax: hotel.priceRangeMax ?? 0,
    checkInPolicy: hotel.checkInPolicy ?? '',
    checkOutPolicy: hotel.checkOutPolicy ?? '',
    amenities: hotel.amenities ?? [],
    isPublished: hotel.isPublished ?? false,
    isFeatured: hotel.isFeatured ?? false,
    coverImage: hotel.coverImage ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  function toggleAmenity(key: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter((a) => a !== key) : [...f.amenities, key],
    }));
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
    if (!form.name.trim()) { toast.error('Nom requis.'); return; }
    setSaving(true);
    try {
      await updateAdminVenue(hotel._id, form as any);
      toast.success('Hôtel mis à jour.');
      onSaved();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Photo principale</p>
        <div
          className="relative h-52 w-full rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-[#D4AF37]/40 cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm text-white">
                  <Upload className="size-4" /> Changer la photo
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              {uploadingCover ? <Loader2 className="size-8 text-zinc-500 animate-spin" /> : <ImagePlus className="size-8 text-zinc-600" />}
              <p className="text-sm text-zinc-500">{uploadingCover ? 'Upload...' : 'Cliquer pour uploader une photo'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Basic info */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Informations générales</p>
        <div>
          <Label className="text-zinc-400 text-xs mb-1.5 block">Nom de l&apos;hôtel *</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs mb-1.5 block">Courte description</Label>
          <Input value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} placeholder="Ex: Palace 5 étoiles face à la mer..." className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs mb-1.5 block">Description complète</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Ville</Label>
            <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Gouvernorat</Label>
            <Input value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
        </div>
        <div>
          <Label className="text-zinc-400 text-xs mb-1.5 block">Adresse</Label>
          <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs mb-1.5 block">Téléphone</Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+216 XX XXX XXX" className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tarification</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'startingPrice', label: 'Prix à partir de (DT)' },
            { key: 'priceRangeMin', label: 'Prix min (DT)' },
            { key: 'priceRangeMax', label: 'Prix max (DT)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label className="text-zinc-400 text-xs mb-1.5 block">{label}</Label>
              <Input
                type="number" min={0}
                value={form[key as keyof typeof form] as number}
                onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Check-in / Check-out policies */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Politiques</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Check-in</Label>
            <Input value={form.checkInPolicy} onChange={(e) => setForm((f) => ({ ...f, checkInPolicy: e.target.value }))} placeholder="À partir de 14h00" className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Check-out</Label>
            <Input value={form.checkOutPolicy} onChange={(e) => setForm((f) => ({ ...f, checkOutPolicy: e.target.value }))} placeholder="Avant 12h00" className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Services & Équipements</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HOTEL_AMENITIES.map((amenity) => {
            const active = form.amenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left capitalize transition-all',
                  active ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                )}
              >
                <div className={cn('flex size-4 items-center justify-center rounded-sm border shrink-0', active ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-600')}>
                  {active && <Check className="size-2.5 text-black" />}
                </div>
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visibility */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
        {[
          { key: 'isPublished', label: 'Publié', desc: 'Visible par les clients sur le site' },
          { key: 'isFeatured', label: 'En vedette', desc: 'Mis en avant sur la page d\'accueil' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-zinc-200">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <Switch checked={!!form[key as keyof typeof form]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl shadow-lg shadow-[#D4AF37]/20">
        {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Sauvegarde...</> : <><Save className="size-4 mr-2" /> Enregistrer les modifications</>}
      </Button>
    </div>
  );
}

// ── Rooms tab ──────────────────────────────────────────────────────────────────

function RoomsTab({ hotelId, rooms, onRefresh }: { hotelId: string; rooms: AdminHotelRoom[]; onRefresh: () => void }) {
  const [editingRoom, setEditingRoom] = useState<AdminHotelRoom | null | 'new'>('void' as any);
  const [modalOpen, setModalOpen] = useState(false);

  const byType = ROOM_TYPE_LABELS;
  const sortedRooms = [...rooms].sort((a, b) => a.pricePerNight - b.pricePerNight);

  async function handleSave(payload: Partial<AdminHotelRoom>, isNew: boolean) {
    if (isNew) {
      await createAdminHotelRoom(hotelId, payload);
      toast.success('Chambre créée.');
    } else if (editingRoom && editingRoom !== 'new' && typeof editingRoom !== 'string') {
      await updateAdminHotelRoom(editingRoom._id, payload);
      toast.success('Chambre mise à jour.');
    }
    onRefresh();
  }

  async function handleDelete(room: AdminHotelRoom) {
    if (!confirm(`Supprimer la chambre "${room.name || `Chambre ${room.roomNumber}`}" ?`)) return;
    try {
      await deleteAdminHotelRoom(room._id);
      toast.success('Chambre supprimée.');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }

  const available = rooms.filter((r) => r.status === 'available').length;
  const reserved = rooms.filter((r) => r.status === 'reserved').length;
  const vip = rooms.filter((r) => r.isVip).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: rooms.length, color: 'text-zinc-300', bg: 'bg-zinc-800' },
          { label: 'Disponibles', value: available, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Réservées', value: reserved, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'VIP', value: vip, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('rounded-xl border border-zinc-800 p-3', bg)}>
            <p className={cn('text-xl font-bold', color)}>{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-300">{rooms.length} chambre{rooms.length !== 1 ? 's' : ''}</p>
        <Button
          onClick={() => { setEditingRoom(null); setModalOpen(true); }}
          size="sm"
          className="h-8 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl text-xs"
        >
          <Plus className="size-3.5 mr-1.5" /> Ajouter une chambre
        </Button>
      </div>

      {/* Grid */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-zinc-800">
          <BedDouble className="size-10 text-zinc-600 mb-3" />
          <p className="text-base font-semibold text-zinc-400 mb-1">Aucune chambre</p>
          <p className="text-sm text-zinc-600 mb-4">Ajoutez les chambres et suites de votre hôtel.</p>
          <Button onClick={() => { setEditingRoom(null); setModalOpen(true); }} size="sm" className="bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl">
            <Plus className="size-4 mr-2" /> Ajouter la première chambre
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedRooms.map((room) => (
              <RoomGridCard
                key={room._id}
                room={room}
                onEdit={() => { setEditingRoom(room); setModalOpen(true); }}
                onDelete={() => handleDelete(room)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Room editor modal */}
      <AnimatePresence>
        {modalOpen && (
          <RoomEditorModal
            hotelId={hotelId}
            room={editingRoom === null ? null : (editingRoom as AdminHotelRoom)}
            onClose={() => { setModalOpen(false); setEditingRoom(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bookings tab ───────────────────────────────────────────────────────────────

function BookingsTab({ hotelId }: { hotelId: string }) {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['hotel-bookings', hotelId, statusFilter],
    queryFn: () => fetchAdminHotelBookings(hotelId, { status: statusFilter || undefined }),
  });

  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function nights(start: string, end: string) {
    return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
  }

  const getRoomInfo = (r: AdminHotelBooking) => {
    if (!r.roomId) return '—';
    if (typeof r.roomId === 'string') return r.roomId;
    return r.roomId.name || `Chambre ${r.roomId.roomNumber}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-300">{total} réservation{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {['', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === s
                  ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {s === '' ? 'Tout' : s === 'CONFIRMED' ? 'Confirmés' : s === 'PENDING' ? 'En attente' : 'Annulés'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-zinc-900 animate-pulse" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-zinc-800">
          <Calendar className="size-10 text-zinc-600 mb-3" />
          <p className="text-base font-semibold text-zinc-400">Aucune réservation</p>
          <p className="text-sm text-zinc-600 mt-1">Les réservations apparaîtront ici.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  {['Client', 'Chambre', 'Arrivée', 'Départ', 'Nuits', 'Total', 'Statut'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <AnimatePresence initial={false}>
                  {bookings.map((b) => (
                    <motion.tr
                      key={b._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-zinc-200">{b.guestFirstName} {b.guestLastName}</p>
                          <p className="text-xs text-zinc-500">{b.guestPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{getRoomInfo(b)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{fmtDate(b.startAt)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{fmtDate(b.endAt)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-center text-xs">{nights(b.startAt, b.endAt)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-[#D4AF37]">{b.totalPrice?.toLocaleString('fr-TN')} DT</span>
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HotelDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: hotel, isLoading: loadingHotel } = useQuery({
    queryKey: ['admin-hotel', id],
    queryFn: () => fetchAdminHotelById(id),
    enabled: !!id,
  });

  const { data: rooms = [], isLoading: loadingRooms, refetch: refetchRooms } = useQuery({
    queryKey: ['admin-hotel-rooms', id],
    queryFn: () => fetchAdminHotelRooms(id),
    enabled: !!id,
  });

  const { data: tourData, refetch: refetchTour } = useQuery({
    queryKey: ['admin-hotel-scenes', id],
    queryFn: () => fetchAdminHotelScenes(id),
    enabled: !!id,
  });

  if (loadingHotel) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-zinc-600" />
        <p className="text-zinc-400">Hôtel introuvable.</p>
        <Button onClick={() => router.push('/admin/hotels')} variant="outline" className="border-zinc-700 text-zinc-400 rounded-xl">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const confirmedBookings = 0;
  const availableRooms = (rooms as AdminHotelRoom[]).filter((r) => r.status === 'available').length;

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-[#080808]/95 backdrop-blur-md">
        <div className="flex items-center gap-4 px-6 py-3">
          <Link href="/admin/hotels">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-zinc-400 hover:text-white rounded-xl">
              <ArrowLeft className="size-4" /> Hôtels
            </Button>
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {hotel.coverImage ? (
              <div className="relative size-7 rounded-lg overflow-hidden shrink-0">
                <Image src={hotel.coverImage} alt={hotel.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
                <Building2 className="size-3.5 text-zinc-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{hotel.name}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <MapPin className="size-2.5" />{hotel.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold',
              hotel.isPublished
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            )}>
              {hotel.isPublished ? <><CheckCircle2 className="size-2.5" /> Publié</> : <><Clock className="size-2.5" /> Brouillon</>}
            </span>
            <Link href={`/hotel/${hotel.slug}`} target="_blank">
              <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs gap-1.5">
                <Eye className="size-3.5" /> Voir
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center divide-x divide-zinc-800 overflow-x-auto px-6">
          {[
            { label: 'Chambres', value: (rooms as AdminHotelRoom[]).length, icon: BedDouble, color: 'text-zinc-300' },
            { label: 'Disponibles', value: availableRooms, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Prix départ', value: hotel.startingPrice ? `${hotel.startingPrice} DT` : '—', icon: DollarSign, color: 'text-[#D4AF37]' },
            { label: 'Visite 360°', value: hotel.hasVirtualTour ? 'Active' : 'Non', icon: Globe2, color: hotel.hasVirtualTour ? 'text-purple-400' : 'text-zinc-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-2.5 px-5 py-3 shrink-0">
              <Icon className={cn('size-4', color)} />
              <div>
                <p className={cn('text-sm font-bold', color)}>{value}</p>
                <p className="text-[10px] text-zinc-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Tabs defaultValue="info">
          <TabsList className="mb-6 h-10 rounded-xl bg-zinc-900 border border-zinc-800 p-1 gap-0.5">
            {[
              { value: 'info', label: 'Informations', icon: Settings2 },
              { value: 'rooms', label: `Chambres (${(rooms as AdminHotelRoom[]).length})`, icon: BedDouble },
              { value: 'bookings', label: 'Réservations', icon: Calendar },
              { value: 'tour', label: 'Visite 360°', icon: Globe2 },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"
              >
                <Icon className="size-3.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="info">
            <HotelInfoTab hotel={hotel} onSaved={() => qc.invalidateQueries({ queryKey: ['admin-hotel', id] })} />
          </TabsContent>

          <TabsContent value="rooms">
            {loadingRooms ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />)}
              </div>
            ) : (
              <RoomsTab hotelId={id} rooms={rooms as AdminHotelRoom[]} onRefresh={() => refetchRooms()} />
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsTab hotelId={id} />
          </TabsContent>

          <TabsContent value="tour">
            <div className="space-y-4">
              {/* Tour header info */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Globe2 className="size-5 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-300">Visite Virtuelle 360°</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Uploadez des images équirectangulaires (format 2:1) pour créer une visite immersive.
                      Liez les scènes entre elles avec des hotspots pour permettre la navigation.
                    </p>
                  </div>
                </div>
              </div>

              <VirtualTourBuilder
                hotelId={id}
                initialScenes={tourData?.scenes ?? []}
                initialHotspots={tourData?.hotspots ?? []}
                onUpdated={() => {
                  refetchTour();
                  qc.invalidateQueries({ queryKey: ['admin-hotel', id] });
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
