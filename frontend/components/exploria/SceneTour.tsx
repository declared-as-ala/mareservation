'use client';

/**
 * Multi-scene 360° tour built in the admin editor (Scene + navigation hotspots).
 * Rendered on the maison page when there is no external (Spinview) tour. Renders nothing without scenes.
 */
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { apiGetRaw } from '@/lib/api/client';
import type { VirtualHotspot, VirtualScene } from '@/lib/api/venues';

const PanoramaTourViewer = dynamic(() => import('@/components/immersive/PanoramaTourViewer').then((m) => m.PanoramaTourViewer), {
  ssr: false,
  loading: () => <div className="aspect-[16/9] w-full animate-pulse bg-neutral-900" />,
});

export function SceneTour({ slug, name, children }: { slug: string; name: string; children?: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['public-scenes', slug],
    queryFn: () => apiGetRaw<{ scenes?: VirtualScene[]; hotspots?: VirtualHotspot[] }>(`/venues/${encodeURIComponent(slug)}/scenes`),
    staleTime: 300_000,
  });
  if (!data?.scenes?.length) return null;
  return (
    <section id="visite" aria-labelledby="visite-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-10">
      <h2 id="visite-title" className="sr-only">Visite virtuelle 360°</h2>
      <div className="on-dark overflow-hidden rounded-[1.6rem] shadow-[0_24px_70px_rgba(23,20,15,0.16)]">
        <PanoramaTourViewer scenes={data.scenes} hotspots={data.hotspots ?? []} title={`Visite virtuelle 360° — ${name}`} />
      </div>
      {children}
    </section>
  );
}
