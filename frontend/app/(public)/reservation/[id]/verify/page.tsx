'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, XCircle, AlertCircle, Loader2, BedDouble, Calendar, Users, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { apiGetRaw } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type VerifyResponse = {
  ok: boolean;
  reason?: string | null;
  reservation?: {
    _id: string;
    ref: string;
    status: string;
    checkInStatus: string;
    startAt: string;
    endAt: string;
    nights?: number;
    guestFirstName?: string;
    guestLastName?: string;
    adults?: number;
    children?: number;
    venue?: { name?: string; city?: string; address?: string; phone?: string; coverImage?: string };
    room?: { name?: string; roomNumber?: number; roomType?: string };
    totalPrice?: number;
    paymentStatus?: string;
  };
};

const REASON_LABEL: Record<string, string> = {
  invalid_id: 'Identifiant invalide',
  not_found: 'Réservation introuvable',
  code_mismatch: 'Code de confirmation invalide',
  cancelled: 'Réservation annulée',
  no_show: 'No-show',
  refunded: 'Remboursée',
  server_error: 'Erreur serveur',
};

export default function VerifyReservationPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const code = sp.get('code') ?? '';
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGetRaw<VerifyResponse>(`/hotel-checkout/verify/${id}?code=${encodeURIComponent(code)}`)
      .then((res) => { if (active) setData(res); })
      .catch(() => { if (active) setData({ ok: false, reason: 'server_error' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="size-7 animate-spin text-amber-400" />
          <p className="text-sm">Vérification en cours…</p>
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <div className="mx-auto mb-4 size-14 rounded-full bg-red-500/15 flex items-center justify-center">
            <XCircle className="size-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Réservation invalide</h1>
          <p className="text-sm text-zinc-400">
            {REASON_LABEL[data?.reason ?? 'server_error'] ?? 'Cette réservation ne peut pas être vérifiée.'}
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            Si vous pensez que c&apos;est une erreur, contactez la réception de l&apos;hôtel.
          </p>
        </div>
      </div>
    );
  }

  const r = data.reservation!;
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const isCheckedIn = r.checkInStatus === 'checked_in';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Status banner */}
        <div className={cn(
          'rounded-3xl p-6 mb-4 text-center',
          isCheckedIn
            ? 'bg-gradient-to-br from-blue-500/15 to-blue-400/5 border border-blue-400/30'
            : 'bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 border border-emerald-400/30',
        )}>
          <div className={cn(
            'mx-auto mb-3 size-16 rounded-full flex items-center justify-center',
            isCheckedIn ? 'bg-blue-500/20' : 'bg-emerald-500/20',
          )}>
            {isCheckedIn ? <ShieldCheck className="size-8 text-blue-300" /> : <CheckCircle2 className="size-8 text-emerald-300" />}
          </div>
          <h1 className={cn('text-2xl font-bold', isCheckedIn ? 'text-blue-200' : 'text-emerald-200')}>
            {isCheckedIn ? 'Client enregistré' : 'Réservation valide'}
          </h1>
          <p className={cn('text-sm mt-1', isCheckedIn ? 'text-blue-200/70' : 'text-emerald-200/70')}>
            Référence <span className="font-mono font-bold tracking-wider">{r.ref}</span>
          </p>
        </div>

        {/* Venue header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-3">
          {r.venue?.coverImage && (
            <div className="relative h-32">
              <Image src={r.venue.coverImage} alt={r.venue.name ?? 'Hôtel'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="font-bold text-white text-lg">{r.venue.name}</p>
                <p className="text-xs text-zinc-300 flex items-center gap-1"><MapPin className="size-3" />{r.venue.city}</p>
              </div>
            </div>
          )}
          <div className="p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <BedDouble className="size-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-xs">Chambre</p>
                <p className="text-zinc-200 font-medium truncate">
                  {r.room?.name ?? `Chambre ${r.room?.roomNumber ?? ''}`}
                  {r.room?.roomType && <span className="text-zinc-500 ml-1">· {r.room.roomType}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-xs">Séjour</p>
                <p className="text-zinc-200 font-medium">
                  {fmt(r.startAt)} → {fmt(r.endAt)}
                  {r.nights && <span className="text-zinc-500 ml-1">· {r.nights} nuit{r.nights > 1 ? 's' : ''}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-xs">Client</p>
                <p className="text-zinc-200 font-medium truncate">
                  {[r.guestFirstName, r.guestLastName].filter(Boolean).join(' ') || '—'}
                  {(r.adults || r.children) && (
                    <span className="text-zinc-500 ml-2 text-xs">
                      {r.adults ?? 0} ad. {r.children ? `· ${r.children} enf.` : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
            r.status === 'confirmed' && 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
            r.status === 'checked_in' && 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
            r.status === 'completed' && 'bg-zinc-700/40 text-zinc-300 border border-zinc-600',
            r.status === 'pending' && 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
          )}>
            {r.status}
          </span>
          {r.paymentStatus && (
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
              r.paymentStatus === 'paid'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
            )}>
              {r.paymentStatus}
            </span>
          )}
        </div>

        {r.venue?.phone && (
          <a href={`tel:${r.venue.phone}`} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 text-sm transition-colors">
            <Phone className="size-4" /> Contacter l&apos;hôtel
          </a>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-zinc-600">
          <AlertCircle className="size-3" />
          Vérification effectuée le {new Date().toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
