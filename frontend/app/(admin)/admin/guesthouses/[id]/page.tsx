'use client';

import { Suspense, useCallback, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Eye, EyeOff, Home, PauseCircle, PlayCircle } from 'lucide-react';
import { fetchPropertySettings, savePropertySettings } from '@/lib/api/admin-console';
import { ErrorBox, PageHeader, PUBLIC_STATE, Skeleton, Spinner, StatusBadge, button, fmtDateTime } from '@/components/admin/console/ui';
import {
  AvailabilityTab, GalleryTab, GeneralTab, LocationTab, OwnerTab, PricingTab, ReservationsTab, RoomsTab, type Settings,
} from '@/components/admin/console/guesthouse/tabs';
import { TourTab } from '@/components/admin/console/guesthouse/TourTab';
import { cn } from '@/lib/utils';

const TABS = [
  ['general', 'Général'], ['location', 'Localisation'], ['gallery', 'Galerie photos'], ['rooms', 'Chambres & capacité'], ['pricing', 'Tarifs & réservation'],
  ['availability', 'Disponibilités'], ['tour', 'Visite virtuelle 360°'], ['reservations', 'Réservations'], ['owner', 'Propriétaire'],
] as const;
type TabKey = (typeof TABS)[number][0];

function publicState(s: Settings) {
  if (s.approvalStatus === 'suspended') return 'suspended';
  if (s.isPublished === false || (s.approvalStatus && s.approvalStatus !== 'approved')) return s.approvalStatus === 'pending_review' ? 'pending_review' : 'draft';
  return 'published';
}

function EditorInner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const tab = (TABS.find(([k]) => k === sp.get('tab'))?.[0] ?? 'general') as TabKey;
  const [busy, setBusy] = useState<string | null>(null);

  const { data: s, isLoading, error, refetch } = useQuery({ queryKey: ['admin-guesthouse', id], queryFn: () => fetchPropertySettings(id) as Promise<Settings> });

  const save = useCallback(async (patch: Record<string, unknown>, okMsg = 'Modifications enregistrées.') => {
    if (!Object.keys(patch).length) return true;
    try {
      await savePropertySettings(id, patch);
      toast.success(okMsg);
      await qc.invalidateQueries({ queryKey: ['admin-guesthouse', id] });
      qc.invalidateQueries({ queryKey: ['admin-guesthouses'] });
      qc.invalidateQueries({ queryKey: ['admin-properties'] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
      return false;
    }
  }, [id, qc]);

  const setTab = (k: TabKey) => router.replace(`${pathname}?tab=${k}`, { scroll: false });
  const act = async (key: string, patch: Record<string, unknown>, msg: string) => { setBusy(key); try { await save(patch, msg); } finally { setBusy(null); } };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-10" /><Skeleton className="h-96" /></div>;
  if (error || !s) return <ErrorBox error={error ?? new Error('Maison introuvable.')} onRetry={() => refetch()} />;

  const state = publicState(s);
  const cover = s.coverImage || s.gallery?.[0];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: 'Maisons d’hôtes', href: '/admin/guesthouses' }, { label: s.name }]}
        title={
          <span className="flex items-center gap-3">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
            ) : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#F1EFEA] text-[#9A968D]"><Home className="size-5" /></span>}
            <span className="min-w-0 truncate">{s.name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={state} map={PUBLIC_STATE} />
            {s.isDemo && <span className="rounded bg-[#F1EFEA] px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-[#6B6760]">Démo</span>}
            <span>{[s.city, s.governorate].filter(Boolean).join(' · ')}</span>
            {s.updatedAt && <span className="text-[#9A968D]">· modifiée {fmtDateTime(s.updatedAt)}</span>}
          </span>
        }
        actions={
          <>
            {s.slug && (
              <a href={`/maison-d-hote/${s.slug}`} target="_blank" rel="noopener noreferrer" className={button('outline')}>
                Aperçu public <ExternalLink className="size-3.5" />
              </a>
            )}
            {state === 'suspended' ? (
              <button type="button" className={button('outline')} disabled={!!busy} onClick={() => act('reactivate', { approvalStatus: 'approved', isPublished: false }, 'Maison réactivée (non publiée).')}>
                {busy === 'reactivate' ? <Spinner /> : <PlayCircle className="size-4" />} Réactiver
              </button>
            ) : (
              <button type="button" className={button('ghost', 'text-red-700')} disabled={!!busy} onClick={() => act('suspend', { approvalStatus: 'suspended' }, 'Maison suspendue — retirée du site.')}>
                {busy === 'suspend' ? <Spinner /> : <PauseCircle className="size-4" />} Suspendre
              </button>
            )}
            {state === 'published' ? (
              <button type="button" className={button('outline')} disabled={!!busy} onClick={() => act('unpublish', { isPublished: false }, 'Maison dépubliée.')}>
                {busy === 'unpublish' ? <Spinner /> : <EyeOff className="size-4" />} Dépublier
              </button>
            ) : state !== 'suspended' && (
              <button type="button" className={button('primary')} disabled={!!busy} onClick={() => act('publish', { isPublished: true, approvalStatus: 'approved' }, 'Maison publiée.')}>
                {busy === 'publish' ? <Spinner /> : <Eye className="size-4" />} Publier
              </button>
            )}
          </>
        }
      />

      <div className="sticky top-14 z-20 -mx-4 border-b border-[#E7E4DD] bg-[#F8F7F4]/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Sections de la fiche" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} aria-controls={`panel-${k}`} id={`tab-${k}`} onClick={() => setTab(k)}
              className={cn('h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors', tab === k ? 'border-[#C99628] text-[#171717]' : 'border-transparent text-[#6B6760] hover:text-[#171717]')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'general' && <GeneralTab s={s} save={save} />}
        {tab === 'location' && <LocationTab s={s} save={save} />}
        {tab === 'gallery' && <GalleryTab s={s} save={save} />}
        {tab === 'rooms' && <RoomsTab s={s} save={save} venueId={id} refetch={() => refetch()} />}
        {tab === 'pricing' && <PricingTab s={s} save={save} />}
        {tab === 'availability' && <AvailabilityTab s={s} />}
        {tab === 'tour' && <TourTab s={s} save={save} />}
        {tab === 'reservations' && <ReservationsTab venueId={id} />}
        {tab === 'owner' && <OwnerTab s={s} save={save} />}
      </div>
    </div>
  );
}

export default function GuesthouseEditorPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><EditorInner /></Suspense>;
}
