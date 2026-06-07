'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEventByIdOrSlug } from '@/lib/api/events';
import { fetchAdminVenues, updateAdminEvent, deleteAdminEvent } from '@/lib/api/admin';
import type { AdminEventTicketType } from '@/lib/api/admin';
import { getEventAvailability } from '@/lib/events/availability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { ImageUploadField } from '@/components/admin/shared/ImageUploadField';
import { PanoramaUploadField } from '@/components/admin/shared/PanoramaUploadField';
import { TicketTypesEditor } from '@/components/events/TicketTypesEditor';
import type { TicketDraft } from '@/components/events/TicketTypesEditor';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, ExternalLink, Calendar, MapPin, Tag, FileText,
  ImageIcon, Clock, Loader2, Trash2, Globe2, Sparkles, ChevronRight,
  Images, CheckCircle2, Eye, Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EventForm = {
  venueId: string;
  title: string;
  type: string;
  description: string;
  startAt: string;
  endsAt: string;
  coverImage: string;
  afficheImageUrl: string;
  galleryUrls: string[];
  panoramicImages: string[];
  virtualTourUrl: string;
  isPublished: boolean;
  isVedette: boolean;
  ticketTypes: TicketDraft[];
};

function toForm(event: Record<string, unknown>): EventForm {
  const venueId = event.venueId;
  const venueIdStr = typeof venueId === 'object' && venueId && '_id' in venueId
    ? String((venueId as { _id: string })._id)
    : String(venueId ?? '');
  const startAt = event.startAt ? new Date(event.startAt as string).toISOString().slice(0, 16) : '';
  const endsAt = event.endsAt ? new Date(event.endsAt as string).toISOString().slice(0, 16) : '';
  return {
    venueId: venueIdStr,
    title: String(event.title ?? ''),
    type: String(event.type ?? 'other'),
    description: String(event.description ?? ''),
    startAt,
    endsAt,
    coverImage: String(event.coverImage ?? ''),
    afficheImageUrl: String(event.afficheImageUrl ?? ''),
    galleryUrls: Array.isArray(event.galleryUrls) ? (event.galleryUrls as string[]) : [],
    panoramicImages: Array.isArray(event.panoramicImages) ? (event.panoramicImages as string[]) : [],
    virtualTourUrl: String(event.virtualTourUrl ?? ''),
    isPublished: Boolean(event.isPublished !== false),
    isVedette: Boolean(event.isVedette),
    ticketTypes: Array.isArray(event.ticketTypes) ? (event.ticketTypes as TicketDraft[]) : [],
  };
}

const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'CONCERT', label: 'Concert' },
  { value: 'DJ', label: 'DJ Set' },
  { value: 'CHANTEUR', label: 'Chanteur' },
  { value: 'festival', label: 'Festival' },
  { value: 'SOIREE', label: 'Soirée' },
  { value: 'STANDUP', label: 'Stand-up' },
  { value: 'SPORT', label: 'Sport / Match' },
  { value: 'CINEMA', label: 'Cinéma' },
  { value: 'PRIVATE_EVENT', label: 'Événement privé' },
  { value: 'other', label: 'Autre' },
];

/* ── Section shell ── */
function Section({
  icon: Icon,
  title,
  description,
  accent = 'text-[#D4AF37]',
  children,
}: {
  icon: typeof FileText;
  title: string;
  description?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-start gap-3 border-b border-zinc-800 px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60">
          <Icon className={cn('size-4', accent)} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminEventEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventByIdOrSlug(id),
    enabled: !!id,
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['admin', 'venues'],
    queryFn: () => fetchAdminVenues(),
  });
  const venueList = venues as { _id: string; name: string }[];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (event && typeof event === 'object') setForm(toForm(event as unknown as Record<string, unknown>));
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (payload: EventForm) => updateAdminEvent(id, {
      venueId: payload.venueId,
      title: payload.title,
      type: payload.type,
      description: payload.description,
      startAt: payload.startAt || undefined,
      endsAt: payload.endsAt || undefined,
      coverImage: payload.coverImage || undefined,
      afficheImageUrl: payload.afficheImageUrl || undefined,
      galleryUrls: payload.galleryUrls,
      panoramicImages: payload.panoramicImages,
      virtualTourUrl: payload.virtualTourUrl || undefined,
      hasVirtualTour: payload.panoramicImages.length > 0 || !!payload.virtualTourUrl,
      isPublished: payload.isPublished,
      isVedette: payload.isVedette,
      ticketTypes: payload.ticketTypes
        .filter((t) => t.name.trim() && Number(t.capacity || 0) > 0)
        .map((t) => ({
          _id: t._id,
          name: t.name.trim(),
          price: Number(t.price || 0),
          capacity: Number(t.capacity || 0),
          sold: Number(t.sold || 0),
          maxPerOrder: Number(t.maxPerOrder || 10),
          salesStartAt: t.salesStartAt || undefined,
          salesEndAt: t.salesEndAt || undefined,
          isActive: t.isActive !== false,
        })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Événement mis à jour.');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la mise à jour.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) updateMutation.mutate(form);
  };

  async function handleDelete() {
    if (!confirm(`Supprimer l'événement "${form?.title ?? 'cet événement'}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await deleteAdminEvent(id);
      toast.success('Événement supprimé.');
      router.push('/admin/events');
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-400">ID manquant.</p>
        <Button asChild><Link href="/admin/events">Retour</Link></Button>
      </div>
    );
  }

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !event) {
    return (
      <div className="space-y-4">
        <ErrorState onRetry={() => refetch()} />
        <Button variant="outline" asChild><Link href="/admin/events">Liste des événements</Link></Button>
      </div>
    );
  }

  if (!form) return <DetailPageSkeleton />;

  const slug = (event as { slug?: string }).slug || id;
  const avail = getEventAvailability(form.ticketTypes);
  const heroImage = form.coverImage || form.afficheImageUrl;
  // Ensure the current type is selectable even if it's not in the curated list.
  const typeOptions = EVENT_TYPE_OPTIONS.some((o) => o.value === form.type)
    ? EVENT_TYPE_OPTIONS
    : [{ value: form.type, label: form.type }, ...EVENT_TYPE_OPTIONS];

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Slim sticky nav */}
      <div className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#080808]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-2.5">
          <Link href="/admin/events">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-zinc-400 hover:text-white">
              <ArrowLeft className="size-4" /> Événements
            </Button>
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <ChevronRight className="size-3.5 text-zinc-600" />
          <span className="truncate text-sm font-medium text-zinc-300">{form.title || 'Événement'}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/evenement/${slug}`} target="_blank">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-zinc-700 text-xs text-zinc-300 hover:text-white">
                <Eye className="size-3.5" /> Aperçu
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 gap-1.5 rounded-lg border-red-600/50 text-xs text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Supprimer
            </Button>
            <Button
              size="sm"
              type="submit"
              form="event-form"
              disabled={updateMutation.isPending}
              className="h-8 gap-1.5 rounded-lg bg-[#D4AF37] text-xs font-semibold text-black hover:bg-[#c9a227]"
            >
              {updateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Enregistrer
            </Button>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="relative">
        <div className="relative h-40 w-full overflow-hidden sm:h-52">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={form.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-900/40 via-zinc-900 to-[#080808]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/70 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 mx-auto -mt-14 max-w-5xl px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md',
                form.isPublished
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-600 bg-zinc-800/80 text-zinc-300'
              )}
            >
              {form.isPublished ? <><CheckCircle2 className="size-2.5" /> Publié</> : <><Clock className="size-2.5" /> Brouillon</>}
            </span>
            {form.isVedette && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#D4AF37] backdrop-blur-md">
                <Sparkles className="size-2.5" /> Vedette
              </span>
            )}
            {(form.panoramicImages.length > 0 || form.virtualTourUrl) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300 backdrop-blur-md">
                <Globe2 className="size-2.5" /> Visite 360°
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white drop-shadow sm:text-3xl">
            {form.title || 'Événement sans titre'}
          </h1>
          {avail.hasTickets && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {avail.isSoldOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300 backdrop-blur-md">
                  SOLD OUT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
                  {avail.remaining} / {avail.totalCapacity} billets restants
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/60 px-3 py-1 text-[11px] text-zinc-300 backdrop-blur-md">
                <Ticket className="size-3" />
                {avail.percentSold}% vendu
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form id="event-form" onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        {/* Main info */}
        <Section icon={FileText} title="Informations principales" description="Titre, type, lieu et description">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs text-zinc-400">Titre *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-[#D4AF37]/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-zinc-400"><Tag className="size-3.5" /> Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900">
                    {typeOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-zinc-400"><MapPin className="size-3.5" /> Lieu</Label>
                <Select value={form.venueId} onValueChange={(v) => setForm({ ...form, venueId: v })}>
                  <SelectTrigger className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Choisir un lieu" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900">
                    {venueList.map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs text-zinc-400">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
                placeholder="Décrivez l'événement, la programmation, les artistes…"
              />
            </div>
          </div>
        </Section>

        {/* Date & time */}
        <Section icon={Calendar} title="Date et heure" description="Période de l'événement">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startAt" className="flex items-center gap-1.5 text-xs text-zinc-400"><Clock className="size-3.5" /> Début *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                required
                className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-[#D4AF37]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsAt" className="flex items-center gap-1.5 text-xs text-zinc-400"><Clock className="size-3.5" /> Fin</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-[#D4AF37]/50"
              />
            </div>
          </div>
        </Section>

        {/* Media — real uploads */}
        <Section icon={ImageIcon} title="Visuels" description="Uploadez les images — affiche, couverture et galerie">
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageUploadField
              label="Affiche (portrait)"
              value={form.afficheImageUrl}
              onChange={(url) => setForm({ ...form, afficheImageUrl: url })}
              aspect="aspect-[3/4]"
              hint="Format portrait recommandé"
            />
            <ImageUploadField
              label="Image de couverture (paysage)"
              value={form.coverImage}
              onChange={(url) => setForm({ ...form, coverImage: url })}
              aspect="aspect-video"
              hint="Format paysage 16:9"
            />
          </div>

          {/* Gallery */}
          <div className="mt-6">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Images className="size-3.5" /> Galerie ({form.galleryUrls.length})
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.galleryUrls.map((url, i) => (
                <div key={`${url}-${i}`} className="group relative aspect-video overflow-hidden rounded-lg border border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Galerie ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, galleryUrls: form.galleryUrls.filter((_, idx) => idx !== i) })}
                    aria-label="Supprimer"
                    className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-all hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              <ImageUploadField
                value=""
                onChange={(url) => url && setForm({ ...form, galleryUrls: [...form.galleryUrls, url] })}
                aspect="aspect-video"
              />
            </div>
          </div>
        </Section>

        {/* Billetterie */}
        <Section icon={Ticket} title="Billetterie" description="Catégories de billets, prix et stock">
          <TicketTypesEditor
            value={form.ticketTypes}
            onChange={(next) => setForm({ ...form, ticketTypes: next })}
          />
        </Section>

        {/* 360° view */}
        <Section icon={Globe2} title="Visite 360°" description="Vue immersive de la salle / scène — glissez pour pivoter" accent="text-purple-400">
          <PanoramaUploadField
            images={form.panoramicImages}
            onChange={(images) => setForm({ ...form, panoramicImages: images })}
          />
          <div className="mt-5 space-y-1.5">
            <Label htmlFor="virtualTourUrl" className="text-xs text-zinc-400">
              Ou lien de visite virtuelle externe (Klapty / Matterport)
            </Label>
            <Input
              id="virtualTourUrl"
              value={form.virtualTourUrl}
              onChange={(e) => setForm({ ...form, virtualTourUrl: e.target.value })}
              placeholder="https://my.matterport.com/show/?m=…"
              className="rounded-xl border-zinc-700 bg-zinc-900 font-mono text-sm text-zinc-100 focus:border-purple-500/50"
            />
          </div>
        </Section>

        {/* Status */}
        <Section icon={CheckCircle2} title="Statut et visibilité" description="Publication et mise en avant" accent="text-emerald-400">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">Publié</p>
                <p className="mt-0.5 text-xs text-zinc-500">{form.isPublished ? 'Visible sur le site' : 'Masqué du site'}</p>
              </div>
              <Switch
                checked={form.isPublished}
                onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">En vedette</p>
                <p className="mt-0.5 text-xs text-zinc-500">{form.isVedette ? 'Mis en avant sur l\'accueil' : 'Non mis en avant'}</p>
              </div>
              <Switch
                checked={form.isVedette}
                onCheckedChange={(v) => setForm({ ...form, isVedette: v })}
                className="data-[state=checked]:bg-[#D4AF37]"
              />
            </div>
          </div>
        </Section>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" type="button" asChild className="gap-2 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white">
            <Link href={`/evenement/${slug}`} target="_blank">
              <ExternalLink className="size-4" /> Voir la fiche publique
            </Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} className="gap-2 rounded-xl bg-[#D4AF37] font-semibold text-black hover:bg-[#c9a227]">
            {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
