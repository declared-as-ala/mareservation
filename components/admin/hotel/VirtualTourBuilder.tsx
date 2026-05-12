'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import Image from 'next/image';
import {
  Plus, Trash2, Upload, Loader2, X, Eye, Link2,
  Move, MousePointer, ArrowRight, Globe2,
  ImagePlus, Settings2, Check, ChevronRight, Layers,
  Edit3, GripVertical, Play, Pause, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImageFile } from '@/lib/api/client';
import {
  createAdminHotelScene,
  updateAdminHotelScene,
  deleteAdminHotelScene,
  createAdminSceneHotspot,
  deleteAdminSceneHotspot,
  type AdminHotelScene,
  type AdminSceneHotspot,
} from '@/lib/api/admin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type BuilderMode = 'view' | 'add-hotspot';

interface PendingHotspot {
  xPercent: number;
  yPercent: number;
}

interface VirtualTourBuilderProps {
  hotelId: string;
  initialScenes: AdminHotelScene[];
  initialHotspots: AdminSceneHotspot[];
  onUpdated?: () => void;
}

// ── Scene thumbnail card ──────────────────────────────────────────────────────

function SceneCard({
  scene,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  scene: AdminHotelScene;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(scene.name);

  function commitRename() {
    if (name.trim()) onRename(name.trim());
    setEditing(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border p-2 cursor-pointer transition-all duration-200',
        isActive
          ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 shadow-lg shadow-[#D4AF37]/10'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <GripVertical className="size-3.5 text-zinc-600 shrink-0" />

      {/* Thumbnail */}
      <div className="relative size-12 rounded-lg overflow-hidden bg-zinc-700 shrink-0">
        <Image src={scene.image} alt={scene.name} fill className="object-cover" />
        {isActive && (
          <div className="absolute inset-0 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-lg" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full rounded bg-zinc-900 border border-[#D4AF37]/40 px-2 py-0.5 text-xs text-white focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className={cn('text-xs font-medium truncate', isActive ? 'text-[#D4AF37]' : 'text-zinc-200')}>
            {scene.name}
          </p>
        )}
        {isActive && <p className="text-[10px] text-[#D4AF37]/60 mt-0.5">Scène active</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="flex size-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Edit3 className="size-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex size-6 items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Hotspot dot overlay ────────────────────────────────────────────────────────

function HotspotDot({
  hotspot,
  targetScene,
  onDelete,
}: {
  hotspot: AdminSceneHotspot;
  targetScene?: AdminHotelScene;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
    >
      {/* Ping animation */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#D4AF37] opacity-30 animate-ping scale-150" />
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative flex size-6 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-black/80 backdrop-blur-sm shadow-lg shadow-[#D4AF37]/30 hover:scale-110 transition-transform"
        >
          <ArrowRight className="size-3 text-[#D4AF37]" />
        </button>

        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 min-w-[140px] rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl"
            >
              <p className="text-[10px] text-zinc-500 mb-0.5">Vers →</p>
              <p className="text-xs font-semibold text-white truncate">{targetScene?.name ?? 'Scène inconnue'}</p>
              <p className="text-[10px] text-[#D4AF37] mt-1 truncate">{hotspot.label}</p>
              <button
                onClick={onDelete}
                className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 py-1 text-[10px] text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="size-2.5" /> Supprimer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Label line */}
      <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap">
        <span className="rounded-full bg-black/70 border border-zinc-700 backdrop-blur-sm px-2 py-0.5 text-[10px] text-zinc-300">
          {hotspot.label}
        </span>
      </div>
    </div>
  );
}

// ── Add scene modal ────────────────────────────────────────────────────────────

function AddSceneModal({
  hotelId,
  onClose,
  onCreated,
}: {
  hotelId: string;
  onClose: () => void;
  onCreated: (scene: AdminHotelScene) => void;
}) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      setImageUrl(url);
      toast.success('Image 360° uploadée.');
    } catch {
      toast.error("Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !imageUrl) {
      toast.error('Nom et image 360° requis.');
      return;
    }
    setSaving(true);
    try {
      const scene = await createAdminHotelScene(hotelId, { name: name.trim(), image: imageUrl, description });
      onCreated(scene);
      toast.success('Scène créée.');
    } catch {
      toast.error('Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Nouvelle scène 360°</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Uploadez une image équirectangulaire (ratio 2:1)</p>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload zone */}
          <div
            className={cn(
              'relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all',
              imageUrl ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
            )}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleUpload(file);
              };
              input.click();
            }}
          >
            {imageUrl ? (
              <>
                <Image src={imageUrl} alt="preview" fill className="object-cover rounded-xl opacity-60" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40">
                    <Check className="size-5 text-[#D4AF37]" />
                  </div>
                  <p className="text-sm font-medium text-[#D4AF37]">Image uploadée</p>
                  <p className="text-xs text-zinc-400">Cliquer pour changer</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                {uploading ? (
                  <Loader2 className="size-8 text-zinc-500 animate-spin" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
                    <ImagePlus className="size-6 text-zinc-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    {uploading ? 'Upload en cours...' : 'Cliquer pour uploader'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">JPG, PNG — Image équirectangulaire 360° (ratio 2:1 recommandé)</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Nom de la scène *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Chambre principale, Salle de bain, Balcon..."
              className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Description (optionnel)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description de la scène"
              className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-400 rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || uploading || !imageUrl || !name.trim()}
            className="flex-1 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl"
          >
            {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Création...</> : 'Créer la scène'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Add hotspot modal ──────────────────────────────────────────────────────────

function AddHotspotModal({
  hotelId,
  activeScene,
  scenes,
  position,
  onClose,
  onCreated,
}: {
  hotelId: string;
  activeScene: AdminHotelScene;
  scenes: AdminHotelScene[];
  position: PendingHotspot;
  onClose: () => void;
  onCreated: (hotspot: AdminSceneHotspot) => void;
}) {
  const [label, setLabel] = useState('');
  const [targetSceneId, setTargetSceneId] = useState('');
  const [saving, setSaving] = useState(false);

  const otherScenes = scenes.filter((s) => s._id !== activeScene._id);

  async function handleCreate() {
    if (!label.trim() || !targetSceneId) {
      toast.error('Label et scène cible requis.');
      return;
    }
    setSaving(true);
    try {
      const hotspot = await createAdminSceneHotspot({
        venueId: hotelId,
        sceneId: activeScene._id,
        label: label.trim(),
        xPercent: position.xPercent,
        yPercent: position.yPercent,
        targetSceneId,
      });
      onCreated(hotspot);
      toast.success('Hotspot créé.');
    } catch {
      toast.error('Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Link2 className="size-4 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ajouter un hotspot</h3>
            <p className="text-[11px] text-zinc-500">Lien vers une autre scène</p>
          </div>
        </div>

        {/* Position preview */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
          <div className="size-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-xs text-zinc-400">
            Position : {Math.round(position.xPercent)}%, {Math.round(position.yPercent)}%
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Label du hotspot *</Label>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Vers la salle de bain"
              className="bg-zinc-900 border-zinc-700 text-white rounded-xl"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Scène de destination *</Label>
            {otherScenes.length === 0 ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-center text-xs text-zinc-500">
                Créez d&apos;autres scènes pour pouvoir les lier.
              </div>
            ) : (
              <div className="space-y-1.5">
                {otherScenes.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setTargetSceneId(s._id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                      targetSceneId === s._id
                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                    )}
                  >
                    <div className="relative size-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                      <Image src={s.image} alt={s.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium truncate', targetSceneId === s._id ? 'text-[#D4AF37]' : 'text-zinc-200')}>
                        {s.name}
                      </p>
                    </div>
                    {targetSceneId === s._id && <Check className="size-4 text-[#D4AF37] shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <Button variant="outline" onClick={onClose} size="sm" className="flex-1 border-zinc-700 text-zinc-400 rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !label.trim() || !targetSceneId}
            size="sm"
            className="flex-1 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl"
          >
            {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : null}
            Créer le lien
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main VirtualTourBuilder component ─────────────────────────────────────────

export function VirtualTourBuilder({ hotelId, initialScenes, initialHotspots, onUpdated }: VirtualTourBuilderProps) {
  const [scenes, setScenes] = useState<AdminHotelScene[]>(initialScenes);
  const [hotspots, setHotspots] = useState<AdminSceneHotspot[]>(initialHotspots);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(initialScenes[0]?._id ?? null);
  const [mode, setMode] = useState<BuilderMode>('view');
  const [pendingHotspot, setPendingHotspot] = useState<PendingHotspot | null>(null);
  const [showAddScene, setShowAddScene] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const activeScene = scenes.find((s) => s._id === activeSceneId);
  const activeHotspots = hotspots.filter((h) => h.virtualTourId === activeSceneId);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'add-hotspot') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingHotspot({ xPercent, yPercent });
  }, [mode]);

  async function handleDeleteScene(sceneId: string) {
    if (!confirm('Supprimer cette scène et tous ses hotspots ?')) return;
    try {
      await deleteAdminHotelScene(sceneId);
      setScenes((prev) => prev.filter((s) => s._id !== sceneId));
      setHotspots((prev) => prev.filter((h) => h.virtualTourId !== sceneId && h.targetId !== sceneId));
      if (activeSceneId === sceneId) setActiveSceneId(scenes.find((s) => s._id !== sceneId)?._id ?? null);
      toast.success('Scène supprimée.');
      onUpdated?.();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }

  async function handleRenameScene(sceneId: string, name: string) {
    try {
      await updateAdminHotelScene(sceneId, { name });
      setScenes((prev) => prev.map((s) => s._id === sceneId ? { ...s, name } : s));
    } catch {
      toast.error('Erreur lors du renommage.');
    }
  }

  async function handleDeleteHotspot(hotspotId: string) {
    try {
      await deleteAdminSceneHotspot(hotspotId);
      setHotspots((prev) => prev.filter((h) => h._id !== hotspotId));
      toast.success('Hotspot supprimé.');
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Globe2 className="size-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Éditeur Visite Virtuelle 360°</h3>
            <p className="text-xs text-zinc-500">{scenes.length} scène{scenes.length !== 1 ? 's' : ''} · {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddScene(true)}
          size="sm"
          className="h-8 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl text-xs px-3"
        >
          <Plus className="size-3.5 mr-1.5" /> Nouvelle scène
        </Button>
      </div>

      {scenes.length === 0 ? (
        // Empty state
        <div
          className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 cursor-pointer hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all"
          onClick={() => setShowAddScene(true)}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 mb-4">
            <Globe2 className="size-7 text-zinc-500" />
          </div>
          <p className="text-base font-semibold text-zinc-300 mb-1">Aucune scène 360°</p>
          <p className="text-sm text-zinc-500 mb-4 text-center max-w-xs">
            Uploadez des images équirectangulaires pour créer votre visite virtuelle immersive.
          </p>
          <Button size="sm" className="bg-[#D4AF37] hover:bg-[#c9a227] text-black font-semibold rounded-xl">
            <Plus className="size-4 mr-2" /> Ajouter la première scène
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_220px] gap-4 min-h-[520px]">
          {/* Left: Scene list */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scènes</p>
              <span className="text-xs text-zinc-600">{scenes.length}</span>
            </div>
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1">
              <AnimatePresence initial={false}>
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene._id}
                    scene={scene}
                    isActive={scene._id === activeSceneId}
                    onSelect={() => setActiveSceneId(scene._id)}
                    onDelete={() => handleDeleteScene(scene._id)}
                    onRename={(name) => handleRenameScene(scene._id, name)}
                  />
                ))}
              </AnimatePresence>
            </div>
            <button
              onClick={() => setShowAddScene(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors mt-auto"
            >
              <Plus className="size-3.5" /> Ajouter une scène
            </button>
          </div>

          {/* Center: Viewer + toolbar */}
          <div className="flex flex-col gap-3">
            {/* Mode toolbar */}
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5">
              <button
                onClick={() => setMode('view')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  mode === 'view' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <Eye className="size-3.5" /> Navigation
              </button>
              <button
                onClick={() => setMode('add-hotspot')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  mode === 'add-hotspot'
                    ? 'bg-[#D4AF37] text-black shadow-sm shadow-[#D4AF37]/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <Link2 className="size-3.5" /> Ajouter hotspot
              </button>
              {mode === 'add-hotspot' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-2 text-xs text-[#D4AF37]/70"
                >
                  Cliquez sur l&apos;image pour placer un hotspot
                </motion.span>
              )}
            </div>

            {/* Viewer */}
            {activeScene ? (
              <div
                ref={viewerRef}
                className={cn(
                  'relative flex-1 min-h-[400px] rounded-2xl overflow-hidden border bg-black',
                  mode === 'add-hotspot'
                    ? 'border-[#D4AF37]/40 cursor-crosshair ring-2 ring-[#D4AF37]/20'
                    : 'border-zinc-800 cursor-default'
                )}
                onClick={handleImageClick}
              >
                <Image
                  src={activeScene.image}
                  alt={activeScene.name}
                  fill
                  className="object-cover"
                  draggable={false}
                />

                {/* Scene name overlay */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <div className="size-1.5 rounded-full bg-[#D4AF37]" />
                    {activeScene.name}
                  </span>
                </div>

                {/* Hotspot overlays */}
                {activeHotspots.map((h) => (
                  <HotspotDot
                    key={h._id}
                    hotspot={h}
                    targetScene={scenes.find((s) => s._id === h.targetId)}
                    onDelete={() => handleDeleteHotspot(h._id)}
                  />
                ))}

                {/* Add hotspot mode indicator */}
                {mode === 'add-hotspot' && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/20 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-[#D4AF37]">
                      <div className="size-2 rounded-full bg-[#D4AF37] animate-pulse" />
                      Mode ajout — cliquez pour placer
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-sm text-zinc-600">Sélectionnez une scène</p>
              </div>
            )}
          </div>

          {/* Right: Hotspot list */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hotspots</p>
              <span className="text-xs text-zinc-600">{activeHotspots.length}</span>
            </div>

            {activeHotspots.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-2">
                <Link2 className="size-6 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500">
                  {mode === 'add-hotspot'
                    ? 'Cliquez sur l\'image pour placer un hotspot'
                    : 'Activez le mode hotspot pour en créer.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[400px]">
                <AnimatePresence initial={false}>
                  {activeHotspots.map((h) => {
                    const target = scenes.find((s) => s._id === h.targetId);
                    return (
                      <motion.div
                        key={h._id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="group flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 p-2 hover:border-zinc-600 transition-all"
                      >
                        <div className="flex size-6 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 shrink-0">
                          <ArrowRight className="size-3 text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-zinc-200 truncate">{h.label}</p>
                          <p className="text-[10px] text-zinc-500 truncate">→ {target?.name ?? '—'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHotspot(h._id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 flex size-5 items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={() => setMode('add-hotspot')}
              className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors mt-auto"
            >
              <Plus className="size-3.5" /> Ajouter un hotspot
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddScene && (
          <AddSceneModal
            hotelId={hotelId}
            onClose={() => setShowAddScene(false)}
            onCreated={(scene) => {
              setScenes((prev) => [...prev, scene]);
              setActiveSceneId(scene._id);
              setShowAddScene(false);
              onUpdated?.();
            }}
          />
        )}
        {pendingHotspot && activeScene && (
          <AddHotspotModal
            hotelId={hotelId}
            activeScene={activeScene}
            scenes={scenes}
            position={pendingHotspot}
            onClose={() => { setPendingHotspot(null); setMode('view'); }}
            onCreated={(hotspot) => {
              setHotspots((prev) => [...prev, hotspot]);
              setPendingHotspot(null);
              setMode('view');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
