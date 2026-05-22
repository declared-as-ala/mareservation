'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CalendarDays, Clock, Users, Phone, User, Mail,
  Loader2, CheckCircle2, Minus, Plus, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Venue } from '@/lib/api/types';
import { createReservation } from '@/lib/api/reservations';
import { useAuthStore } from '@/stores/auth';

const RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;

interface TableReservationDialogProps {
  open: boolean;
  onClose: () => void;
  venue: Venue;
  initialDate: string;
  initialTime: string;
  initialParty: number;
}

/**
 * Self-contained table-reservation dialog for café / restaurant detail pages.
 * Books a table directly via the reservations API — no redirect to /lieu.
 */
export function TableReservationDialog({
  open,
  onClose,
  venue,
  initialDate,
  initialTime,
  initialParty,
}: TableReservationDialogProps) {
  const { user } = useAuthStore() as { user: { fullName?: string; email?: string } | null };
  const nameParts = (user?.fullName ?? '').trim().split(/\s+/).filter(Boolean);

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [party, setParty] = useState(initialParty);
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function handleConfirm() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Veuillez renseigner un numéro de téléphone.');
      return;
    }
    const startAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startAt.getTime())) {
      toast.error('Date ou heure invalide.');
      return;
    }
    setLoading(true);
    try {
      const res = await createReservation({
        venueId: venue._id,
        startAt: startAt.toISOString(),
        endAt: new Date(startAt.getTime() + RESERVATION_DURATION_MS).toISOString(),
        partySize: party,
        bookingType: 'TABLE',
        guestFirstName: firstName.trim(),
        guestLastName: lastName.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim() || undefined,
      });
      setConfirmation(res.confirmationCode ?? res._id);
      toast.success('Votre table est réservée !');
    } catch {
      toast.error("La réservation a échoué. Réessayez ou contactez le lieu.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setConfirmation(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.06] p-5">
              <div>
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                  Réserver une table
                </div>
                <h2 className="text-lg font-bold leading-tight text-neutral-100">{venue.name}</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {confirmation ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                    <PartyPopper className="size-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-100">Réservation confirmée</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Votre table de {party} {party > 1 ? 'personnes' : 'personne'} est réservée.
                    </p>
                  </div>
                  <div className="w-full rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">Code de confirmation</div>
                    <div className="mt-0.5 font-mono text-lg font-bold tracking-wider text-amber-400">
                      {confirmation}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-1 h-11 w-full rounded-xl bg-amber-400 text-sm font-bold text-black transition-all hover:bg-amber-300"
                  >
                    Terminé
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Date + time */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                        <CalendarDays className="size-3.5" /> Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                        <Clock className="size-3.5" /> Heure
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>

                  {/* Party */}
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-neutral-400">
                      <Users className="size-4" /> Convives
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setParty((p) => Math.max(1, p - 1))}
                        disabled={party <= 1}
                        aria-label="Réduire"
                        className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-neutral-100">{party}</span>
                      <button
                        type="button"
                        onClick={() => setParty((p) => Math.min(20, p + 1))}
                        disabled={party >= 20}
                        aria-label="Augmenter"
                        className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3.5">
                    <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                      Vos coordonnées
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Prénom"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Nom"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                        />
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <Phone className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+216 XX XXX XXX"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email (optionnel)"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!confirmation && (
              <div className="border-t border-white/[0.06] p-5">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn(
                    'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
                    'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-black shadow-lg shadow-amber-400/25',
                    'hover:-translate-y-0.5 hover:shadow-amber-400/40 disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  {loading ? 'Réservation…' : 'Confirmer la réservation'}
                </button>
                <p className="mt-2 text-center text-[11px] text-neutral-600">
                  Confirmation immédiate · annulation gratuite jusqu&apos;à 2h avant
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
