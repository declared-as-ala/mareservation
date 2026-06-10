'use client';

import { useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ChevronRight, Eye, Trash2, Loader2, Building2, CheckCircle2,
  Clock, Crown, MapPin, Globe2, DollarSign, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { deleteAdminVenue } from '@/lib/api/admin';
import { getVenueHref } from '@/lib/venueHref';
import { VENUE_CATEGORY_CONFIG, type VenueCategoryKey, type SectionKey } from '@/lib/admin/venueCategories';
import {
  InfoSection, MediaSection, MenuSection, TablesSection, SpacesSection,
  TourSection, ReservationsSection, EventsSection, type SectionProps,
} from './VenueSections';

const SECTIONS: Record<SectionKey, ComponentType<SectionProps>> = {
  infos: InfoSection,
  photos: MediaSection,
  menu: MenuSection,
  tables: TablesSection,
  spaces: SpacesSection,
  tour: TourSection,
  reservations: ReservationsSection,
  events: EventsSection,
};

export function VenueAdminShell({ venueId, category }: { venueId: string; category: VenueCategoryKey }) {
  const router = useRouter();
  const config = VENUE_CATEGORY_CONFIG[category];
  const [active, setActive] = useState<SectionKey>(config.tabs[0].key);
  const [deleting, setDeleting] = useState(false);

  const { data: venue, isLoading, refetch } = useQuery({
    queryKey: ['admin-venue', venueId],
    queryFn: () => fetchVenueByIdOrSlug(venueId),
    enabled: !!venueId,
  });

  async function handleDelete() {
    if (!confirm(`Supprimer "${venue?.name ?? 'cet établissement'}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await deleteAdminVenue(venueId);
      toast.success('Établissement supprimé.');
      router.push('/admin/venues');
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#080808]"><Loader2 className="size-8 animate-spin text-[#D4AF37]" /></div>;
  }
  if (!venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#080808]">
        <AlertCircle className="size-12 text-zinc-600" />
        <p className="text-zinc-400">Établissement introuvable.</p>
        <Button onClick={() => router.push('/admin/venues')} variant="outline" className="rounded-xl border-zinc-700 text-zinc-400">Retour à la liste</Button>
      </div>
    );
  }

  const v = venue as any;
  const CatIcon = config.Icon;
  const ActiveSection = SECTIONS[active];
  const location = [v.address, v.city, v.governorate].filter(Boolean).join(', ') || '—';

  const stats = [
    { label: 'Statut', value: v.isPublished ? 'Publié' : 'Brouillon', Icon: CheckCircle2, text: v.isPublished ? 'text-emerald-400' : 'text-zinc-400', accent: 'bg-emerald-500/20' },
    { label: 'Catégorie', value: config.label, Icon: CatIcon, text: config.accentText, accent: config.accentBg },
    { label: 'Visite 360°', value: v.hasVirtualTour ? 'Active' : 'Non', Icon: Globe2, text: v.hasVirtualTour ? 'text-purple-400' : 'text-zinc-500', accent: 'bg-purple-500/20' },
    { label: 'Prix départ', value: v.startingPrice ? `${v.startingPrice} DT` : '—', Icon: DollarSign, text: 'text-[#D4AF37]', accent: 'bg-[#D4AF37]/20' },
  ];

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Slim sticky nav */}
      <div className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#080808]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-2.5">
          <Link href="/admin/venues">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-zinc-400 hover:text-white"><ArrowLeft className="size-4" /> Lieux</Button>
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <ChevronRight className="size-3.5 text-zinc-600" />
          <span className="truncate text-sm font-medium text-zinc-300">{v.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={getVenueHref(v)} target="_blank">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-zinc-700 text-xs text-zinc-300 hover:text-white"><Eye className="size-3.5" /> Aperçu</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleting}
              className="h-8 gap-1.5 rounded-lg border-red-600/50 text-xs text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300">
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative">
        <div className="relative h-44 w-full overflow-hidden sm:h-56">
          {v.coverImage ? <Image src={v.coverImage} alt={v.name} fill priority className="object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#080808]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/70 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-6 lg:px-8">
          <div className="flex items-end gap-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 bg-zinc-900 shadow-2xl sm:size-28">
              {v.coverImage ? <Image src={v.coverImage} alt={v.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center"><Building2 className="size-8 text-zinc-600" /></div>}
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md', v.isPublished ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-zinc-600 bg-zinc-800/80 text-zinc-300')}>
                  {v.isPublished ? <><CheckCircle2 className="size-2.5" /> Publié</> : <><Clock className="size-2.5" /> Brouillon</>}
                </span>
                <span className={cn('inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md', config.accentBg, config.accentText)}>
                  <CatIcon className="size-2.5" /> {config.label}
                </span>
                {(v.isFeatured || v.isVedette) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#D4AF37] backdrop-blur-md"><Crown className="size-2.5" /> Vedette</span>
                )}
              </div>
              <h1 className="mt-1.5 text-2xl font-bold leading-tight text-white drop-shadow sm:text-3xl">{v.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300"><MapPin className="size-3.5 text-zinc-500" />{location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mx-auto mt-6 max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, Icon, text, accent }) => (
            <div key={label} className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className={cn('absolute -right-5 -top-5 size-16 rounded-full blur-2xl', accent)} />
              <div className="relative flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60"><Icon className={cn('size-5', text)} /></div>
                <div><p className={cn('text-lg font-bold leading-none', text)}>{value}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + content */}
      <div className="mx-auto max-w-7xl p-6 lg:px-8 lg:pb-12 lg:pt-8">
        <div className="no-scrollbar mb-6 inline-flex h-11 w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5 sm:w-auto">
          {config.tabs.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setActive(key)}
              className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all',
                active === key ? 'bg-[#D4AF37] font-semibold text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-400 hover:text-zinc-200')}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        <ActiveSection venue={v} venueId={venueId} onRefresh={() => refetch()} />
      </div>
    </div>
  );
}
