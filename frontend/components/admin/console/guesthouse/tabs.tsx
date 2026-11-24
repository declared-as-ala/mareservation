'use client';

/** Guesthouse editor tabs. Every save goes through PATCH /admin-bookings/properties/:id/settings (zod-validated, audited). */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, BedDouble, CalendarCheck2, Expand, ExternalLink, GripVertical, ImagePlus, Plus, Star, Trash2, UserCheck, X,
} from 'lucide-react';
import {
  createRoom, deleteRoom, fetchOwners, fetchReservations, updateRoom, uploadImageWithProgress, type RoomRow,
} from '@/lib/api/admin-console';
import { fetchQuote, FEATURES, GOVERNORATES, type Quote } from '@/lib/api/bookings';
import { VenueCalendarManager } from '@/components/booking/VenueCalendarManager';
import {
  Card, EmptyState, ErrorBox, Pagination, Skeleton, Spinner, StatusBadge, addDays, button, fmtDay, fmtStayDay, fmtTND, inputCls, labelCls, selectCls,
  td, th, todayTunis,
} from '../ui';
import { ReservationDrawer } from '../ReservationDrawer';
import { cn } from '@/lib/utils';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), { ssr: false, loading: () => <Skeleton className="h-full" /> });

export type Settings = Record<string, any> & { _id: string; name: string; slug?: string; rooms?: RoomRow[] };
export type Save = (patch: Record<string, unknown>, okMsg?: string) => Promise<boolean>;

const textareaCls = cn(inputCls, 'h-auto min-h-[96px] py-2 leading-relaxed');
const Hint = ({ children }: { children: React.ReactNode }) => <p className="mt-1 text-[11.5px] text-[#8A867E]">{children}</p>;
const nonPlaceholder = (v?: string) => (v === 'À compléter' ? '' : v ?? '');

function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex items-center justify-end gap-2 border-t border-[#E7E4DD] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
      {dirty && <span className="mr-auto text-[12px] text-amber-800">Modifications non enregistrées</span>}
      <button type="button" className={button('ghost')} disabled={!dirty || saving} onClick={onReset}>Annuler</button>
      <button type="button" className={button('primary')} disabled={!dirty || saving} onClick={onSave}>{saving && <Spinner />} Enregistrer</button>
    </div>
  );
}

/** Local form state seeded from settings, with a dirty check and diff-only save. */
function useForm<T extends Record<string, unknown>>(seed: T, save: Save) {
  const [f, setF] = useState<T>(seed);
  const [saving, setSaving] = useState(false);
  const seedKey = JSON.stringify(seed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(seed), [seedKey]);
  const diff = useMemo(() => {
    const d: Record<string, unknown> = {};
    for (const k of Object.keys(f)) if (JSON.stringify(f[k]) !== JSON.stringify(seed[k])) d[k] = f[k];
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, seedKey]);
  const dirty = Object.keys(diff).length > 0;
  const submit = async (transform?: (d: Record<string, unknown>) => Record<string, unknown>) => {
    setSaving(true);
    try { await save(transform ? transform(diff) : diff); } finally { setSaving(false); }
  };
  return { f, setF, set: <K extends keyof T>(k: K, v: T[K]) => setF((x) => ({ ...x, [k]: v })), dirty, saving, submit, reset: () => setF(seed), diff };
}

/* ── 1. Général ───────────────────────────────────────────── */
export function GeneralTab({ s, save }: { s: Settings; save: Save }) {
  const seed = {
    name: s.name ?? '', slug: s.slug ?? '', shortDescription: s.shortDescription ?? '', description: nonPlaceholder(s.description),
    features: (s.features ?? []) as string[], houseRules: ((s.houseRules ?? []) as string[]).join('\n'),
    checkInPolicy: s.checkInPolicy ?? '', checkOutPolicy: s.checkOutPolicy ?? '', cancellationPolicy: s.cancellationPolicy ?? 'moderate',
    cancellationNotes: s.cancellationNotes ?? '', arrivalInstructions: s.arrivalInstructions ?? '', hostDisplayName: s.hostDisplayName ?? '', hostBio: s.hostBio ?? '',
  };
  const { f, set, dirty, saving, submit, reset } = useForm(seed, save);
  const toggleFeature = (k: string) => set('features', f.features.includes(k) ? f.features.filter((x) => x !== k) : [...f.features, k]);
  return (
    <Card>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
        <div><label htmlFor="g-name" className={labelCls}>Nom de la maison</label><input id="g-name" className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={140} /></div>
        <div>
          <label htmlFor="g-slug" className={labelCls}>Adresse de la fiche (slug)</label>
          <div className="flex items-center rounded-lg border border-[#E7E4DD] bg-[#FBFAF8] pl-3 text-[12.5px] text-[#8A867E] focus-within:border-[#C99628]">
            /maison-d-hote/<input id="g-slug" className="h-9 min-w-0 flex-1 bg-white px-2 text-[13px] text-[#171717] outline-none" value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} maxLength={120} />
          </div>
          <Hint>Changer le slug casse les liens déjà partagés.</Hint>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="g-short" className={labelCls}>Description courte</label>
          <input id="g-short" className={inputCls} value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={300} />
          <Hint>{f.shortDescription.length}/300 · utilisée aussi comme méta-description (SEO) et sur les cartes de recherche.</Hint>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="g-desc" className={labelCls}>Description complète</label>
          <textarea id="g-desc" className={cn(textareaCls, 'min-h-[160px]')} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={8000} />
        </div>
        <fieldset className="lg:col-span-2">
          <legend className={labelCls}>Équipements</legend>
          <div className="flex flex-wrap gap-1.5">
            {FEATURES.map((ft) => {
              const on = f.features.includes(ft.key);
              return (
                <button key={ft.key} type="button" aria-pressed={on} onClick={() => toggleFeature(ft.key)}
                  className={cn('h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors', on ? 'border-[#C99628] bg-[#F7F1E3] text-[#171717]' : 'border-[#E7E4DD] bg-white text-[#4A4740] hover:bg-[#F4F2EE]')}>
                  {ft.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div><label htmlFor="g-in" className={labelCls}>Arrivée (check-in)</label><input id="g-in" className={inputCls} value={f.checkInPolicy} onChange={(e) => set('checkInPolicy', e.target.value)} placeholder="À partir de 15 h" maxLength={200} /></div>
        <div><label htmlFor="g-out" className={labelCls}>Départ (check-out)</label><input id="g-out" className={inputCls} value={f.checkOutPolicy} onChange={(e) => set('checkOutPolicy', e.target.value)} placeholder="Avant 11 h" maxLength={200} /></div>
        <div>
          <label htmlFor="g-rules" className={labelCls}>Règlement intérieur</label>
          <textarea id="g-rules" className={textareaCls} value={f.houseRules} onChange={(e) => set('houseRules', e.target.value)} placeholder={'Une règle par ligne\nNon-fumeur\nPas de fêtes'} />
          <Hint>Une règle par ligne (20 max).</Hint>
        </div>
        <div>
          <label htmlFor="g-arr" className={labelCls}>Instructions d’arrivée</label>
          <textarea id="g-arr" className={textareaCls} value={f.arrivalInstructions} onChange={(e) => set('arrivalInstructions', e.target.value)} maxLength={2000} />
          <Hint>Communiquées au client une fois la réservation confirmée.</Hint>
        </div>
        <div>
          <label htmlFor="g-cancel" className={labelCls}>Politique d’annulation</label>
          <select id="g-cancel" className={selectCls} value={f.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value)}>
            <option value="flexible">Flexible</option><option value="moderate">Modérée</option><option value="strict">Stricte</option>
          </select>
        </div>
        <div><label htmlFor="g-cnotes" className={labelCls}>Précisions sur l’annulation</label><input id="g-cnotes" className={inputCls} value={f.cancellationNotes} onChange={(e) => set('cancellationNotes', e.target.value)} maxLength={2000} /></div>
        <div><label htmlFor="g-host" className={labelCls}>Nom de l’hôte affiché</label><input id="g-host" className={inputCls} value={f.hostDisplayName} onChange={(e) => set('hostDisplayName', e.target.value)} maxLength={120} /></div>
        <div><label htmlFor="g-bio" className={labelCls}>Présentation de l’hôte</label><input id="g-bio" className={inputCls} value={f.hostBio} onChange={(e) => set('hostBio', e.target.value)} maxLength={1500} /></div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={() => submit((d) => {
        if ('houseRules' in d) d.houseRules = String(d.houseRules).split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
        if ('description' in d && !String(d.description).trim()) delete d.description;
        return d;
      })} />
    </Card>
  );
}

/* ── 2. Localisation ──────────────────────────────────────── */
export function LocationTab({ s, save }: { s: Settings; save: Save }) {
  const seed = { governorate: s.governorate ?? '', city: s.city ?? '', address: nonPlaceholder(s.address), lat: s.coordinates?.lat ?? '', lng: s.coordinates?.lng ?? '' };
  const { f, set, setF, dirty, saving, submit, reset } = useForm(seed as Record<string, any>, save);
  const lat = Number(f.lat);
  const lng = Number(f.lng);
  const hasPoint = f.lat !== '' && f.lng !== '' && Number.isFinite(lat) && Number.isFinite(lng);
  const inTunisia = hasPoint && lat >= 30 && lat <= 37.6 && lng >= 7.4 && lng <= 11.7;
  return (
    <Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-4">
          <div>
            <label htmlFor="l-gov" className={labelCls}>Gouvernorat</label>
            <select id="l-gov" className={selectCls} value={f.governorate} onChange={(e) => set('governorate', e.target.value)}>
              <option value="">—</option>{GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div><label htmlFor="l-city" className={labelCls}>Ville</label><input id="l-city" className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} maxLength={80} /></div>
          <div><label htmlFor="l-addr" className={labelCls}>Adresse</label><textarea id="l-addr" className={textareaCls} value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={200} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="l-lat" className={labelCls}>Latitude</label><input id="l-lat" inputMode="decimal" className={inputCls} value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder="36.85" /></div>
            <div><label htmlFor="l-lng" className={labelCls}>Longitude</label><input id="l-lng" inputMode="decimal" className={inputCls} value={f.lng} onChange={(e) => set('lng', e.target.value)} placeholder="10.32" /></div>
          </div>
          {hasPoint && !inTunisia && <p className="text-[12px] font-medium text-red-700">Ces coordonnées sont hors de Tunisie.</p>}
          <Hint>Cliquez sur la carte pour placer le repère, ou saisissez les coordonnées. Rien n’est deviné automatiquement.</Hint>
          {hasPoint && <button type="button" className={button('ghost', 'px-0 text-red-700')} onClick={() => setF((x) => ({ ...x, lat: '', lng: '' }))}>Retirer le repère</button>}
        </div>
        <div className="h-[340px] overflow-hidden rounded-xl border border-[#E7E4DD] sm:h-[420px]">
          <TunisiaMap
            single
            className="size-full"
            ariaLabel="Position de la maison — cliquez pour placer le repère"
            markers={inTunisia ? [{ id: 'pin', lat, lng, label: s.name, title: s.name }] : []}
            onPick={(la, ln) => setF((x) => ({ ...x, lat: Math.round(la * 1e6) / 1e6, lng: Math.round(ln * 1e6) / 1e6 }))}
          />
        </div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={() => {
        if (hasPoint && !inTunisia) return toast.error('Coordonnées hors de Tunisie.');
        submit((d) => {
          const out: Record<string, unknown> = {};
          if ('governorate' in d) out.governorate = d.governorate || null;
          if ('city' in d) out.city = d.city;
          if ('address' in d && String(d.address).trim()) out.address = d.address;
          if ('lat' in d || 'lng' in d) out.coordinates = hasPoint ? { lat, lng } : null;
          return out;
        });
      }} />
    </Card>
  );
}

/* ── 3. Galerie photos ────────────────────────────────────── */
type Photo = { url: string; alt: string };
export function GalleryTab({ s, save }: { s: Settings; save: Save }) {
  const seed = useMemo(() => {
    const alts = new Map<string, string>(((s.galleryMeta ?? []) as Photo[]).map((m) => [m.url, m.alt ?? '']));
    const urls = [...new Set([s.coverImage, ...((s.gallery ?? []) as string[])].filter(Boolean) as string[])];
    return urls.map((url) => ({ url, alt: alts.get(url) ?? '' }));
  }, [s.coverImage, s.gallery, s.galleryMeta]);
  const [photos, setPhotos] = useState<Photo[]>(seed);
  const [uploads, setUploads] = useState<{ id: string; name: string; pct: number; error?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const seedKey = JSON.stringify(seed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPhotos(seed), [seedKey]);
  const dirty = JSON.stringify(photos) !== seedKey;

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (list.length < Array.from(files).length) toast.error('Formats acceptés : JPEG, PNG, WebP.');
    await Promise.all(list.map(async (file) => {
      const id = `${file.name}-${Math.random().toString(36).slice(2, 7)}`;
      setUploads((u) => [...u, { id, name: file.name, pct: 0 }]);
      try {
        const url = await uploadImageWithProgress(file, (pct) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct } : x))));
        setPhotos((p) => [...p, { url, alt: '' }]);
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : 'Échec' } : x)));
      }
    }));
  };
  const move = (from: number, to: number) => setPhotos((p) => {
    if (to < 0 || to >= p.length) return p;
    const n = [...p];
    const [it] = n.splice(from, 1);
    n.splice(to, 0, it);
    return n;
  });
  const persist = async () => {
    setSaving(true);
    try {
      await save({
        coverImage: photos[0]?.url ?? null,
        gallery: photos.slice(1).map((p) => p.url),
        galleryMeta: photos.filter((p) => p.alt.trim()).map((p) => ({ url: p.url, alt: p.alt.trim() })),
      }, 'Galerie enregistrée.');
    } finally { setSaving(false); }
  };

  return (
    <Card title="Galerie photos" subtitle="Photos publiques de la fiche. La première est la photo de couverture. Les panoramas 360° se gèrent dans l’onglet Visite virtuelle.">
      <div
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => { e.preventDefault(); setDropActive(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        className={cn('flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors', dropActive ? 'border-[#C99628] bg-[#FBF6EA]' : 'border-[#E7E4DD] bg-[#FBFAF8]')}
      >
        <ImagePlus className="size-6 text-[#8A6514]" aria-hidden="true" />
        <p className="mt-2 text-[13px] font-medium text-[#171717]">Glissez vos photos ici</p>
        <p className="text-[12px] text-[#8A867E]">JPEG, PNG ou WebP · redimensionnées automatiquement (2560 px max)</p>
        <button type="button" className={button('outline', 'mt-3')} onClick={() => input.current?.click()}>Choisir des fichiers</button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-lg border border-[#E7E4DD] px-3 py-2 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{u.name}</span>
                {u.error ? (
                  <span className="flex items-center gap-2 text-red-700">{u.error}<button type="button" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))} aria-label="Fermer"><X className="size-3.5" /></button></span>
                ) : <span className="tabular-nums text-[#6B6760]">{u.pct} %</span>}
              </div>
              {!u.error && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#F1EFEA]"><div className="h-full bg-[#C99628] transition-[width]" style={{ width: `${u.pct}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}

      {!photos.length ? <EmptyState compact title="Aucune photo" text="Ajoutez au moins une photo de couverture avant publication." /> : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={p.url}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag != null && drag !== i) move(drag, i); setDrag(null); }}
              className={cn('group overflow-hidden rounded-xl border bg-white', i === 0 ? 'border-[#C99628] ring-1 ring-[#C99628]' : 'border-[#E7E4DD]', drag === i && 'opacity-50')}
            >
              <div className="relative aspect-[4/3] bg-[#F1EFEA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt || ''} loading="lazy" className="size-full object-cover" />
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1">
                  <span className="grid size-6 cursor-grab place-items-center rounded-md bg-white/90 text-[#4A4740] shadow-sm" title="Glisser pour réordonner"><GripVertical className="size-3.5" /></span>
                  {i === 0 && <span className="rounded-md bg-[#C99628] px-1.5 py-0.5 text-[10.5px] font-bold text-[#171717]">Couverture</span>}
                </span>
                <button type="button" onClick={() => setPreview(i)} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-white/90 text-[#171717] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Aperçu plein écran">
                  <Expand className="size-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 p-2">
                <label className="sr-only" htmlFor={`alt-${i}`}>Texte alternatif de la photo {i + 1}</label>
                <input id={`alt-${i}`} className={cn(inputCls, 'h-8 text-[12px]')} placeholder="Texte alternatif (accessibilité)" value={p.alt} maxLength={200}
                  onChange={(e) => setPhotos((x) => x.map((y, j) => (j === i ? { ...y, alt: e.target.value } : y)))} />
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <button type="button" className={button('ghost', 'h-7 w-7 px-0')} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Déplacer avant"><ArrowUp className="size-3.5" /></button>
                    <button type="button" className={button('ghost', 'h-7 w-7 px-0')} disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} aria-label="Déplacer après"><ArrowDown className="size-3.5" /></button>
                    {i !== 0 && <button type="button" className={button('ghost', 'h-7 px-1.5 text-[11.5px]')} onClick={() => move(i, 0)}><Star className="size-3.5" /> Couverture</button>}
                  </div>
                  {confirmDel === p.url ? (
                    <span className="flex gap-1">
                      <button type="button" className={button('danger', 'h-7 px-2 text-[11.5px]')} onClick={() => { setPhotos((x) => x.filter((y) => y.url !== p.url)); setConfirmDel(null); }}>Retirer</button>
                      <button type="button" className={button('ghost', 'h-7 w-7 px-0')} onClick={() => setConfirmDel(null)} aria-label="Annuler"><X className="size-3.5" /></button>
                    </span>
                  ) : (
                    <button type="button" className={button('ghost', 'h-7 w-7 px-0 text-red-700')} onClick={() => setConfirmDel(p.url)} aria-label="Retirer la photo"><Trash2 className="size-3.5" /></button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview != null && photos[preview] && (
        <div className="on-dark fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Aperçu de la photo" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[preview].url} alt={photos[preview].alt} className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-[#FFFFFF]" aria-label="Fermer"><X className="size-5" /></button>
        </div>
      )}

      <SaveBar dirty={dirty} saving={saving} onReset={() => setPhotos(seed)} onSave={persist} />
    </Card>
  );
}

/* ── 4. Chambres & capacité ───────────────────────────────── */
export function RoomsTab({ s, save, venueId, refetch }: { s: Settings; save: Save; venueId: string; refetch: () => void }) {
  const seed = { rentalMode: s.rentalMode ?? 'rooms', maxGuests: s.maxGuests ?? '', bedrooms: s.bedrooms ?? '', beds: s.beds ?? '', bathrooms: s.bathrooms ?? '' };
  const { f, set, dirty, saving, submit, reset } = useForm(seed as Record<string, any>, save);
  const num = (v: unknown) => (v === '' || v == null ? null : Number(v));
  const rooms = (s.rooms ?? []) as RoomRow[];
  return (
    <div className="space-y-4">
      <Card title="Type de location et capacité">
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="sr-only">Type de location</legend>
          {([['entire', 'Maison entière', 'Les voyageurs réservent toute la maison — un prix par nuit.'], ['rooms', 'Par chambre', 'Chaque chambre est un inventaire réservable séparément.']] as const).map(([v, l, d]) => (
            <label key={v} className={cn('cursor-pointer rounded-xl border p-3.5', f.rentalMode === v ? 'border-[#C99628] bg-[#FBF6EA]' : 'border-[#E7E4DD] hover:bg-[#FBFAF8]')}>
              <input type="radio" name="rm" className="sr-only" checked={f.rentalMode === v} onChange={() => set('rentalMode', v)} />
              <span className="block text-[13.5px] font-semibold text-[#171717]">{l}</span><span className="text-[12px] text-[#6B6760]">{d}</span>
            </label>
          ))}
        </fieldset>
        {f.rentalMode !== s.rentalMode && (s.rooms?.length ?? 0) > 0 && <p className="mt-2 text-[12px] text-amber-800">Changer le type modifie l’inventaire réservable : vérifiez les réservations à venir.</p>}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([['maxGuests', 'Voyageurs max.'], ['bedrooms', 'Chambres'], ['beds', 'Lits'], ['bathrooms', 'Salles de bain']] as const).map(([k, l]) => (
            <div key={k}><label htmlFor={`c-${k}`} className={labelCls}>{l}</label><input id={`c-${k}`} type="number" min={0} max={k === 'maxGuests' ? 50 : 100} className={inputCls} value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>
          ))}
        </div>
        <Hint>En location « maison entière », la capacité maximale limite le nombre de voyageurs par réservation.</Hint>
        <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={() => submit((d) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(d)) out[k] = k === 'rentalMode' ? v : num(v);
          if (out.maxGuests === 0) out.maxGuests = null;
          return out;
        })} />
      </Card>
      {f.rentalMode === 'rooms' && <RoomsManager venueId={venueId} rooms={rooms} onChange={refetch} />}
    </div>
  );
}

function RoomsManager({ venueId, rooms, onChange }: { venueId: string; rooms: RoomRow[]; onChange: () => void }) {
  const blank = { name: '', roomNumber: '', roomType: 'double', capacity: '2', pricePerNight: '', minimumNights: '1' };
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { toast.success('Chambres mises à jour.'); setDraft(null); setEditing(null); setConfirmDel(null); onChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  });
  const body = (d: Record<string, string>) => ({ name: d.name.trim() || undefined, roomNumber: Number(d.roomNumber), roomType: d.roomType, capacity: Number(d.capacity), pricePerNight: Number(d.pricePerNight), minimumNights: Number(d.minimumNights) || 1 });
  const valid = (d: Record<string, string>) => Number(d.roomNumber) > 0 && Number(d.capacity) > 0 && Number(d.pricePerNight) > 0;
  const Form = ({ d, setD, onSubmit }: { d: Record<string, string>; setD: (d: Record<string, string>) => void; onSubmit: () => void }) => (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#E7E4DD] bg-[#FBFAF8] p-3 sm:grid-cols-6">
      <input aria-label="Nom" className={cn(inputCls, 'sm:col-span-2')} placeholder="Nom (ex. Suite Jasmin)" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      <input aria-label="Numéro" type="number" min={1} className={inputCls} placeholder="N°" value={d.roomNumber} onChange={(e) => setD({ ...d, roomNumber: e.target.value })} />
      <select aria-label="Type" className={selectCls} value={d.roomType} onChange={(e) => setD({ ...d, roomType: e.target.value })}>
        {['single', 'double', 'twin', 'triple', 'family', 'suite'].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input aria-label="Capacité" type="number" min={1} max={20} className={inputCls} placeholder="Pers." value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} />
      <input aria-label="Prix par nuit (TND)" type="number" min={1} className={inputCls} placeholder="TND/nuit" value={d.pricePerNight} onChange={(e) => setD({ ...d, pricePerNight: e.target.value })} />
      <div className="col-span-2 flex justify-end gap-2 sm:col-span-6">
        <button type="button" className={button('ghost')} onClick={() => { setDraft(null); setEditing(null); }}>Annuler</button>
        <button type="button" className={button('primary')} disabled={!valid(d) || run.isPending} onClick={onSubmit}>{run.isPending && <Spinner />} Enregistrer</button>
      </div>
    </div>
  );
  const [editDraft, setEditDraft] = useState<Record<string, string>>(blank);
  return (
    <Card title="Chambres réservables" subtitle="Inventaire utilisé par le moteur de réservation et le calcul d’occupation" action={!draft && <button type="button" className={button('outline')} onClick={() => setDraft(blank)}><Plus className="size-4" /> Ajouter</button>}>
      {draft && <div className="mb-3"><Form d={draft} setD={setDraft} onSubmit={() => run.mutate(() => createRoom(venueId, body(draft) as any))} /></div>}
      {!rooms.length && !draft ? <EmptyState compact icon={BedDouble} title="Aucune chambre" text="Ajoutez les chambres réservables et leur prix par nuit." /> : (
        <ul className="divide-y divide-[#F1EFEA]">
          {rooms.map((r) => (
            <li key={r._id} className="py-2.5">
              {editing === r._id ? <Form d={editDraft} setD={setEditDraft} onSubmit={() => run.mutate(() => updateRoom(r._id, body(editDraft) as any))} /> : (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="font-semibold">{r.name || `Chambre ${r.roomNumber}`}</span>
                    <span className="text-[#8A867E]"> · n° {r.roomNumber} · {r.roomType} · {r.capacity} pers.</span>
                    {r.isActive === false && <span className="ml-1.5 rounded bg-[#F1EFEA] px-1 text-[11px]">inactive</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="mr-2 font-semibold tabular-nums">{fmtTND(r.pricePerNight)}</span>
                    <button type="button" className={button('ghost', 'h-7 px-2')} onClick={() => { setEditing(r._id); setEditDraft({ name: r.name ?? '', roomNumber: String(r.roomNumber), roomType: r.roomType, capacity: String(r.capacity), pricePerNight: String(r.pricePerNight), minimumNights: String(r.minimumNights ?? 1) }); }}>Modifier</button>
                    {confirmDel === r._id ? (
                      <><button type="button" className={button('danger', 'h-7 px-2')} disabled={run.isPending} onClick={() => run.mutate(() => deleteRoom(r._id))}>Supprimer</button><button type="button" className={button('ghost', 'h-7 w-7 px-0')} aria-label="Annuler" onClick={() => setConfirmDel(null)}><X className="size-3.5" /></button></>
                    ) : <button type="button" className={button('ghost', 'h-7 w-7 px-0 text-red-700')} aria-label={`Supprimer ${r.name || r.roomNumber}`} onClick={() => setConfirmDel(r._id)}><Trash2 className="size-3.5" /></button>}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Hint>Le serveur refuse la suppression d’une chambre ayant des réservations actives.</Hint>
    </Card>
  );
}

/* ── 5. Tarifs & réservation ──────────────────────────────── */
export function PricingTab({ s, save }: { s: Settings; save: Save }) {
  const seed = {
    entirePricePerNight: s.entirePricePerNight ?? '', cleaningFee: s.cleaningFee ?? 0, serviceFee: s.serviceFee ?? 0, minimumNights: s.minimumNights ?? 1,
    bookingMode: s.bookingMode ?? 'request', bookingEnabled: s.bookingEnabled === false ? 'off' : 'on',
  };
  const { f, set, dirty, saving, submit, reset } = useForm(seed as Record<string, any>, save);
  const entire = s.rentalMode === 'entire';
  const [qIn, setQIn] = useState(() => addDays(todayTunis(), 14));
  const [nights, setNights] = useState(2);
  const quote = useMutation({ mutationFn: () => fetchQuote({ venueId: s.slug || s._id, checkIn: qIn, checkOut: addDays(qIn, nights), adults: 2, children: 0 }) });
  const qd = quote.data as Quote | undefined;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_22rem]">
      <Card title="Tarifs et règles de réservation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entire ? (
            <div><label htmlFor="p-price" className={labelCls}>Prix par nuit (maison entière, TND)</label><input id="p-price" type="number" min={0} className={inputCls} value={f.entirePricePerNight} onChange={(e) => set('entirePricePerNight', e.target.value)} /></div>
          ) : <div className="rounded-lg bg-[#FBFAF8] p-3 text-[12.5px] text-[#4A4740] sm:col-span-2">Location par chambre : les prix par nuit se règlent dans l’onglet <strong>Chambres &amp; capacité</strong>.</div>}
          <div><label htmlFor="p-min" className={labelCls}>Séjour minimum (nuits)</label><input id="p-min" type="number" min={1} max={30} className={inputCls} value={f.minimumNights} onChange={(e) => set('minimumNights', e.target.value)} /></div>
          <div><label htmlFor="p-clean" className={labelCls}>Frais de ménage (TND / séjour)</label><input id="p-clean" type="number" min={0} className={inputCls} value={f.cleaningFee} onChange={(e) => set('cleaningFee', e.target.value)} /></div>
          <div><label htmlFor="p-service" className={labelCls}>Frais de service (TND / séjour)</label><input id="p-service" type="number" min={0} className={inputCls} value={f.serviceFee} onChange={(e) => set('serviceFee', e.target.value)} /></div>
          <fieldset className="sm:col-span-2">
            <legend className={labelCls}>Mode de réservation</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([['request', 'Validation par le propriétaire', 'Le client envoie une demande ; l’hôte confirme.'], ['instant', 'Réservation instantanée', 'Confirmée immédiatement si les dates sont libres.']] as const).map(([v, l, d]) => (
                <label key={v} className={cn('cursor-pointer rounded-xl border p-3', f.bookingMode === v ? 'border-[#C99628] bg-[#FBF6EA]' : 'border-[#E7E4DD]')}>
                  <input type="radio" name="bm" className="sr-only" checked={f.bookingMode === v} onChange={() => set('bookingMode', v)} />
                  <span className="block text-[13px] font-semibold">{l}</span><span className="text-[12px] text-[#6B6760]">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E7E4DD] p-3 sm:col-span-2">
            <span><span className="block text-[13px] font-semibold">Réservations en ligne ouvertes</span><span className="text-[12px] text-[#6B6760]">Désactivez pour suspendre temporairement les nouvelles demandes.</span></span>
            <input type="checkbox" className="size-5 accent-[#C99628]" checked={f.bookingEnabled === 'on'} onChange={(e) => set('bookingEnabled', e.target.checked ? 'on' : 'off')} />
          </label>
        </div>
        <Hint>Tarifs saisonniers et prix par date : non disponibles dans cet éditeur pour l’instant (le moteur applique le prix de base ci-dessus).</Hint>
        <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={() => submit((d) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(d)) {
            if (k === 'bookingEnabled') out.bookingEnabled = v === 'on' ? null : false;
            else if (k === 'bookingMode') out.bookingMode = v;
            else if (k === 'entirePricePerNight') out.entirePricePerNight = v === '' ? null : Number(v);
            else out[k] = Number(v);
          }
          return out;
        })} />
      </Card>
      <Card title="Aperçu du prix" subtitle="Calculé par le moteur de réservation (2 adultes)">
        <div className="grid grid-cols-2 gap-2">
          <div><label htmlFor="q-in" className={labelCls}>Arrivée</label><input id="q-in" type="date" className={inputCls} value={qIn} min={todayTunis()} onChange={(e) => setQIn(e.target.value)} /></div>
          <div><label htmlFor="q-n" className={labelCls}>Nuits</label><input id="q-n" type="number" min={1} max={30} className={inputCls} value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))} /></div>
        </div>
        <button type="button" className={button('outline', 'mt-3 w-full')} onClick={() => quote.mutate()} disabled={quote.isPending}>{quote.isPending && <Spinner />} Calculer</button>
        {dirty && <p className="mt-2 text-[11.5px] text-amber-800">Enregistrez d’abord pour prévisualiser les nouveaux tarifs.</p>}
        {quote.error && <p className="mt-3 text-[12.5px] text-red-700">{quote.error instanceof Error ? quote.error.message : 'Calcul impossible.'}</p>}
        {qd && (qd.available ? (
          <dl className="mt-3 divide-y divide-[#F1EFEA] text-[13px]">
            <div className="flex justify-between py-1.5"><dt className="text-[#6B6760]">{qd.nights} nuit{qd.nights > 1 ? 's' : ''}</dt><dd className="tabular-nums">{fmtTND(qd.subtotal, true)}</dd></div>
            {!!qd.cleaningFee && <div className="flex justify-between py-1.5"><dt className="text-[#6B6760]">Ménage</dt><dd className="tabular-nums">{fmtTND(qd.cleaningFee, true)}</dd></div>}
            {!!qd.serviceFee && <div className="flex justify-between py-1.5"><dt className="text-[#6B6760]">Service</dt><dd className="tabular-nums">{fmtTND(qd.serviceFee, true)}</dd></div>}
            <div className="flex justify-between py-1.5 font-semibold"><dt>Total</dt><dd className="tabular-nums">{fmtTND(qd.total, true)}</dd></div>
          </dl>
        ) : <p className="mt-3 text-[12.5px] text-amber-800">{qd.message}</p>)}
      </Card>
    </div>
  );
}

/* ── 6. Disponibilités ────────────────────────────────────── */
export function AvailabilityTab({ s }: { s: Settings }) {
  return (
    <Card bodyClassName="p-3 sm:p-5">
      <VenueCalendarManager title="Disponibilités" venues={[{ id: s._id, name: s.name }]} />
    </Card>
  );
}

/* ── 8. Réservations ──────────────────────────────────────── */
export function ReservationsTab({ venueId }: { venueId: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-reservations', 'venue', venueId, page, status],
    queryFn: () => fetchReservations({ venueId, page, status: status || undefined, limit: 15, demo: true, sort: 'checkin_desc' }),
  });
  return (
    <Card title="Réservations de la maison" action={
      <select aria-label="Statut" className={cn(selectCls, 'h-8 w-44')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Tous les statuts</option><option value="pending">À confirmer</option><option value="confirmed">Confirmées</option><option value="completed">Terminées</option><option value="cancelled">Annulées</option>
      </select>
    } bodyClassName="px-0 sm:px-0 pb-0">
      {error && <div className="px-4"><ErrorBox error={error} onRetry={() => refetch()} /></div>}
      {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !data?.rows.length ? <EmptyState compact icon={CalendarCheck2} title="Aucune réservation" /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FBFAF8]"><tr><th className={th}>Référence</th><th className={th}>Client</th><th className={th}>Arrivée</th><th className={th}>Départ</th><th className={cn(th, 'text-right')}>Total</th><th className={th}>Statut</th><th className={th}>Créée</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]" onClick={() => setOpenId(r.id)}>
                    <td className={cn(td, 'font-mono text-[12px]')}>{r.reference}</td><td className={td}>{r.guest.name ?? '—'}</td>
                    <td className={td}>{fmtStayDay(r.checkIn)}</td><td className={td}>{fmtStayDay(r.checkOut)}</td>
                    <td className={cn(td, 'text-right font-semibold tabular-nums')}>{fmtTND(r.total)}</td><td className={td}><StatusBadge status={r.status} /></td><td className={cn(td, 'text-[#6B6760]')}>{fmtDay(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} label="réservations" />
        </>
      )}
      <ReservationDrawer id={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </Card>
  );
}

/* ── 9. Propriétaire ──────────────────────────────────────── */
export function OwnerTab({ s, save }: { s: Settings; save: Save }) {
  const owners = useQuery({ queryKey: ['admin-owners'], queryFn: fetchOwners });
  const qc = useQueryClient();
  const current = s.ownerId && typeof s.ownerId === 'object' ? s.ownerId : null;
  const [pick, setPick] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const assign = async (ownerId: string | null) => {
    setBusy(true);
    try {
      if (await save({ ownerId }, ownerId ? 'Propriétaire assigné.' : 'Propriétaire retiré.')) {
        setPick(''); setConfirmRemove(false); qc.invalidateQueries({ queryKey: ['admin-owners'] });
      }
    } finally { setBusy(false); }
  };
  return (
    <Card title="Propriétaire assigné" subtitle="Le propriétaire gère calendrier, réservations et fiche de cette maison uniquement.">
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7E4DD] p-4">
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#F7F1E3] text-[#8A6514]"><UserCheck className="size-5" /></span>
            <span><span className="block text-[14px] font-semibold">{current.fullName}</span><a href={`mailto:${current.email}`} className="text-[12.5px] text-[#8A6514] hover:underline">{current.email}</a></span>
          </span>
          <span className="flex gap-2">
            <Link href={`/admin/owners?owner=${current._id}`} className={button('outline')}>Voir le profil</Link>
            {confirmRemove ? (
              <><button type="button" className={button('danger')} disabled={busy} onClick={() => assign(null)}>{busy && <Spinner />} Confirmer le retrait</button><button type="button" className={button('ghost')} onClick={() => setConfirmRemove(false)}>Annuler</button></>
            ) : <button type="button" className={button('danger')} onClick={() => setConfirmRemove(true)}>Retirer</button>}
          </span>
        </div>
      ) : <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">Aucun propriétaire assigné : les demandes de réservation ne peuvent être confirmées que par un administrateur.</p>}
      {confirmRemove && <p className="mt-2 text-[12px] text-amber-800">Le propriétaire perdra immédiatement l’accès à cette maison et à ses réservations. L’action est enregistrée dans l’historique d’audit.</p>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="o-pick" className={labelCls}>{current ? 'Réassigner à' : 'Assigner à'}</label>
          <select id="o-pick" className={selectCls} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choisir un propriétaire…</option>
            {(owners.data ?? []).filter((o) => o.id !== current?._id).map((o) => <option key={o.id} value={o.id} disabled={!o.isActive}>{o.fullName} — {o.email}{!o.isActive ? ' (suspendu)' : ''}</option>)}
          </select>
        </div>
        <button type="button" className={button('primary')} disabled={!pick || busy} onClick={() => assign(pick)}>{busy && <Spinner />} {current ? 'Réassigner' : 'Assigner'}</button>
      </div>
      <Hint>Pas encore de compte ? <Link href="/admin/owners?new=1" className="font-semibold text-[#8A6514] hover:underline">Inviter un propriétaire</Link>.</Hint>
    </Card>
  );
}
