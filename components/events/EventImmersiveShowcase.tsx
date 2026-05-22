'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Camera, ChevronRight, ImageIcon, Loader2, ScanEye, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVenueScenes } from '@/lib/api/venues';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });

interface EventImmersiveShowcaseProps {
  venueId: string | null;
  title: string;
  images: string[];
}

function uniqueImages(images: string[]) {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (!image || seen.has(image)) return false;
    seen.add(image);
    return true;
  });
}

export function EventImmersiveShowcase({ venueId, title, images }: EventImmersiveShowcaseProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const galleryImages = useMemo(() => uniqueImages(images), [images]);

  const { data: tourData, isLoading } = useQuery({
    queryKey: ['event-venue-360-scenes', venueId],
    queryFn: () => fetchVenueScenes(venueId!),
    enabled: !!venueId,
  });

  const scenes = useMemo(
    () => (tourData?.scenes ?? []).filter((scene) => Boolean(scene.image)),
    [tourData]
  );

  const activeScene = useMemo(() => {
    if (!scenes.length) return null;
    return scenes.find((scene) => scene._id === activeSceneId) ?? scenes[0];
  }, [activeSceneId, scenes]);

  const navHotspots = useMemo(() => {
    if (!activeScene) return [];
    return (tourData?.hotspots ?? [])
      .filter((hotspot) => hotspot.virtualTourId === activeScene._id)
      .map((hotspot) => {
        const target = scenes.find((scene) => scene._id === hotspot.targetId);
        if (!target) return null;
        return {
          id: hotspot._id,
          yaw: (hotspot.xPercent / 100 - 0.5) * 2 * Math.PI,
          pitch: -(hotspot.yPercent / 100 - 0.5) * Math.PI,
          label: target.name,
        };
      })
      .filter((hotspot): hotspot is NonNullable<typeof hotspot> => hotspot !== null);
  }, [activeScene, scenes, tourData]);

  useEffect(() => {
    if (!activeSceneId && scenes[0]?._id) {
      setActiveSceneId(scenes[0]._id);
    }
    if (activeSceneId && scenes.length && !scenes.some((scene) => scene._id === activeSceneId)) {
      setActiveSceneId(scenes[0]._id);
    }
  }, [activeSceneId, scenes]);

  if (!galleryImages.length && !isLoading && !scenes.length) return null;

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-2xl shadow-black/25 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
            <Sparkles className="size-3.5" />
            Media evenement
          </div>
          <h2 className="text-2xl font-black text-white">Images & visite 360</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Regardez l'ambiance de l'evenement et explorez le lieu avant de prendre vos billets.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black px-3 py-1.5">
            <ImageIcon className="size-3.5 text-amber-300" />
            {galleryImages.length} image{galleryImages.length > 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black px-3 py-1.5">
            <ScanEye className="size-3.5 text-amber-300" />
            {scenes.length ? `${scenes.length} vue${scenes.length > 1 ? 's' : ''} 360` : '360 a venir'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-black">
          <div className="relative aspect-[16/10] min-h-[360px] xl:min-h-[520px]">
            {isLoading ? (
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-3 text-zinc-500">
                  <Loader2 className="size-8 animate-spin text-amber-300" />
                  <span className="text-sm">Chargement de la visite 360...</span>
                </div>
              </div>
            ) : activeScene ? (
              <>
                <PanoramaEngine
                  imageUrl={activeScene.image}
                  markers={[]}
                  mode="navigate"
                  navHotspots={navHotspots}
                  onNavHotspotClick={(hotspotId) => {
                    const targetId = (tourData?.hotspots ?? []).find((hotspot) => hotspot._id === hotspotId)?.targetId;
                    if (targetId) setActiveSceneId(targetId);
                  }}
                  scenes={scenes.map((scene) => ({ _id: scene._id, name: scene.name, image: scene.image }))}
                  activeSceneId={activeScene._id}
                  onSceneChange={setActiveSceneId}
                />
                <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                  Vue 360 - {activeScene.name}
                </div>
              </>
            ) : galleryImages[activeImage] ? (
              <Image src={galleryImages[activeImage]} alt={title} fill className="object-cover" sizes="(max-width: 1280px) 100vw, 820px" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-zinc-700">
                <Camera className="size-12" />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-black p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Galerie</p>
                <h3 className="mt-1 font-black text-white">Photos de l'evenement</h3>
              </div>
              <Camera className="size-5 text-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {galleryImages.slice(0, 6).map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'relative aspect-[4/3] overflow-hidden rounded-2xl border transition',
                    activeImage === index ? 'border-amber-400 shadow-lg shadow-amber-400/10' : 'border-zinc-800 hover:border-zinc-600'
                  )}
                >
                  <Image src={image} alt={`${title} ${index + 1}`} fill className="object-cover" sizes="180px" />
                </button>
              ))}
              {!galleryImages.length ? (
                <div className="col-span-2 rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
                  Les photos seront ajoutees prochainement.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Visite 360</p>
                <h3 className="mt-1 font-black text-white">Scenes du lieu</h3>
              </div>
              <ScanEye className="size-5 text-zinc-600" />
            </div>
            <div className="space-y-2">
              {scenes.map((scene) => {
                const active = scene._id === activeScene?._id;
                return (
                  <button
                    key={scene._id}
                    type="button"
                    onClick={() => setActiveSceneId(scene._id)}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition',
                      active ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                    )}
                  >
                    <span className="font-bold">{scene.name}</span>
                    <ChevronRight className="size-4" />
                  </button>
                );
              })}
              {!isLoading && !scenes.length ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
                  Aucune visite 360 n'est encore liee a ce lieu.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
