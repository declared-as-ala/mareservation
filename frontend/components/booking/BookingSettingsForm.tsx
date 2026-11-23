'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { apiGetRaw, apiPatchRaw } from '@/lib/api/client';
import { FEATURES, GOVERNORATES } from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), { ssr: false });

const field = 'mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-3 text-sm text-white outline-none focus:border-amber-400/60 [color-scheme:dark]';
const area = 'mt-1 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60';

type S = Record<string, any>;
const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));

/**
 * Booking settings editor. `mode="owner"` edits operational fields through /owner-hotel; `mode="admin"` also edits
 * the super-admin switches (demo, booking, public listing, owner, tour) through /admin-bookings.
 */
export function BookingSettingsForm({ venueId, mode, owners }: { venueId: string; mode: 'owner' | 'admin'; owners?: { id: string; fullName: string; email: string }[] }) {
  const qc = useQueryClient();
  const url = mode === 'admin' ? `/admin-bookings/properties/${venueId}/settings` : `/owner-hotel/venues/${venueId}/booking-settings`;
  const { data, isLoading } = useQuery({ queryKey: ['booking-settings', mode, venueId], queryFn: async () => (await apiGetRaw<{ data: S }>(url)).data, enabled: !!venueId });
  const [v, setV] = useState<S>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (data) setV({ ...data, ownerId: data.ownerId?._id ?? data.ownerId ?? '', houseRulesText: (data.houseRules ?? []).join('\n') });
  }, [data]);
  const set = (k: string, val: unknown) => setV((cur) => ({ ...cur, [k]: val }));

  const save = useMutation({
    mutationFn: () => {
      const body: S = {
        bookingMode: v.bookingMode ?? 'request',
        rentalMode: v.rentalMode ?? 'rooms',
        entirePricePerNight: num(v.entirePricePerNight),
        cleaningFee: Number(v.cleaningFee) || 0,
        serviceFee: Number(v.serviceFee) || 0,
        minimumNights: Number(v.minimumNights) || 1,
        maxGuests: num(v.maxGuests),
        bedrooms: num(v.bedrooms),
        beds: num(v.beds),
        bathrooms: num(v.bathrooms),
        features: v.features ?? [],
        houseRules: String(v.houseRulesText ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean).slice(0, 20),
        cancellationPolicy: v.cancellationPolicy ?? 'moderate',
        cancellationNotes: v.cancellationNotes ?? '',
        arrivalInstructions: v.arrivalInstructions ?? '',
        checkInPolicy: v.checkInPolicy ?? '',
        checkOutPolicy: v.checkOutPolicy ?? '',
        hostDisplayName: v.hostDisplayName ?? '',
        hostBio: v.hostBio ?? '',
        governorate: v.governorate || null,
        city: v.city,
        address: v.address,
        coordinates: v.coordinates?.lat != null && v.coordinates?.lng != null ? { lat: Number(v.coordinates.lat), lng: Number(v.coordinates.lng) } : null,
      };
      if (mode === 'admin') {
        Object.assign(body, {
          isDemo: !!v.isDemo,
          bookingEnabled: v.bookingEnabled === true ? true : v.bookingEnabled === false ? false : null,
          publicListed: !!v.publicListed,
          isPublished: v.isPublished !== false,
          ownerId: v.ownerId || null,
          immersiveUrl: v.immersiveUrl ? v.immersiveUrl : null,
        });
      }
      return apiPatchRaw(url, body);
    },
    onSuccess: () => { setMsg({ ok: true, text: 'Paramètres enregistrés. Ils s’appliquent immédiatement au site public.' }); void qc.invalidateQueries({ queryKey: ['booking-settings'] }); void qc.invalidateQueries({ queryKey: ['admin-properties'] }); },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Enregistrement impossible.' }),
  });

  if (isLoading || !data) return <p className="text-neutral-400">Chargement…</p>;
  const features: string[] = v.features ?? [];
  const coords = v.coordinates?.lat != null ? { lat: Number(v.coordinates.lat), lng: Number(v.coordinates.lng) } : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate(); }} className="space-y-8 text-white">
      {mode === 'admin' && (
        <section className="rounded-[1.4rem] border border-amber-400/25 bg-amber-400/[0.05] p-5">
          <h3 className="font-serif text-xl">Contrôles super admin</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">Réservations
              <select className={field} value={v.bookingEnabled === true ? 'on' : v.bookingEnabled === false ? 'off' : 'default'} onChange={(e) => set('bookingEnabled', e.target.value === 'on' ? true : e.target.value === 'off' ? false : null)}>
                <option value="default">{v.isDemo ? 'Par défaut (fermées pour une démo)' : 'Par défaut (ouvertes si publiée)'}</option>
                <option value="on">Ouvertes{v.isDemo ? ' (réservations DÉMO simulées)' : ''}</option>
                <option value="off">Fermées</option>
              </select>
            </label>
            <label className="text-sm text-neutral-300">Propriétaire
              <select className={field} value={v.ownerId ?? ''} onChange={(e) => set('ownerId', e.target.value)}>
                <option value="">— aucun —</option>
                {(owners ?? []).map((o) => <option key={o.id} value={o.id}>{o.fullName} ({o.email})</option>)}
              </select>
            </label>
            <label className="text-sm text-neutral-300 sm:col-span-2">URL de la visite 360° (Spinview360…)
              <input className={field} type="url" value={v.immersiveUrl ?? ''} onChange={(e) => set('immersiveUrl', e.target.value)} placeholder="https://spinview360.com/…" />
            </label>
            {([['isDemo', 'Fiche de démonstration (réservations marquées DÉMO, jamais commerciales)'], ['publicListed', 'Visible dans le catalogue public'], ['isPublished', 'Publiée']] as const).map(([k, label]) => (
              <label key={k} className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-5 accent-amber-400" checked={k === 'isPublished' ? v.isPublished !== false : !!v[k]} onChange={(e) => set(k, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-serif text-xl">Mode de réservation</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-neutral-300">Confirmation
            <select className={field} value={v.bookingMode ?? 'request'} onChange={(e) => set('bookingMode', e.target.value)}>
              <option value="request">Sur demande — je confirme chaque réservation</option>
              <option value="instant">Instantanée — confirmation automatique</option>
            </select>
          </label>
          <label className="text-sm text-neutral-300">Type de location
            <select className={field} value={v.rentalMode ?? 'rooms'} onChange={(e) => set('rentalMode', e.target.value)}>
              <option value="rooms">Par chambre (chambres configurées)</option>
              <option value="entire">Maison entière</option>
            </select>
          </label>
          {v.rentalMode === 'entire' && (
            <>
              <label className="text-sm text-neutral-300">Prix de la maison / nuit (TND)<input className={field} type="number" min={0} step="0.01" value={v.entirePricePerNight ?? ''} onChange={(e) => set('entirePricePerNight', e.target.value)} required /></label>
              <label className="text-sm text-neutral-300">Capacité maximale (voyageurs)<input className={field} type="number" min={1} max={50} value={v.maxGuests ?? ''} onChange={(e) => set('maxGuests', e.target.value)} required /></label>
            </>
          )}
          <label className="text-sm text-neutral-300">Séjour minimum (nuits)<input className={field} type="number" min={1} max={30} value={v.minimumNights ?? 1} onChange={(e) => set('minimumNights', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Frais de ménage (TND, par séjour)<input className={field} type="number" min={0} step="0.01" value={v.cleaningFee ?? 0} onChange={(e) => set('cleaningFee', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Frais de service (TND, par séjour)<input className={field} type="number" min={0} step="0.01" value={v.serviceFee ?? 0} onChange={(e) => set('serviceFee', e.target.value)} /></label>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Les tarifs saisonniers se gèrent dans « Tarifs » ; ils sont appliqués nuit par nuit par le serveur.</p>
      </section>

      <section>
        <h3 className="font-serif text-xl">Logement</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {v.rentalMode !== 'entire' && <label className="text-sm text-neutral-300">Voyageurs max.<input className={field} type="number" min={1} max={50} value={v.maxGuests ?? ''} onChange={(e) => set('maxGuests', e.target.value)} /></label>}
          <label className="text-sm text-neutral-300">Chambres<input className={field} type="number" min={0} max={50} value={v.bedrooms ?? ''} onChange={(e) => set('bedrooms', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Lits<input className={field} type="number" min={0} max={100} value={v.beds ?? ''} onChange={(e) => set('beds', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Salles de bain<input className={field} type="number" min={0} max={50} value={v.bathrooms ?? ''} onChange={(e) => set('bathrooms', e.target.value)} /></label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm text-neutral-300">Équipements (utilisés par les filtres de recherche)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const on = features.includes(f.key);
              return <button key={f.key} type="button" aria-pressed={on} onClick={() => set('features', on ? features.filter((x) => x !== f.key) : [...features, f.key])} className={cn('h-10 rounded-full border px-4 text-sm', on ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/15 text-neutral-300')}>{f.label}</button>;
            })}
          </div>
        </fieldset>
      </section>

      <section>
        <h3 className="font-serif text-xl">Règles et conditions</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-neutral-300">Heure d’arrivée<input className={field} value={v.checkInPolicy ?? ''} maxLength={200} onChange={(e) => set('checkInPolicy', e.target.value)} placeholder="À partir de 14h" /></label>
          <label className="text-sm text-neutral-300">Heure de départ<input className={field} value={v.checkOutPolicy ?? ''} maxLength={200} onChange={(e) => set('checkOutPolicy', e.target.value)} placeholder="Avant 11h" /></label>
          <label className="text-sm text-neutral-300">Politique d’annulation
            <select className={field} value={v.cancellationPolicy ?? 'moderate'} onChange={(e) => set('cancellationPolicy', e.target.value)}>
              <option value="flexible">Flexible (24 h)</option><option value="moderate">Modérée (5 jours)</option><option value="strict">Stricte (14 jours)</option>
            </select>
          </label>
          <label className="text-sm text-neutral-300">Précisions sur l’annulation<input className={field} value={v.cancellationNotes ?? ''} maxLength={2000} onChange={(e) => set('cancellationNotes', e.target.value)} /></label>
          <label className="text-sm text-neutral-300 sm:col-span-2">Règlement intérieur (une règle par ligne)<textarea className={area} rows={4} value={v.houseRulesText ?? ''} onChange={(e) => set('houseRulesText', e.target.value)} /></label>
          <label className="text-sm text-neutral-300 sm:col-span-2">Instructions d’arrivée (envoyées après confirmation)<textarea className={area} rows={3} maxLength={2000} value={v.arrivalInstructions ?? ''} onChange={(e) => set('arrivalInstructions', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Nom de l’hôte affiché<input className={field} value={v.hostDisplayName ?? ''} maxLength={120} onChange={(e) => set('hostDisplayName', e.target.value)} /></label>
          <label className="text-sm text-neutral-300 sm:col-span-2">Présentation de l’hôte<textarea className={area} rows={3} maxLength={1500} value={v.hostBio ?? ''} onChange={(e) => set('hostBio', e.target.value)} /></label>
        </div>
      </section>

      <section>
        <h3 className="font-serif text-xl">Localisation</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-neutral-300">Gouvernorat
            <select className={field} value={v.governorate ?? ''} onChange={(e) => set('governorate', e.target.value)}>
              <option value="">—</option>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="text-sm text-neutral-300">Ville<input className={field} value={v.city ?? ''} required maxLength={80} onChange={(e) => set('city', e.target.value)} /></label>
          <label className="text-sm text-neutral-300">Adresse<input className={field} value={v.address ?? ''} required maxLength={200} onChange={(e) => set('address', e.target.value)} /></label>
        </div>
        <p className="mt-4 text-sm text-neutral-400">Position GPS : cliquez sur la carte à l’emplacement exact de la maison. {coords ? `(${coords.lat}, ${coords.lng})` : 'Non définie — la maison n’apparaît pas sur la carte publique.'}</p>
        <div className="mt-2 h-80 overflow-hidden rounded-2xl border border-white/10">
          <TunisiaMap className="size-full" single={!!coords} markers={coords ? [{ id: 'pin', lat: coords.lat, lng: coords.lng, label: 'Ici', title: 'Position' }] : []} onPick={(lat, lng) => set('coordinates', { lat, lng })} ariaLabel="Choisir la position de la maison" />
        </div>
        {coords && <button type="button" onClick={() => set('coordinates', null)} className="mt-2 text-xs text-neutral-400 underline">Retirer la position</button>}
      </section>

      {msg && <p role="status" className={cn('rounded-xl border px-4 py-3 text-sm', msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300')}>{msg.text}</p>}
      <button type="submit" disabled={save.isPending} className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 font-black text-black hover:bg-amber-300 disabled:opacity-60">
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
      </button>
    </form>
  );
}
