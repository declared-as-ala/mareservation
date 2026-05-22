'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImagePlus, Loader2, Trash2, Star, Upload, GripVertical, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  uploadOwnerVenueCover,
  appendOwnerVenueGalleryImage,
  removeOwnerVenueGalleryImage,
  patchOwnerVenueMedia,
} from '@/lib/api/owner-media';

interface MediaManagerProps {
  venueId: string;
  coverImage?: string;
  gallery?: string[];
  /** Called after any successful change so the parent can refresh its state. */
  onChange?: (next: { coverImage?: string; gallery: string[] }) => void;
  className?: string;
}

/**
 * Drag-and-drop venue media manager — cover + gallery.
 * Upload (multi-file + drop), preview grid, set-as-cover, delete, and
 * drag-to-reorder. Wraps `lib/api/owner-media.ts`.
 */
export function MediaManager({
  venueId,
  coverImage,
  gallery = [],
  onChange,
  className,
}: MediaManagerProps) {
  const [cover, setCover] = useState<string | undefined>(coverImage);
  const [images, setImages] = useState<string[]>(gallery);
  const [coverBusy, setCoverBusy] = useState(false);
  const [uploading, setUploading] = useState(0); // count of files in flight
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function emit(next: { coverImage?: string; gallery: string[] }) {
    onChange?.(next);
  }

  // ── Cover ────────────────────────────────────────────────────────────────
  async function handleCover(file: File | undefined) {
    if (!file) return;
    setCoverBusy(true);
    try {
      const url = await uploadOwnerVenueCover(venueId, file);
      setCover(url);
      emit({ coverImage: url, gallery: images });
      toast.success('Image de couverture mise à jour');
    } catch {
      toast.error("Échec de l'envoi de la couverture");
    } finally {
      setCoverBusy(false);
    }
  }

  // ── Gallery upload (multi-file) ──────────────────────────────────────────
  async function handleGalleryFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setUploading(imgs.length);
    let current = images;
    try {
      for (const file of imgs) {
        const { gallery: next } = await appendOwnerVenueGalleryImage(venueId, current, file);
        current = next;
        setImages(next);
        setUploading((n) => n - 1);
      }
      emit({ coverImage: cover, gallery: current });
      toast.success(`${imgs.length} photo${imgs.length > 1 ? 's' : ''} ajoutée${imgs.length > 1 ? 's' : ''}`);
    } catch {
      toast.error("Échec de l'envoi d'une photo");
    } finally {
      setUploading(0);
    }
  }

  async function handleRemove(url: string) {
    const prev = images;
    const next = images.filter((u) => u !== url);
    setImages(next);
    try {
      await removeOwnerVenueGalleryImage(venueId, prev, url);
      emit({ coverImage: cover, gallery: next });
    } catch {
      setImages(prev);
      toast.error('Échec de la suppression');
    }
  }

  async function handleSetCover(url: string) {
    const prevCover = cover;
    setCover(url);
    try {
      await patchOwnerVenueMedia(venueId, { coverImage: url });
      emit({ coverImage: url, gallery: images });
      toast.success('Couverture définie');
    } catch {
      setCover(prevCover);
      toast.error('Échec de la mise à jour');
    }
  }

  // ── Reorder (native drag) ────────────────────────────────────────────────
  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDragIdx(null);
    const prev = images;
    setImages(next);
    try {
      await patchOwnerVenueMedia(venueId, { gallery: next });
      emit({ coverImage: cover, gallery: next });
    } catch {
      setImages(prev);
      toast.error('Échec du réordonnancement');
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* ── Cover ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">Image de couverture</h3>
          <span className="text-[11px] text-neutral-600">Affichée en grand sur la fiche</span>
        </div>
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="group relative block aspect-[21/9] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all hover:border-amber-400/30"
        >
          {cover ? (
            <Image src={cover} alt="Couverture" fill className="object-cover" sizes="100vw" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-600">
              <ImageIcon className="size-8" />
              <span className="text-sm">Ajouter une couverture</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/45">
            <span className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black opacity-0 transition-opacity group-hover:opacity-100">
              {coverBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {cover ? 'Remplacer' : 'Téléverser'}
            </span>
          </div>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleCover(e.target.files?.[0] ?? undefined)}
        />
      </div>

      {/* ── Gallery ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">
            Galerie {images.length > 0 && <span className="text-neutral-600">· {images.length}</span>}
          </h3>
          <span className="text-[11px] text-neutral-600">Glissez pour réordonner</span>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => galleryInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleGalleryFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-7 text-center transition-all',
            dragOver
              ? 'border-amber-400/60 bg-amber-400/[0.06]'
              : 'border-white/[0.1] bg-white/[0.02] hover:border-amber-400/30 hover:bg-white/[0.03]'
          )}
        >
          {uploading > 0 ? (
            <>
              <Loader2 className="size-6 animate-spin text-amber-400" />
              <span className="text-sm text-neutral-400">Envoi de {uploading} photo(s)…</span>
            </>
          ) : (
            <>
              <ImagePlus className="size-6 text-amber-400/80" />
              <span className="text-sm font-medium text-neutral-300">
                Glissez vos photos ici, ou cliquez pour parcourir
              </span>
              <span className="text-[11px] text-neutral-600">JPG / PNG / WebP — plusieurs fichiers acceptés</span>
            </>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleGalleryFiles(Array.from(e.target.files ?? []))}
        />

        {/* Thumbnail grid */}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {images.map((url, idx) => (
                <motion.div
                  key={url}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  className={cn(
                    'group relative aspect-[4/3] overflow-hidden rounded-xl border bg-white/[0.02]',
                    dragIdx === idx ? 'border-amber-400/60 opacity-50' : 'border-white/[0.08]'
                  )}
                >
                  <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="200px" />

                  {/* Drag handle */}
                  <div className="absolute left-1.5 top-1.5 flex size-6 cursor-grab items-center justify-center rounded-md bg-black/60 text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="size-3.5" />
                  </div>

                  {cover === url && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
                      <Star className="size-2.5 fill-black" /> Couverture
                    </span>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleSetCover(url)}
                      disabled={cover === url}
                      className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-amber-400 hover:text-black disabled:opacity-40"
                    >
                      <Star className="size-3" /> Couverture
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(url)}
                      aria-label="Supprimer"
                      className="flex size-7 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
