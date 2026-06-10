'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2, Plus, Trash2, Save, Star, Pencil, X, Check, CalendarDays, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageUploadField } from '@/components/admin/shared/ImageUploadField';
import { cn } from '@/lib/utils';
import { updateAdminVenue, fetchAdminVenueScenes, fetchAdminReservations } from '@/lib/api/admin';
import { fetchAdminVenueMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/api/menu';
import type { MenuItem } from '@/lib/api/types';
import { buildTablePlacementApis, buildUnitPlacementApis } from '@/lib/admin/venuePlacementApis';

const Panorama360Editor = dynamic(
  () => import('@/components/dashboard/Panorama360Editor').then((m) => ({ default: m.Panorama360Editor })),
  { ssr: false, loading: () => <SectionLoader /> }
);
const VirtualTourBuilder = dynamic(
  () => import('@/components/admin/hotel/VirtualTourBuilder').then((m) => ({ default: m.VirtualTourBuilder })),
  { ssr: false, loading: () => <SectionLoader /> }
);

export interface SectionProps {
  venue: any;
  venueId: string;
  onRefresh: () => void;
}

function SectionLoader() {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-zinc-400">
      <Loader2 className="size-5 animate-spin" /> <span className="text-sm">Chargement…</span>
    </div>
  );
}

const input = 'rounded-xl border-zinc-700 bg-zinc-900 text-white focus:border-amber-400/50';
const labelCls = 'mb-1.5 block text-xs text-zinc-400';

/* ───────────────────────── Infos ───────────────────────── */
export function InfoSection({ venue, venueId, onRefresh }: SectionProps) {
  const [form, setForm] = useState({
    name: venue.name ?? '',
    shortDescription: venue.shortDescription ?? '',
    description: venue.description ?? '',
    city: venue.city ?? '',
    governorate: venue.governorate ?? '',
    address: venue.address ?? '',
    phone: venue.phone ?? '',
    startingPrice: venue.startingPrice ?? 0,
    priceRangeMin: venue.priceRangeMin ?? 0,
    priceRangeMax: venue.priceRangeMax ?? 0,
    isPublished: venue.isPublished ?? false,
    isFeatured: venue.isFeatured ?? venue.isVedette ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) return toast.error('Nom requis.');
    setSaving(true);
    try {
      await updateAdminVenue(venueId, form as any);
      toast.success('Établissement mis à jour.');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Informations générales</p>
        <div>
          <Label className={labelCls}>Nom *</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} className={input} />
        </div>
        <div>
          <Label className={labelCls}>Courte description</Label>
          <Input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className={input} placeholder="Une phrase d'accroche…" />
        </div>
        <div>
          <Label className={labelCls}>Description</Label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 focus:border-amber-400/50 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className={labelCls}>Ville</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} className={input} /></div>
          <div><Label className={labelCls}>Gouvernorat</Label><Input value={form.governorate} onChange={(e) => set('governorate', e.target.value)} className={input} /></div>
        </div>
        <div><Label className={labelCls}>Adresse</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} className={input} /></div>
        <div><Label className={labelCls}>Téléphone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={input} placeholder="+216 …" /></div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tarification</p>
        <div className="grid grid-cols-3 gap-4">
          {([['startingPrice', 'Prix à partir de (DT)'], ['priceRangeMin', 'Prix min (DT)'], ['priceRangeMax', 'Prix max (DT)']] as const).map(([k, l]) => (
            <div key={k}>
              <Label className={labelCls}>{l}</Label>
              <Input type="number" min={0} value={(form as any)[k]} onChange={(e) => set(k, parseFloat(e.target.value) || 0)} className={input} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
        {([['isPublished', 'Publié', 'Visible sur le site'], ['isFeatured', 'En vedette', 'Mis en avant']] as const).map(([k, l, d]) => (
          <div key={k} className="flex items-center justify-between p-4">
            <div><p className="text-sm font-medium text-zinc-200">{l}</p><p className="text-xs text-zinc-500">{d}</p></div>
            <Switch checked={(form as any)[k]} onCheckedChange={(v) => set(k, v)} className="data-[state=checked]:bg-amber-500" />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-xl bg-[#D4AF37] px-6 font-semibold text-black hover:bg-[#c9a227]">
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Sauvegarde…</> : <><Save className="mr-2 size-4" /> Enregistrer</>}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Photos ───────────────────────── */
export function MediaSection({ venue, venueId, onRefresh }: SectionProps) {
  const [cover, setCover] = useState<string>(venue.coverImage ?? '');
  const [gallery, setGallery] = useState<string[]>(Array.isArray(venue.gallery) ? venue.gallery : []);
  const [saving, setSaving] = useState(false);

  async function persist(next: { coverImage?: string; gallery?: string[] }) {
    setSaving(true);
    try {
      await updateAdminVenue(venueId, { coverImage: next.coverImage ?? cover, gallery: next.gallery ?? gallery } as any);
      onRefresh();
    } catch {
      toast.error('Erreur lors de la sauvegarde des médias.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Photo de couverture {saving && <Loader2 className="ml-1 inline size-3 animate-spin" />}</p>
        <ImageUploadField value={cover} onChange={(url) => { setCover(url); persist({ coverImage: url }); }} aspect="aspect-[16/9]" hint="Image principale affichée sur la fiche" />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Galerie ({gallery.length})</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative aspect-video overflow-hidden rounded-xl border border-zinc-700">
              <Image src={url} alt={`photo ${i + 1}`} fill className="object-cover" sizes="200px" />
              <button type="button" onClick={() => { const next = gallery.filter((_, idx) => idx !== i); setGallery(next); persist({ gallery: next }); }}
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-all hover:bg-red-500/80 group-hover:opacity-100">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <ImageUploadField value="" onChange={(url) => { if (url) { const next = [...gallery, url]; setGallery(next); persist({ gallery: next }); } }} aspect="aspect-video" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Menu ───────────────────────── */
const MENU_CATEGORIES: { value: string; label: string }[] = [
  { value: 'entree', label: 'Entrées' },
  { value: 'plat', label: 'Plats' },
  { value: 'dessert', label: 'Desserts' },
  { value: 'boisson', label: 'Boissons' },
  { value: 'autre', label: 'Autres' },
];

export function MenuSection({ venueId }: SectionProps) {
  const { data: items = [], refetch, isLoading } = useQuery({ queryKey: ['admin-menu', venueId], queryFn: () => fetchAdminVenueMenu(venueId) });
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const it of items) (map[it.category] ??= []).push(it);
    return map;
  }, [items]);

  const saveMut = useMutation({
    mutationFn: async (data: Partial<MenuItem>) => {
      if (data._id) return updateMenuItem(data._id, data);
      return createMenuItem({ ...data, venueId } as any);
    },
    onSuccess: () => { toast.success('Plat enregistré.'); setEditing(null); refetch(); },
    onError: () => toast.error('Erreur.'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => { toast.success('Plat supprimé.'); refetch(); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-300">{items.length} plat{items.length !== 1 ? 's' : ''} au menu</p>
        <Button size="sm" onClick={() => setEditing({ category: 'plat', price: 0, isAvailable: true, isPopular: false } as any)}
          className="h-8 rounded-xl bg-[#D4AF37] text-xs font-semibold text-black hover:bg-[#c9a227]"><Plus className="mr-1.5 size-3.5" /> Ajouter un plat</Button>
      </div>

      {isLoading ? <SectionLoader /> : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 py-14 text-center text-sm text-zinc-500">Aucun plat. Ajoutez votre première entrée.</div>
      ) : (
        <div className="space-y-6">
          {MENU_CATEGORIES.filter((c) => grouped[c.value]?.length).map((c) => (
            <div key={c.value}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400/80">{c.label}</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {grouped[c.value].map((it) => (
                  <div key={it._id} className="group flex items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                        {it.isPopular && <Star className="size-3 fill-amber-400 text-amber-400" />}{it.name}
                        {!it.isAvailable && <span className="rounded bg-zinc-800 px-1.5 text-[9px] text-zinc-500">indispo.</span>}
                      </p>
                      {it.description && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{it.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-bold text-amber-300">{it.price} DT</span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setEditing(it)} className="flex size-6 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-white"><Pencil className="size-3" /></button>
                        <button onClick={() => delMut.mutate(it._id)} className="flex size-6 items-center justify-center rounded-md border border-zinc-700 text-red-400/70 hover:text-red-400"><Trash2 className="size-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{editing._id ? 'Modifier le plat' : 'Nouveau plat'}</h3>
              <button onClick={() => setEditing(null)} className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400"><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <div><Label className={labelCls}>Nom *</Label><Input value={editing.name ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, name: e.target.value }))} className={input} /></div>
              <div><Label className={labelCls}>Description</Label><Input value={editing.description ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, description: e.target.value }))} className={input} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className={labelCls}>Prix (DT)</Label><Input type="number" min={0} value={editing.price ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, price: parseFloat(e.target.value) || 0 }))} className={input} /></div>
                <div>
                  <Label className={labelCls}>Catégorie</Label>
                  <select value={editing.category ?? 'plat'} onChange={(e) => setEditing((p) => ({ ...p!, category: e.target.value as any }))}
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-[#161616] px-3 text-sm text-white [color-scheme:dark]">
                    {MENU_CATEGORIES.map((c) => <option key={c.value} value={c.value} className="bg-[#161616]">{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={editing.isPopular ?? false} onChange={(e) => setEditing((p) => ({ ...p!, isPopular: e.target.checked }))} className="size-4 accent-amber-400" /> Populaire</label>
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={editing.isAvailable ?? true} onChange={(e) => setEditing((p) => ({ ...p!, isAvailable: e.target.checked }))} className="size-4 accent-amber-400" /> Disponible</label>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1 rounded-xl border-zinc-700 text-zinc-400">Annuler</Button>
              <Button onClick={() => editing.name?.trim() ? saveMut.mutate(editing) : toast.error('Nom requis.')} disabled={saveMut.isPending}
                className="flex-1 rounded-xl bg-[#D4AF37] font-semibold text-black hover:bg-[#c9a227]">
                {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="mr-1.5 size-4" /> Enregistrer</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Tables / Espaces (360 placement) ───────────────────────── */
export function TablesSection({ venueId }: SectionProps) {
  const apis = useMemo(() => buildTablePlacementApis(), []);
  return <Panorama360Editor venueId={venueId} mode="tables" api={apis} />;
}
export function SpacesSection({ venueId }: SectionProps) {
  const apis = useMemo(() => buildUnitPlacementApis(), []);
  return <Panorama360Editor venueId={venueId} mode="units" api={apis} />;
}

/* ───────────────────────── Visite 360° (tour builder) ───────────────────────── */
export function TourSection({ venueId }: SectionProps) {
  const { data: tour, refetch, isLoading } = useQuery({ queryKey: ['admin-venue-tour', venueId], queryFn: () => fetchAdminVenueScenes(venueId) });
  if (isLoading) return <SectionLoader />;
  return (
    <VirtualTourBuilder venueId={venueId} initialScenes={tour?.scenes ?? []} initialHotspots={tour?.hotspots ?? []} onUpdated={() => refetch()} />
  );
}

/* ───────────────────────── Réservations ───────────────────────── */
export function ReservationsSection({ venueId }: SectionProps) {
  const { data: all = [], isLoading } = useQuery({ queryKey: ['admin-reservations'], queryFn: () => fetchAdminReservations() });
  const rows = (all as any[]).filter((r) => {
    const v = r.venueId; return (typeof v === 'object' ? v?._id : v) === venueId;
  });
  if (isLoading) return <SectionLoader />;
  if (rows.length === 0) return <div className="rounded-2xl border-2 border-dashed border-zinc-800 py-14 text-center text-sm text-zinc-500">Aucune réservation pour cet établissement.</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-zinc-800 bg-zinc-900/80">{['Client', 'Date', 'Statut', 'Total'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.slice(0, 50).map((r, i) => (
            <tr key={r._id ?? i} className="hover:bg-zinc-900/50">
              <td className="px-4 py-3 text-zinc-200">{[r.customerFirstName, r.customerLastName].filter(Boolean).join(' ') || '—'}</td>
              <td className="px-4 py-3 text-xs text-zinc-400"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-zinc-600" />{r.startAt ? new Date(r.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
              <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', String(r.status).toLowerCase().includes('confirm') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400')}>{r.status}</span></td>
              <td className="px-4 py-3 font-semibold text-amber-300">{r.totalPrice ? `${r.totalPrice} DT` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Placeholder for categories whose dedicated section isn't built yet. */
export function PlaceholderSection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 py-16 text-center">
      <MapPin className="size-8 text-zinc-600" />
      <p className="text-sm font-semibold text-zinc-300">{label}</p>
      <p className="text-xs text-zinc-500">Cette section arrive bientôt.</p>
    </div>
  );
}
