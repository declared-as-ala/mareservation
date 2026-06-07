'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEventByIdOrSlug } from '@/lib/api/events';
import { fetchAdminVenues } from '@/lib/api/admin';
import { updateAdminEvent } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { ArrowLeft, Save, ExternalLink, Calendar, MapPin, Tag, FileText, Image as ImageIcon, Clock } from 'lucide-react';
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
  isPublished: boolean;
  isVedette: boolean;
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
    coverImage: String(event.coverImage ?? event.afficheImageUrl ?? ''),
    isPublished: Boolean(event.isPublished !== false),
    isVedette: Boolean(event.isVedette),
  };
}

const EVENT_TYPES = [
  'concert', 'standup', 'cinema', 'sport', 'private', 'festival', 'other',
  'DJ', 'CHANTEUR', 'CONCERT', 'SOIREE', 'CINEMA', 'STANDUP', 'SPORTS', 'PRIVATE_EVENT', 'CINEMA_SESSION',
];

export default function AdminEventEditPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventForm | null>(null);

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
      isPublished: payload.isPublished,
      isVedette: payload.isVedette,
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

  if (!id) {
    return (
      <div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-zinc-200">
          <Link href="/admin/events" className="gap-2">
            <ArrowLeft className="size-4" /> Événements
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button 
            type="submit" 
            form="event-form"
            disabled={updateMutation.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
          >
            <Save className="size-4" /> Enregistrer
          </Button>
          <Button variant="outline" asChild className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 gap-2">
            <Link href={`/evenement/${(event as { slug?: string }).slug || id}`} target="_blank">
              <ExternalLink className="size-4" /> Voir la fiche
            </Link>
          </Button>
        </div>
      </div>

      <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Main Info */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4 border-b border-zinc-800">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <FileText className="size-4 text-amber-400" />
              Informations principales
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Titre, type et description de l'événement
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">Titre *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-zinc-300 flex items-center gap-1.5">
                  <Tag className="size-3.5" /> Type
                </Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger id="type" className="border-zinc-700 bg-zinc-800/50 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueId" className="text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> Lieu
                </Label>
                <Select value={form.venueId} onValueChange={(v) => setForm({ ...form, venueId: v })}>
                  <SelectTrigger id="venueId" className="border-zinc-700 bg-zinc-800/50 text-zinc-100">
                    <SelectValue placeholder="Choisir un lieu" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {venueList.map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4 border-b border-zinc-800">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <Calendar className="size-4 text-amber-400" />
              Date et heure
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Période de l'événement
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-zinc-300 flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Début *
                </Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                  required
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt" className="text-zinc-300 flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Fin
                </Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4 border-b border-zinc-800">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <ImageIcon className="size-4 text-amber-400" />
              Image / Affiche
            </CardTitle>
            <CardDescription className="text-zinc-400">
              URL de l'image principale de l'événement
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="coverImage" className="text-zinc-300">URL image / affiche</Label>
              <Input
                id="coverImage"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                placeholder="https://..."
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20 font-mono text-sm"
              />
            </div>
            {form.coverImage && (
              <div className="mt-4 relative h-40 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                <img 
                  src={form.coverImage} 
                  alt="Aperçu" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4 border-b border-zinc-800">
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              Statut et visibilité
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Options de publication et de mise en avant
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/30">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Publié</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {form.isPublished ? 'Visible sur le site' : 'Masqué du site'}
                  </p>
                </div>
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/30">
                <div>
                  <p className="text-sm font-medium text-zinc-200">En vedette</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {form.isVedette ? 'Mis en avant' : 'Non mis en avant'}
                  </p>
                </div>
                <Switch
                  checked={form.isVedette}
                  onCheckedChange={(v) => setForm({ ...form, isVedette: v })}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-zinc-800" />

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" asChild className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 gap-2">
            <Link href={`/evenement/${(event as { slug?: string }).slug || id}`} target="_blank">
              <ExternalLink className="size-4" /> Voir la fiche publique
            </Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
