'use client';

import { useRef, useState } from 'react';
import { Loader2, ImagePlus, Upload, X } from 'lucide-react';
import { uploadImageFile } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Tailwind aspect class for the drop zone, e.g. "aspect-video" or "aspect-[3/4]". */
  aspect?: string;
  label?: string;
  hint?: string;
  className?: string;
}

/**
 * Premium drag-or-click image upload field. Uploads the file to the server
 * (no URL pasting) and returns the hosted URL via onChange. Reusable across
 * every admin category editor.
 */
export function ImageUploadField({
  value,
  onChange,
  aspect = 'aspect-video',
  label,
  hint,
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      onChange(url);
      toast.success('Image uploadée.');
    } catch {
      toast.error("Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>}
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-zinc-900 transition-all',
          aspect,
          dragging
            ? 'border-[#D4AF37]/60 bg-[#D4AF37]/[0.04]'
            : 'border-zinc-700 hover:border-[#D4AF37]/40'
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? 'Upload…' : "Changer l'image"}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              aria-label="Retirer l'image"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-white/80 backdrop-blur-sm transition-colors hover:bg-red-500/80 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            {uploading ? (
              <Loader2 className="size-7 animate-spin text-zinc-500" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60">
                <ImagePlus className="size-6 text-zinc-500" />
              </div>
            )}
            <p className="text-sm font-medium text-zinc-400">
              {uploading ? 'Upload en cours…' : 'Cliquer ou glisser une image'}
            </p>
            {hint && <p className="text-xs text-zinc-600">{hint}</p>}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
