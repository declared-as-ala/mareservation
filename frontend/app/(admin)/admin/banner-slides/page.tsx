'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminBannerSlides,
  createAdminBannerSlide,
  updateAdminBannerSlide,
  deleteAdminBannerSlide,
  type AdminBannerSlide,
} from '@/lib/api/admin';
import { uploadImageFile } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, Plus, Pencil, Trash2, Upload, Eye, Monitor, Smartphone, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  titleFr: '',
  subtitleFr: '',
  imageUrlDesktop: '',
  imageUrlMobile: '',
  ctaLabelFr: 'Réserver',
  ctaUrl: '/explorer',
  sortOrder: 0,
  isActive: true,
};

function SlideThumbnail({ slide, size = 'sm' }: { slide: AdminBannerSlide; size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-32 w-56' : 'h-16 w-24';
  
  return (
    <div className={`relative ${dimensions} rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0`}>
      {slide.imageUrlDesktop || slide.imageUrlMobile ? (
        <>
          <Image
            src={slide.imageUrlDesktop || slide.imageUrlMobile || ''}
            alt={slide.titleFr}
            fill
            className="object-cover"
            sizes={size === 'lg' ? '224px' : '96px'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Device indicator */}
          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
            <div className="size-5 rounded bg-black/60 flex items-center justify-center">
              <Monitor className="size-3 text-zinc-300" />
            </div>
            {slide.imageUrlMobile && (
              <div className="size-5 rounded bg-black/60 flex items-center justify-center">
                <Smartphone className="size-3 text-zinc-300" />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="size-full flex flex-col items-center justify-center text-zinc-600 gap-1">
          <ImageIcon className="size-5" />
          <span className="text-[10px]">Pas d'image</span>
        </div>
      )}
    </div>
  );
}

export default function AdminBannerSlidesPage() {
  const queryClient = useQueryClient();
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['admin', 'banner-slides'],
    queryFn: fetchAdminBannerSlides,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'banner-slides'] });
    queryClient.invalidateQueries({ queryKey: ['banner-slides'] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: slides.length });
    setDialogOpen(true);
  };

  const openEdit = (s: AdminBannerSlide) => {
    setEditingId(s._id);
    setForm({
      titleFr: s.titleFr ?? '',
      subtitleFr: s.subtitleFr ?? '',
      imageUrlDesktop: s.imageUrlDesktop ?? '',
      imageUrlMobile: s.imageUrlMobile ?? '',
      ctaLabelFr: s.ctaLabelFr ?? 'Réserver',
      ctaUrl: s.ctaUrl ?? '/explorer',
      sortOrder: s.sortOrder ?? 0,
      isActive: s.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateAdminBannerSlide(editingId, form);
        toast.success('Slide mis à jour.');
      } else {
        await createAdminBannerSlide({
          ...form,
          titleFr: form.titleFr,
          imageUrlDesktop: form.imageUrlDesktop,
        });
        toast.success('Slide créé.');
      }
      invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce slide ?')) return;
    setDeletingId(id);
    try {
      await deleteAdminBannerSlide(id);
      toast.success('Slide supprimé.');
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (field: 'imageUrlDesktop' | 'imageUrlMobile', file: File) => {
    const setUploading = field === 'imageUrlDesktop' ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success('Photo envoyée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bannières</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Button 
          onClick={openCreate}
          className="bg-amber-500 text-black hover:bg-amber-400 transition-all duration-200"
        >
          <Plus className="size-4 mr-2" />
          Ajouter un slide
        </Button>
      </div>

      {/* Slides List */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <ImageIcon className="size-4 text-amber-400" />
            Slides du hero
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Images affichées dans le carrousel de la page d'accueil
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-zinc-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-16 w-24 rounded-lg bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 bg-zinc-800" />
                    <Skeleton className="h-3 w-60 bg-zinc-800" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <div className="size-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <ImageIcon className="size-8" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Aucun slide</p>
              <p className="text-xs mt-1 text-zinc-500">Les slides configurés apparaîtront ici</p>
              <Button onClick={openCreate} className="mt-4">
                <Plus className="size-4 mr-2" />
                Ajouter un slide
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {slides.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((s) => (
                <div key={s._id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors duration-150 group">
                  <SlideThumbnail slide={s} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-100 truncate">{s.titleFr}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 ${s.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}
                      >
                        {s.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {s.subtitleFr && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{s.subtitleFr}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <ArrowUpDown className="size-2.5" />
                        Ordre: {s.sortOrder}
                      </span>
                      {s.ctaLabelFr && (
                        <span>CTA: {s.ctaLabelFr}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEdit(s)} 
                      className="size-8 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                      aria-label={`Modifier ${s.titleFr}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s._id)}
                      disabled={deletingId === s._id}
                      className="size-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      aria-label={`Supprimer ${s.titleFr}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900 max-h-[90vh] overflow-y-auto" aria-describedby="banner-slide-form-desc">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? 'Modifier le slide' : 'Nouveau slide'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingId ? 'Modifiez les informations de ce slide' : 'Créez un nouveau slide pour le carrousel'}
            </DialogDescription>
          </DialogHeader>
          <p id="banner-slide-form-desc" className="sr-only">
            Formulaire pour créer ou modifier un slide de bannière affiché sur la page d'accueil.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="titleFr" className="text-zinc-300">Titre *</Label>
                <Input
                  id="titleFr"
                  value={form.titleFr}
                  onChange={(e) => setForm((f) => ({ ...f, titleFr: e.target.value }))}
                  required
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitleFr" className="text-zinc-300">Sous-titre</Label>
                <Input
                  id="subtitleFr"
                  value={form.subtitleFr}
                  onChange={(e) => setForm((f) => ({ ...f, subtitleFr: e.target.value }))}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Images */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="imageUrlDesktop" className="text-zinc-300 flex items-center gap-1.5">
                  <Monitor className="size-3.5" /> Image desktop *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrlDesktop"
                    type="url"
                    placeholder="URL ou upload ci-dessous"
                    value={form.imageUrlDesktop}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrlDesktop: e.target.value }))}
                    required
                    className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload('imageUrlDesktop', file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => desktopInputRef.current?.click()}
                    disabled={uploadingDesktop}
                    className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800"
                    title="Envoyer une photo"
                    aria-label="Envoyer une photo pour l'image desktop"
                  >
                    {uploadingDesktop ? <Upload className="size-4 animate-pulse" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                {form.imageUrlDesktop && (
                  <div className="mt-2 relative h-24 rounded-lg overflow-hidden border border-zinc-700">
                    <Image src={form.imageUrlDesktop} alt="Preview" fill className="object-cover" sizes="400px" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrlMobile" className="text-zinc-300 flex items-center gap-1.5">
                  <Smartphone className="size-3.5" /> Image mobile (optionnel)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrlMobile"
                    type="url"
                    placeholder="URL ou upload ci-dessous"
                    value={form.imageUrlMobile}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrlMobile: e.target.value }))}
                    className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload('imageUrlMobile', file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => mobileInputRef.current?.click()}
                    disabled={uploadingMobile}
                    className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800"
                    title="Envoyer une photo"
                    aria-label="Envoyer une photo pour l'image mobile"
                  >
                    {uploadingMobile ? <Upload className="size-4 animate-pulse" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                {form.imageUrlMobile && (
                  <div className="mt-2 relative h-24 rounded-lg overflow-hidden border border-zinc-700">
                    <Image src={form.imageUrlMobile} alt="Preview" fill className="object-cover" sizes="400px" />
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaLabelFr" className="text-zinc-300">Texte du bouton</Label>
                <Input
                  id="ctaLabelFr"
                  value={form.ctaLabelFr}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabelFr: e.target.value }))}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl" className="text-zinc-300">URL du bouton</Label>
                <Input
                  id="ctaUrl"
                  value={form.ctaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Order & Active */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="text-zinc-300">Ordre d'affichage</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/30 mt-6">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Actif</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {form.isActive ? 'Visible sur le site' : 'Masqué du site'}
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
