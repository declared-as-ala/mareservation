'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ScanLine, Upload, X, Eye, Trash2 } from 'lucide-react';
import { uploadImageFile } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });

interface PanoramaUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * Multi-image 360° uploader with a live rotatable preview. Each image must be
 * an equirectangular (2:1) panorama. Reusable across admin category editors.
 */
export function PanoramaUploadField({ images, onChange }: PanoramaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        urls.push(await uploadImageFile(file));
      }
      if (urls.length) {
        onChange([...images, ...urls]);
        toast.success(`${urls.length} vue${urls.length > 1 ? 's' : ''} 360° ajoutée${urls.length > 1 ? 's' : ''}.`);
      }
    } catch {
      toast.error("Erreur lors de l'upload du panorama.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    setPreviewIndex((p) => Math.max(0, Math.min(p, next.length - 1)));
  }

  const activeImage = images[Math.min(previewIndex, images.length - 1)];

  return (
    <div className="space-y-4">
      {/* Live preview */}
      {images.length > 0 && activeImage && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-300">
            <Eye className="size-3.5" />
            Tester la rotation 360° — glissez pour pivoter
          </div>
          <div className="relative h-56 w-full overflow-hidden rounded-xl border border-purple-500/20 bg-black sm:h-72">
            <PanoramaEngine
              key={activeImage}
              imageUrl={activeImage}
              markers={[]}
              mode="navigate"
              scenes={[]}
              activeSceneId={null}
              onSceneChange={() => undefined}
              onMarkerClick={() => undefined}
            />
            <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-purple-400/35 bg-black/70 px-3 py-1.5 text-[11px] font-bold text-purple-200 backdrop-blur-md">
              <ScanLine className="size-3" />
              Vue {Math.min(previewIndex, images.length - 1) + 1} / {images.length}
            </span>
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={cn(
                'group relative aspect-video cursor-pointer overflow-hidden rounded-lg border transition-all',
                i === previewIndex ? 'border-purple-400/60 ring-2 ring-purple-400/30' : 'border-zinc-700 hover:border-zinc-500'
              )}
              onClick={() => setPreviewIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Panorama ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label="Supprimer cette vue"
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white/80 opacity-0 backdrop-blur-sm transition-all hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
              <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-white/90">#{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-500/25 bg-purple-500/[0.03] py-8 text-center transition-all hover:border-purple-500/50 hover:bg-purple-500/[0.06]"
      >
        {uploading ? (
          <Loader2 className="size-7 animate-spin text-purple-400" />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
            <Upload className="size-6 text-purple-400" />
          </div>
        )}
        <p className="text-sm font-medium text-zinc-300">
          {uploading ? 'Upload en cours…' : 'Ajouter une vue 360°'}
        </p>
        <p className="text-xs text-zinc-600">Images équirectangulaires (format 2:1) — JPG / PNG / WebP</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
