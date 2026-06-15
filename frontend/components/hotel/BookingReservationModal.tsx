'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Minus,
  Plus,
  Shield,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRoomNights, ROOM_TYPE_LABELS, toDateInputValue, parseDateInput } from '@/lib/api/rooms';
import type { RoomTypeGroup } from '@/components/hotel/RoomTypeCard';

interface BookingReservationModalProps {
  open: boolean;
  onClose: () => void;
  startingPrice?: number;
  groups: RoomTypeGroup[];
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  selectedRoomType: string;
  onCheckInChange: (date: Date | null) => void;
  onCheckOutChange: (date: Date | null) => void;
  onGuestsChange: (guests: number) => void;
  onRoomTypeChange: (roomType: string) => void;
  onBook: () => void;
}

export function BookingReservationModal({
  open,
  onClose,
  startingPrice,
  groups,
  checkIn,
  checkOut,
  guests,
  selectedRoomType,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onRoomTypeChange,
  onBook,
}: BookingReservationModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nights = checkIn && checkOut ? getRoomNights(checkIn, checkOut) : 0;

  function handleBook() {
    if (!checkIn || !checkOut) {
      toast.error("Veuillez sélectionner vos dates d'arrivée et de départ.");
      return;
    }
    if (!selectedRoomType) {
      toast.error('Veuillez choisir un type de chambre ou de suite.');
      return;
    }
    onBook();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold mb-0.5">
                  Réserver
                </div>
                <p className="text-sm text-neutral-500">
                  Choisissez vos dates et préférences
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {startingPrice ? (
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-400/[0.08] to-transparent border border-amber-400/20 px-4 py-3">
                  <span className="text-sm text-neutral-400">À partir de</span>
                  <span className="font-serif text-xl font-black text-amber-400">
                    {startingPrice.toLocaleString('fr-TN')} DT
                    <span className="text-xs font-medium text-neutral-500 ml-1">/nuit</span>
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
                    Arrivée
                  </label>
                  <input
                    type="date"
                    min={toDateInputValue(today)}
                    value={checkIn ? toDateInputValue(checkIn) : ''}
                    onChange={(e) => {
                      const d = parseDateInput(e.target.value);
                      onCheckInChange(d);
                      if (d && checkOut && checkOut <= d) onCheckOutChange(null);
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
                    Départ
                  </label>
                  <input
                    type="date"
                    min={
                      checkIn
                        ? toDateInputValue(new Date(checkIn.getTime() + 86400000))
                        : toDateInputValue(tomorrow)
                    }
                    value={checkOut ? toDateInputValue(checkOut) : ''}
                    onChange={(e) => onCheckOutChange(parseDateInput(e.target.value))}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
                  Voyageurs
                </label>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Users className="size-4" />
                    <span>Voyageurs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onGuestsChange(Math.max(1, guests - 1))}
                      aria-label="Réduire"
                      className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
                      disabled={guests <= 1}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-neutral-100">{guests}</span>
                    <button
                      type="button"
                      onClick={() => onGuestsChange(Math.min(10, guests + 1))}
                      aria-label="Augmenter"
                      className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600">
                  Chambre / Suite
                </label>
                <select
                  value={selectedRoomType}
                  onChange={(e) => onRoomTypeChange(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                >
                  <option value="">Choisir un type</option>
                  {groups.map((group) => {
                    const label = ROOM_TYPE_LABELS[group.roomType] ?? group.roomType;
                    const capacity = Math.max(
                      ...group.rooms.map((room) => room.capacityAdults ?? room.capacity ?? 1)
                    );
                    const unavailable = group.availableCount === 0 || capacity < guests;
                    return (
                      <option key={group.roomType} value={group.roomType} disabled={unavailable}>
                        {label} &middot; {group.minPrice.toLocaleString('fr-TN')} DT
                        {unavailable ? ' &middot; indisponible' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {nights > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <CalendarDays className="size-3.5" />
                  {nights} nuit{nights > 1 ? 's' : ''} sélectionnée{nights > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] p-4 sm:p-5 space-y-3">
              <button
                type="button"
                onClick={handleBook}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40 active:translate-y-0"
              >
                <Sparkles className="size-4" />
                Réserver maintenant
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
                <Shield className="size-3.5 text-emerald-500" />
                Annulation gratuite sur la plupart des chambres
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
