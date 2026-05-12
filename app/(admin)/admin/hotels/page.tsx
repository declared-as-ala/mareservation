'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminHotels, type AdminHotel } from '@/lib/api/admin';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, MapPin, Star, Search, Plus, Eye, Edit2,
  Building2, Users, TrendingUp, Wifi, Globe2,
  ChevronRight, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createAdminVenue } from '@/lib/api/admin';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const TUNISIAN_CITIES = [
  'Tunis', 'Hammamet', 'Sousse', 'Sfax', 'Monastir', 'Djerba', 'Tozeur',
  'Nefta', 'Tabarka', 'Mahdia', 'Nabeul', 'Bizerte', 'Kairouan', 'Gabès',
];

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      published
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-zinc-500/10 text-zinc-400 border border-zinc-700'
    )}>
      {published ? <CheckCircle2 className="size-2.5" /> : <Clock className="size-2.5" />}
      {published ? 'Publié' : 'Brouillon'}
    </span>
  );
}

function HotelCard({ hotel }: { hotel: AdminHotel }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/5 transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative h-44 w-full overflow-hidden bg-zinc-800">
        {hotel.coverImage ? (
          <Image
            src={hotel.coverImage}
            alt={hotel.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="size-12 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <StatusBadge published={hotel.isPublished} />
          {hotel.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-semibold text-[#D4AF37]">
              <Star className="size-2.5" /> Vedette
            </span>
          )}
          {hotel.hasVirtualTour && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
              <Globe2 className="size-2.5" /> 360°
            </span>
          )}
        </div>

        {/* Price tag */}
        {hotel.startingPrice ? (
          <div className="absolute bottom-3 right-3">
            <span className="rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-xs font-bold text-[#D4AF37]">
              À partir de {hotel.startingPrice} DT
            </span>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <div>
          <h3 className="font-semibold text-white leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-1">
            {hotel.name}
          </h3>
          <p className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
            <MapPin className="size-3" />
            {hotel.city}{hotel.governorate ? `, ${hotel.governorate}` : ''}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <BedDouble className="size-3.5 text-zinc-600" />
            {hotel.roomCount ?? 0} chambre{(hotel.roomCount ?? 0) !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5 text-zinc-600" />
            {hotel.bookingCount ?? 0} réservation{(hotel.bookingCount ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Amenities preview */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {hotel.amenities.slice(0, 3).map((a) => (
              <span key={a} className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                {a}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">
                +{hotel.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
          <Link href={`/admin/hotels/${hotel._id}`} className="flex-1">
            <Button size="sm" className="w-full h-8 bg-[#D4AF37] hover:bg-[#c9a227] text-black text-xs font-semibold rounded-lg">
              <Edit2 className="size-3 mr-1.5" /> Gérer
            </Button>
          </Link>
          <Link href={`/hotel/${hotel.slug}`} target="_blank">
            <Button size="sm" variant="outline" className="h-8 px-3 rounded-lg border-zinc-700 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500">
              <Eye className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className={cn('flex size-10 items-center justify-center rounded-lg', color)}>
        <Icon className="size-4.5" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

export default function HotelsAdminPage() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-hotels', q, city],
    queryFn: () => fetchAdminHotels({ q: q || undefined, city: city || undefined }),
  });

  const hotels = data?.hotels ?? [];
  const total = data?.total ?? 0;
  const published = hotels.filter((h) => h.isPublished).length;
  const totalRooms = hotels.reduce((acc, h) => acc + (h.roomCount ?? 0), 0);
  const totalBookings = hotels.reduce((acc, h) => acc + (h.bookingCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#080808] p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <BedDouble className="size-4 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Gestion des Hôtels</h1>
          </div>
          <p className="text-sm text-zinc-500">{total} hôtel{total !== 1 ? 's' : ''} dans le système</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-9 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold text-sm rounded-xl px-4 shadow-lg shadow-[#D4AF37]/20"
        >
          <Plus className="size-4 mr-2" /> Ajouter un hôtel
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Hôtels total" value={total} icon={Building2} color="bg-[#D4AF37]/10 text-[#D4AF37]" />
        <StatCard label="Publiés" value={published} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Chambres total" value={totalRooms} icon={BedDouble} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Réservations" value={totalBookings} icon={TrendingUp} color="bg-purple-500/10 text-purple-400" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Rechercher un hôtel..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20"
          />
        </div>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300 focus:border-[#D4AF37]/50 focus:outline-none"
        >
          <option value="">Toutes les villes</option>
          {TUNISIAN_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 mb-4">
            <Building2 className="size-7 text-zinc-600" />
          </div>
          <p className="text-lg font-semibold text-zinc-300 mb-1">Aucun hôtel trouvé</p>
          <p className="text-sm text-zinc-600 mb-4">Ajoutez votre premier hôtel pour commencer.</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl">
            <Plus className="size-4 mr-2" /> Ajouter un hôtel
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hotels.map((hotel) => (
              <HotelCard key={hotel._id} hotel={hotel} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateHotelModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(id) => router.push(`/admin/hotels/${id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateHotelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !city.trim() || !address.trim()) {
      toast.error('Nom, ville et adresse requis.');
      return;
    }
    setSaving(true);
    try {
      const res = await createAdminVenue({
        name: name.trim(),
        type: 'HOTEL',
        city: city.trim(),
        address: address.trim(),
        description: `Hôtel ${name.trim()} situé à ${city.trim()}.`,
        isPublished: false,
        reservationModes: ['room'] as any,
      } as any);
      toast.success('Hôtel créé avec succès.');
      onCreated((res as any)._id ?? (res as any).data?._id);
    } catch {
      toast.error('Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-1">Nouvel hôtel</h2>
        <p className="text-sm text-zinc-500 mb-5">Vous pourrez compléter tous les détails ensuite.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nom de l&apos;hôtel *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: El Mouradi Palace" className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Ville *</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none">
              <option value="">Sélectionner une ville</option>
              {TUNISIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Adresse *</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Avenue Principale, Zone Touristique" className="bg-zinc-900 border-zinc-700 text-white rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400 rounded-xl" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={saving} onClick={handleCreate} className="flex-1 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl">
            {saving ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
