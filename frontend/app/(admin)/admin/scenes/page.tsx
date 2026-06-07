'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Loader2,
  X,
  MapPin,
  Check,
  AlertCircle,
} from 'lucide-react';
import { fetchScenes, createScene, updateScene, deleteScene } from '@/lib/api/scenes';
import { apiGetRaw } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Scene } from '@/lib/api/types';

/* ------------------------------------------------------------------ */
/* Venue selector                                                        */
/* ------------------------------------------------------------------ */
interface VenueOption { _id: string; name: string; slug?: string; }

function useVenues() {
  return useQuery({
    queryKey: ['admin-venues-light'],
    queryFn: async () => {
      const data = await apiGetRaw<VenueOption[]>('/admin/venues?limit=200&fields=name,slug');
      return Array.isArray(data) ? data : [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Scene card                                                            */
/* ------------------------------------------------------------------ */
function SceneCard({ scene, venueId }: { scene: Scene; venueId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(scene.name);
  const [description, setDescription] = useState(scene.description ?? '');
  const [image, setImage] = useState(scene.image);
  const [imageError, setImageError] = useState(false);

  const updateMut = useMutation({
    mutationFn: (body: Partial<{ name: string; description: string; image: string; order: number; isActive: boolean }>) =>
      updateScene(scene._id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', venueId] });
      toast.success('Scène mise à jour.');
      setEditing(false);
    },
    onError: () => toast.error('Erreur.'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteScene(scene._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', venueId] });
      toast.success('Scène supprimée.');
    },
  });

  const handleDelete = () => {
    if (confirm('Supprimer cette scène ?')) {
      deleteMut.mutate();
    }
  };

  return (
    <Card className="group border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-all duration-200">
      {/* Image preview */}
      <div className="relative aspect-[2/1] bg-zinc-800 overflow-hidden">
        {scene.image && !imageError ? (
          <>
            <Image 
              src={scene.image} 
              alt={scene.name} 
              fill 
              className="object-cover transition-transform duration-300 group-hover:scale-105" 
              sizes="600px"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />
          </>
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-zinc-600 gap-2">
            <ImageIcon className="size-12" />
            <span className="text-xs">Pas d'image</span>
          </div>
        )}
        
        {/* Status badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-black/60 text-zinc-300 border-black/40 text-xs font-mono">
            #{scene.order}
          </Badge>
          {!scene.isActive && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              Inactive
            </Badge>
          )}
        </div>
        
        {/* Quick actions overlay */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => updateMut.mutate({ isActive: !scene.isActive })}
            className="size-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors border border-white/10"
            title={scene.isActive ? 'Désactiver' : 'Activer'}
            aria-label={scene.isActive ? 'Désactiver la scène' : 'Activer la scène'}
          >
            {scene.isActive
              ? <Eye className="size-4 text-emerald-400" />
              : <EyeOff className="size-4 text-zinc-400" />}
          </button>
          <button
            onClick={handleDelete}
            className="size-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-colors border border-white/10"
            title="Supprimer"
            aria-label="Supprimer la scène"
          >
            <Trash2 className="size-4 text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Info / edit */}
      <CardContent className="p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Nom</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 h-9" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Description</Label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 h-9" 
                placeholder="Optionnel" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">URL image 360°</Label>
              <Input 
                value={image} 
                onChange={(e) => setImage(e.target.value)} 
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 font-mono text-sm h-9" 
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => updateMut.mutate({ name, description, image })}
                disabled={updateMut.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-8 gap-1.5"
              >
                {updateMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                <Check className="size-3.5" />
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-200 h-8">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100">{scene.name}</p>
                {scene.description && <p className="text-zinc-500 text-xs mt-0.5">{scene.description}</p>}
                {scene.image && (
                  <p className="text-zinc-600 text-xs mt-1 font-mono truncate">{scene.image}</p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEditing(true)} 
                className="text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 h-8 shrink-0"
              >
                Éditer
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <Label className="text-zinc-500 text-xs">Ordre :</Label>
              <input
                type="number"
                defaultValue={scene.order}
                onBlur={(e) => updateMut.mutate({ order: Number(e.target.value) })}
                className="w-16 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-300 text-xs focus:border-amber-500 focus:outline-none"
                aria-label="Ordre d'affichage"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Create form                                                           */
/* ------------------------------------------------------------------ */
function CreateSceneForm({ venueId, onDone }: { venueId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [order, setOrder] = useState(0);
  const [imageError, setImageError] = useState(false);

  const mut = useMutation({
    mutationFn: () => createScene({ venueId, name, description, image, order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', venueId] });
      toast.success('Scène créée.');
      onDone();
    },
    onError: () => toast.error('Erreur lors de la création.'),
  });

  return (
    <Card className="border-amber-500/30 bg-zinc-900/50">
      <CardHeader className="pb-4 border-b border-zinc-800">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <Plus className="size-4 text-amber-400" />
          Nouvelle scène
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Créez une nouvelle scène 360° pour ce lieu
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Nom *</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Salle principale" 
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Description</Label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Optionnel" 
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20" 
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-zinc-300">URL image 360° (equirectangular, 2:1) *</Label>
            <Input 
              value={image} 
              onChange={(e) => setImage(e.target.value)} 
              placeholder="https://..." 
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 font-mono text-sm" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Ordre d'affichage</Label>
            <Input 
              type="number" 
              value={order} 
              onChange={(e) => setOrder(Number(e.target.value))} 
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 w-24" 
            />
          </div>
        </div>
        
        {image && (
          <div className="mt-4">
            <Label className="text-zinc-300 text-xs mb-2 block">Aperçu</Label>
            <div className="rounded-xl overflow-hidden border border-zinc-700 aspect-[2/1] relative bg-zinc-800">
              <Image 
                src={image} 
                alt="preview" 
                fill 
                className="object-cover" 
                sizes="600px" 
                onError={() => setImageError(true)}
              />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="size-8" />
                    <span className="text-xs">Impossible de charger l'image</span>
                  </div>
                </div>
              )}
              {!imageError && (
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-zinc-300 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Aperçu 360°
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
          <Button
            onClick={() => mut.mutate()}
            disabled={!name.trim() || !image.trim() || mut.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
          >
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer la scène
          </Button>
          <Button variant="ghost" onClick={onDone} className="text-zinc-400 hover:text-zinc-200">
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */
export default function AdminScenesPage() {
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: venues = [], isLoading: venuesLoading } = useVenues();

  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['scenes', selectedVenueId],
    queryFn: () => fetchScenes(selectedVenueId),
    enabled: !!selectedVenueId && selectedVenueId !== 'none',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="size-6 text-amber-400" />
            Scènes 360°
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gérez les scènes 360° de vos lieux. Chaque scène = une pièce / zone.
          </p>
        </div>
        {selectedVenueId && selectedVenueId !== 'none' && (
          <Button
            onClick={() => setShowCreate((v) => !v)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
          >
            <Plus className="size-4" />
            {showCreate ? 'Fermer' : 'Nouvelle scène'}
          </Button>
        )}
      </div>

      {/* Venue picker */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <MapPin className="size-4 text-amber-400" />
            Sélectionner un lieu
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Choisissez le lieu pour gérer ses scènes 360°
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Select 
            value={selectedVenueId} 
            onValueChange={(v) => { setSelectedVenueId(v); setShowCreate(false); }}
          >
            <SelectTrigger className="h-10 border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20">
              <SelectValue placeholder="Choisir un lieu" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="none">— Choisir un lieu —</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {venuesLoading && (
            <div className="flex items-center gap-2 mt-3 text-zinc-500 text-xs">
              <Loader2 className="size-3 animate-spin" />
              Chargement des lieux…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create form */}
      {showCreate && selectedVenueId && (
        <CreateSceneForm venueId={selectedVenueId} onDone={() => setShowCreate(false)} />
      )}

      {/* Scenes grid */}
      {selectedVenueId && selectedVenueId !== 'none' && (
        scenesLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border-zinc-800 bg-zinc-900/50">
                <div className="aspect-[2/1] bg-zinc-800 animate-pulse rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scenes.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <div className="size-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Layers className="size-8" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">Aucune scène pour ce lieu</p>
              <p className="text-zinc-500 text-sm mb-4">Créez votre première scène 360°</p>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
              >
                <Plus className="size-4" /> Créer une scène
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">
                {scenes.length} scène{scenes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <SceneCard key={scene._id} scene={scene} venueId={selectedVenueId} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
