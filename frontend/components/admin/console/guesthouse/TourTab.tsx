'use client';

/**
 * Visite virtuelle 360° — light editor.
 *  · Live preview of what visitors see now (external link, or the multi-scene tour).
 *  · Source: an external tour link (Spinview360…) OR uploaded 360° images (scenes). Only one is public at a time:
 *    the public page shows the link when set, otherwise the scenes.
 *  · Scenes: add (upload or image URL), rename, reorder, start scene, delete; navigation points placed by clicking
 *    on the panorama (stored as x/y % → yaw/pitch by the server).
 */
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, ExternalLink, Flag, ImagePlus, Link2, MapPin, Pencil, Plus, Trash2, Upload, View, X,
} from 'lucide-react';
import {
  createAdminSceneHotspot, createAdminVenueScene, deleteAdminSceneHotspot, deleteAdminVenueScene, fetchAdminVenueScenes, updateAdminVenueScene,
  type AdminHotelScene, type AdminSceneHotspot,
} from '@/lib/api/admin';
import { uploadImageWithProgress } from '@/lib/api/admin-console';
import { TourViewer } from '@/components/exploria/TourViewer';
import { Card, EmptyState, ErrorBox, Modal, Skeleton, Spinner, button, inputCls, labelCls, selectCls } from '../ui';
import { cn } from '@/lib/utils';
import type { Save, Settings } from './tabs';

const PanoramaTourViewer = dynamic(() => import('@/components/immersive/PanoramaTourViewer').then((m) => m.PanoramaTourViewer), {
  ssr: false,
  loading: () => <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-[#F1EFEA]" />,
});

const isHttps = (u: string) => /^https:\/\/\S+$/.test(u.trim());
const isImageUrl = (u: string) => /^(https:\/\/|\/(?!\/))\S+$/.test(u.trim());

/** Reads width/height of a local file or URL (for the 2:1 equirectangular check). */
function imageSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function TourTab({ s, save }: { s: Settings; save: Save }) {
  const scenesQ = useQuery({ queryKey: ['admin-venue-scenes', s._id], queryFn: () => fetchAdminVenueScenes(s._id) });
  const scenes = useMemo(() => [...(scenesQ.data?.scenes ?? [])].sort((a, b) => a.order - b.order), [scenesQ.data]);
  const hotspots = scenesQ.data?.hotspots ?? [];
  const hasLink = !!s.immersiveUrl;
  const [mode, setMode] = useState<'link' | 'images'>(hasLink || !scenes.length ? (hasLink ? 'link' : 'images') : 'images');
  useEffect(() => { if (!scenesQ.isLoading) setMode(s.immersiveUrl ? 'link' : 'images'); }, [s.immersiveUrl, scenesQ.isLoading]);
  const [url, setUrl] = useState(s.immersiveUrl ?? '');
  useEffect(() => setUrl(s.immersiveUrl ?? ''), [s.immersiveUrl]);
  const [savingUrl, setSavingUrl] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pointsFor, setPointsFor] = useState<AdminHotelScene | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const refresh = async () => { await scenesQ.refetch(); setPreviewKey((k) => k + 1); };

  const live: 'link' | 'scenes' | 'none' = hasLink ? 'link' : scenes.length ? 'scenes' : 'none';
  const isPublic = s.isPublished !== false && (s.approvalStatus ?? 'approved') === 'approved';

  const saveUrl = async (value: string | null, msg: string) => {
    setSavingUrl(true);
    try { if (await save({ immersiveUrl: value }, msg)) setPreviewKey((k) => k + 1); } finally { setSavingUrl(false); }
  };

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <Card
        title="Visite actuelle"
        subtitle={live === 'link' ? 'Visite externe — telle qu’elle apparaît sur la fiche' : live === 'scenes' ? `Visite Exploria360 · ${scenes.length} scène${scenes.length > 1 ? 's' : ''}` : 'Aucune visite publiée pour cette maison'}
        action={s.slug && live !== 'none' && (
          <a href={`/maison-d-hote/${s.slug}#visite`} target="_blank" rel="noopener noreferrer" className={button('outline', 'h-8')}>Voir sur la fiche <ExternalLink className="size-3.5" /></a>
        )}
      >
        {scenesQ.isLoading ? <Skeleton className="aspect-[16/9] w-full" /> : live === 'link' ? (
          <div key={previewKey} className="on-dark overflow-hidden rounded-xl ring-1 ring-[#E7E4DD]">
            <TourViewer url={s.immersiveUrl} title={`Visite 360° — ${s.name}`} posterLabel={s.name} posterImage={s.coverImage ?? null} />
          </div>
        ) : live === 'scenes' ? (
          <div key={previewKey} className="on-dark overflow-hidden rounded-xl ring-1 ring-[#E7E4DD]">
            <PanoramaTourViewer scenes={scenes as any} hotspots={hotspots as any} title={`Visite 360° — ${s.name}`} />
          </div>
        ) : (
          <EmptyState compact icon={View} title="Pas encore de visite 360°" text="Ajoutez un lien de visite ou des images 360° ci-dessous." />
        )}
        {!isPublic && live !== 'none' && <p className="mt-2 text-[12px] text-amber-800">La fiche n’est pas publiée : la visite n’est visible ici et dans l’aperçu qu’en interne.</p>}
      </Card>

      {/* Source */}
      <Card title="Source de la visite" subtitle="Une seule source est affichée publiquement : le lien s’il est renseigné, sinon les images 360°.">
        <div role="radiogroup" aria-label="Source de la visite" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ['link', Link2, 'Lien de visite', 'Spinview360, Matterport… intégré tel quel'],
            ['images', ImagePlus, 'Images 360°', 'Vos panoramas, avec points de navigation'],
          ] as const).map(([k, Icon, l, d]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
              className={cn('flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors', mode === k ? 'border-[#C99628] bg-[#FBF6EA]' : 'border-[#E7E4DD] hover:bg-[#FBFAF8]')}>
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', mode === k ? 'bg-[#C99628] text-[#171717]' : 'bg-[#F1EFEA] text-[#6B6760]')}><Icon className="size-4" /></span>
              <span>
                <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#171717]">{l}
                  {(k === 'link' ? live === 'link' : live === 'scenes') && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-800 ring-1 ring-emerald-200">EN LIGNE</span>}
                </span>
                <span className="text-[12px] text-[#6B6760]">{d}</span>
              </span>
            </button>
          ))}
        </div>

        {mode === 'link' ? (
          <div className="mt-4">
            <label htmlFor="t-url" className={labelCls}>Lien de la visite (https)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="t-url" type="url" inputMode="url" className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://spinview360.com/…" />
              <button type="button" className={button('primary')} disabled={!isHttps(url) || savingUrl || url.trim() === (s.immersiveUrl ?? '')}
                onClick={() => saveUrl(url.trim(), 'Lien de visite enregistré — il est affiché sur la fiche.')}>
                {savingUrl && <Spinner />} {hasLink ? 'Mettre à jour' : 'Publier ce lien'}
              </button>
            </div>
            {url && !isHttps(url) && <p className="mt-1 text-[12px] text-red-700">Le lien doit commencer par https://</p>}
            <p className="mt-1.5 text-[11.5px] text-[#8A867E]">Les scènes et points d’intérêt d’une visite externe se modifient chez le fournisseur (Spinview…), pas ici.</p>
            {hasLink && (
              <button type="button" className={button('ghost', 'mt-2 px-0 text-red-700')} disabled={savingUrl}
                onClick={() => saveUrl(null, scenes.length ? 'Lien retiré — les images 360° sont maintenant affichées.' : 'Lien retiré.')}>
                <X className="size-4" /> Retirer le lien{scenes.length ? ' (afficher les images 360°)' : ''}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {hasLink && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
                <span>Le lien de visite est actuellement affiché. Vos images 360° ne seront visibles qu’après l’avoir retiré.</span>
                {confirmSwitch ? (
                  <span className="flex gap-2">
                    <button type="button" className={button('dark', 'h-8')} disabled={savingUrl} onClick={async () => { await saveUrl(null, 'Les images 360° sont maintenant affichées.'); setConfirmSwitch(false); }}>{savingUrl && <Spinner />} Confirmer</button>
                    <button type="button" className={button('ghost', 'h-8')} onClick={() => setConfirmSwitch(false)}>Annuler</button>
                  </span>
                ) : <button type="button" className={button('outline', 'h-8')} disabled={!scenes.length} onClick={() => setConfirmSwitch(true)}>Afficher les images à la place</button>}
              </div>
            )}
            {scenesQ.error ? <ErrorBox error={scenesQ.error} onRetry={() => scenesQ.refetch()} /> : (
              <SceneList venueId={s._id} scenes={scenes} hotspots={hotspots} onChanged={refresh} onAdd={() => setAddOpen(true)} onPoints={setPointsFor} />
            )}
          </div>
        )}
      </Card>

      <AddSceneModal open={addOpen} onOpenChange={setAddOpen} venueId={s._id} nextOrder={scenes.length} onAdded={refresh} />
      {pointsFor && <PointsModal scene={pointsFor} scenes={scenes} hotspots={hotspots} venueId={s._id} onClose={() => setPointsFor(null)} onChanged={refresh} />}
    </div>
  );
}

/* ── scenes list ─────────────────────────────────────────── */
function SceneList({ venueId, scenes, hotspots, onChanged, onAdd, onPoints }: {
  venueId: string; scenes: AdminHotelScene[]; hotspots: AdminSceneHotspot[]; onChanged: () => void; onAdd: () => void; onPoints: (s: AdminHotelScene) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const m = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: () => onChanged(), onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.') });
  // Persist a full, dense order (0..n-1) so "start scene" is always order 0.
  const reorder = (from: number, to: number) => m.mutate(async () => {
    const list = [...scenes];
    const [it] = list.splice(from, 1);
    list.splice(to, 0, it);
    await Promise.all(list.map((sc, i) => (sc.order !== i ? updateAdminVenueScene(sc._id, { order: i }) : null)));
  });

  if (!scenes.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#E7E4DD] bg-[#FBFAF8]">
        <EmptyState compact icon={ImagePlus} title="Aucune image 360°" text="Ajoutez une photo panoramique équirectangulaire (format 2:1) par pièce : salon, chambres, terrasse…"
          action={<button type="button" className={button('primary')} onClick={onAdd}><Plus className="size-4" /> Ajouter une image 360°</button>} />
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[#6B6760]">{scenes.length} scène{scenes.length > 1 ? 's' : ''} · la première est la scène de départ</p>
        <button type="button" className={button('primary', 'h-8')} onClick={onAdd}><Plus className="size-4" /> Ajouter une image</button>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenes.map((sc, i) => {
          const points = hotspots.filter((h) => h.virtualTourId === sc._id).length;
          return (
            <li key={sc._id} className={cn('overflow-hidden rounded-xl border bg-white', i === 0 ? 'border-[#C99628] ring-1 ring-[#C99628]' : 'border-[#E7E4DD]')}>
              <div className="relative aspect-[2/1] bg-[#F1EFEA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sc.image} alt={`Panorama ${sc.name}`} loading="lazy" className="size-full object-cover" />
                <span className="absolute left-2 top-2 flex gap-1">
                  {i === 0 && <span className="inline-flex items-center gap-1 rounded-md bg-[#C99628] px-1.5 py-0.5 text-[10.5px] font-bold text-[#171717]"><Flag className="size-3" /> Départ</span>}
                  <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#171717]">{points} point{points > 1 ? 's' : ''}</span>
                </span>
              </div>
              <div className="space-y-2 p-3">
                {renaming === sc._id ? (
                  <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (name.trim()) m.mutate(async () => { await updateAdminVenueScene(sc._id, { name: name.trim() }); setRenaming(null); toast.success('Scène renommée.'); }); }}>
                    <input aria-label="Nom de la scène" autoFocus className={cn(inputCls, 'h-8')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                    <button type="submit" className={button('primary', 'h-8 px-2.5')} disabled={m.isPending}>OK</button>
                    <button type="button" className={button('ghost', 'h-8 w-8 px-0')} onClick={() => setRenaming(null)} aria-label="Annuler"><X className="size-4" /></button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-[#171717]">{sc.name}</p>
                    <button type="button" className={button('ghost', 'h-7 w-7 px-0')} onClick={() => { setRenaming(sc._id); setName(sc.name); }} aria-label={`Renommer ${sc.name}`}><Pencil className="size-3.5" /></button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" className={button('outline', 'h-8 px-2.5')} onClick={() => onPoints(sc)} disabled={scenes.length < 2} title={scenes.length < 2 ? 'Ajoutez une deuxième scène pour créer des points de navigation' : undefined}>
                    <MapPin className="size-3.5" /> Points de navigation
                  </button>
                  <span className="ml-auto flex">
                    <button type="button" className={button('ghost', 'h-8 w-8 px-0')} disabled={i === 0 || m.isPending} onClick={() => reorder(i, i - 1)} aria-label="Monter"><ArrowUp className="size-3.5" /></button>
                    <button type="button" className={button('ghost', 'h-8 w-8 px-0')} disabled={i === scenes.length - 1 || m.isPending} onClick={() => reorder(i, i + 1)} aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
                    {i !== 0 && <button type="button" className={button('ghost', 'h-8 w-8 px-0')} disabled={m.isPending} onClick={() => reorder(i, 0)} aria-label="Définir comme scène de départ" title="Scène de départ"><Flag className="size-3.5" /></button>}
                    <button type="button" className={button('ghost', 'h-8 w-8 px-0 text-red-700')} onClick={() => setConfirmDel(sc._id)} aria-label={`Supprimer ${sc.name}`}><Trash2 className="size-3.5" /></button>
                  </span>
                </div>
                {confirmDel === sc._id && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-[12px] text-red-800">
                    <span>Supprimer « {sc.name} » et ses points ?</span>
                    <span className="flex gap-1">
                      <button type="button" className={button('danger', 'h-7 px-2')} disabled={m.isPending} onClick={() => m.mutate(async () => { await deleteAdminVenueScene(sc._id); setConfirmDel(null); toast.success('Scène supprimée.'); })}>Supprimer</button>
                      <button type="button" className={button('ghost', 'h-7 px-2')} onClick={() => setConfirmDel(null)}>Non</button>
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11.5px] text-[#8A867E]">Les modifications des scènes sont publiées immédiatement. Points « photo » et « lien externe » : pas encore disponibles.</p>
    </>
  );
}

/* ── add scene modal ─────────────────────────────────────── */
function AddSceneModal({ open, onOpenChange, venueId, nextOrder, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; venueId: string; nextOrder: number; onAdded: () => void }) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState('');
  const [ratio, setRatio] = useState<{ w: number; h: number } | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reset = () => { setName(''); setFile(null); setPreview(null); setImgUrl(''); setRatio(null); setPct(null); setTab('upload'); };
  useEffect(() => { if (!open) reset(); }, [open]);
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error('Formats acceptés : JPEG, PNG, WebP.');
    const u = URL.createObjectURL(f);
    setFile(f); setPreview(u); setRatio(await imageSize(u));
    if (!name) setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60));
  };
  useEffect(() => {
    if (tab !== 'url' || !isImageUrl(imgUrl)) { if (tab === 'url') setRatio(null); return; }
    let alive = true;
    imageSize(imgUrl.trim()).then((r) => alive && setRatio(r));
    return () => { alive = false; };
  }, [imgUrl, tab]);

  const eq = ratio ? Math.abs(ratio.w / ratio.h - 2) < 0.05 : null;
  const source = tab === 'upload' ? preview : isImageUrl(imgUrl) ? imgUrl.trim() : null;
  const canSave = !!name.trim() && (tab === 'upload' ? !!file : isImageUrl(imgUrl)) && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      // 360° panoramas are uploaded at full resolution (no client downscale).
      const image = tab === 'upload' ? await uploadImageWithProgress(file!, setPct, { resize: false }) : imgUrl.trim();
      const scene = await createAdminVenueScene(venueId, { name: name.trim(), image });
      if (nextOrder > 0 && scene?._id) await updateAdminVenueScene(scene._id, { order: nextOrder });
      toast.success('Image 360° ajoutée.');
      onOpenChange(false);
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ajout impossible.');
    } finally { setBusy(false); setPct(null); }
  };

  return (
    <Modal open={open} onOpenChange={(o) => !busy && onOpenChange(o)} size="lg" title="Ajouter une image 360°"
      description="Photo panoramique équirectangulaire (ratio 2:1), prise avec un appareil 360° ou exportée d’un logiciel d’assemblage."
      footer={<><button type="button" className={button('ghost')} onClick={() => onOpenChange(false)} disabled={busy}>Annuler</button><button type="button" className={button('primary')} disabled={!canSave} onClick={submit}>{busy && <Spinner />} {busy && pct != null ? `Envoi ${pct} %` : 'Ajouter la scène'}</button></>}>
      <div className="space-y-4">
        <div role="tablist" className="inline-flex rounded-lg border border-[#E7E4DD] bg-[#FBFAF8] p-0.5">
          {([['upload', Upload, 'Téléverser'], ['url', Link2, 'Depuis une URL']] as const).map(([k, Icon, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold', tab === k ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6B6760] hover:text-[#171717]')}><Icon className="size-3.5" /> {l}</button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
            className="overflow-hidden rounded-xl border-2 border-dashed border-[#E7E4DD] bg-[#FBFAF8]"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Aperçu du panorama" className="aspect-[2/1] w-full object-cover" />
            ) : (
              <button type="button" onClick={() => input.current?.click()} className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-[#F7F1E3] text-[#8A6514]"><ImagePlus className="size-5" /></span>
                <span className="text-[13px] font-medium text-[#171717]">Glissez le panorama ici ou cliquez pour choisir</span>
                <span className="text-[12px] text-[#8A867E]">JPEG, PNG ou WebP · envoyé en pleine résolution</span>
              </button>
            )}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="sc-url" className={labelCls}>URL de l’image (https ou /chemin)</label>
            <input id="sc-url" className={inputCls} value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://res.cloudinary.com/…/panorama.jpg" />
            {source && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={source} alt="Aperçu du panorama" className="aspect-[2/1] w-full rounded-xl object-cover ring-1 ring-[#E7E4DD]" />
            )}
          </div>
        )}
        {preview && tab === 'upload' && <button type="button" className={button('ghost', 'px-0')} onClick={() => input.current?.click()}>Choisir une autre image</button>}
        {ratio && (
          <p className={cn('rounded-lg px-3 py-2 text-[12px]', eq ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>
            {ratio.w} × {ratio.h} px — {eq ? 'format équirectangulaire 2:1 ✓' : 'ce n’est pas un panorama 2:1 : l’image sera déformée dans la visite.'}
          </p>
        )}
        <div>
          <label htmlFor="sc-name" className={labelCls}>Nom de la pièce</label>
          <input id="sc-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Salon, Chambre 1, Terrasse…" maxLength={80} />
        </div>
        {pct != null && <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EFEA]"><div className="h-full bg-[#C99628] transition-[width]" style={{ width: `${pct}%` }} /></div>}
      </div>
    </Modal>
  );
}

/* ── navigation points modal ─────────────────────────────── */
function PointsModal({ scene, scenes, hotspots, venueId, onClose, onChanged }: {
  scene: AdminHotelScene; scenes: AdminHotelScene[]; hotspots: AdminSceneHotspot[]; venueId: string; onClose: () => void; onChanged: () => void;
}) {
  const mine = hotspots.filter((h) => h.virtualTourId === scene._id);
  const others = scenes.filter((x) => x._id !== scene._id);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState(others[0]?._id ?? '');
  const [label, setLabel] = useState('');
  const m = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: () => onChanged(), onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.') });
  useEffect(() => { const t = others.find((o) => o._id === target); setLabel(t ? `Aller à : ${t.name}` : ''); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPending({ x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) });
  };
  const nameOf = (id: string) => scenes.find((x) => x._id === id)?.name ?? '—';

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} size="xl" title={`Points de navigation — ${scene.name}`}
      description="Cliquez sur le panorama à l’endroit où le visiteur doit pouvoir passer dans une autre pièce (une porte, un couloir…), puis choisissez la destination."
      footer={<button type="button" className={button('outline')} onClick={onClose}>Terminé</button>}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <div role="button" tabIndex={0} aria-label="Panorama — cliquez pour placer un point" onClick={place} onKeyDown={(e) => e.key === 'Enter' && setPending({ x: 50, y: 50 })}
            className="relative cursor-crosshair overflow-hidden rounded-xl ring-1 ring-[#E7E4DD]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scene.image} alt={`Panorama ${scene.name}`} className="block aspect-[2/1] w-full select-none object-cover" draggable={false} />
            {mine.map((h) => (
              <span key={h._id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}>
                <span className="grid size-7 place-items-center rounded-full bg-[#C99628] text-[#171717] shadow-[0_0_0_4px_rgba(201,150,40,0.35)]"><MapPin className="size-3.5" /></span>
              </span>
            ))}
            {pending && (
              <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pending.x}%`, top: `${pending.y}%` }}>
                <span className="grid size-8 animate-pulse place-items-center rounded-full bg-white text-[#8A6514] shadow-[0_0_0_5px_rgba(255,255,255,0.5)] ring-2 ring-[#C99628]"><Plus className="size-4" /></span>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] text-[#8A867E]">Vue à plat du panorama : le bord gauche et le bord droit se rejoignent dans la visite.</p>
        </div>

        <div className="space-y-4">
          {pending ? (
            <div className="space-y-3 rounded-xl border border-[#C99628] bg-[#FBF6EA] p-3">
              <p className="text-[12.5px] font-semibold text-[#171717]">Nouveau point</p>
              <div>
                <label htmlFor="pt-target" className={labelCls}>Mène vers</label>
                <select id="pt-target" className={selectCls} value={target} onChange={(e) => setTarget(e.target.value)}>{others.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}</select>
              </div>
              <div>
                <label htmlFor="pt-label" className={labelCls}>Libellé</label>
                <input id="pt-label" className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
              </div>
              <div className="flex gap-2">
                <button type="button" className={button('primary', 'flex-1')} disabled={!target || !label.trim() || m.isPending}
                  onClick={() => m.mutate(async () => { await createAdminSceneHotspot({ venueId, sceneId: scene._id, targetSceneId: target, label: label.trim(), xPercent: pending.x, yPercent: pending.y } as any); setPending(null); toast.success('Point ajouté.'); })}>
                  {m.isPending && <Spinner />} Enregistrer
                </button>
                <button type="button" className={button('ghost')} onClick={() => setPending(null)}>Annuler</button>
              </div>
            </div>
          ) : <p className="rounded-xl bg-[#FBFAF8] p-3 text-[12.5px] text-[#4A4740]">Cliquez sur l’image pour placer un nouveau point.</p>}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Points de cette scène ({mine.length})</p>
            {!mine.length ? <p className="text-[12.5px] text-[#9A968D]">Aucun point pour l’instant.</p> : (
              <ul className="divide-y divide-[#F1EFEA] rounded-xl border border-[#E7E4DD]">
                {mine.map((h) => (
                  <li key={h._id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                    <span className="min-w-0"><span className="block truncate font-medium text-[#171717]">{h.label}</span><span className="text-[#8A867E]">→ {nameOf(h.targetId)}</span></span>
                    <button type="button" className={button('ghost', 'h-7 w-7 px-0 text-red-700')} disabled={m.isPending} aria-label={`Supprimer le point ${h.label}`}
                      onClick={() => m.mutate(async () => { await deleteAdminSceneHotspot(h._id); toast.success('Point supprimé.'); })}><Trash2 className="size-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
