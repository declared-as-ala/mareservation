'use client';

import { useEffect, useState } from 'react';
import { Orbit } from 'lucide-react';

/** Mobile-only bottom bar leading to the tour; hides itself once the viewer is on screen. */
export function StickyTourCta({ targetId = 'visite', label = 'Découvrir la visite 360°' }: { targetId?: string; label?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 lg:hidden ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      aria-hidden={!visible}
    >
      <a
        href={`#${targetId}`}
        tabIndex={visible ? 0 : -1}
        className="flex h-14 items-center justify-center gap-2 rounded-full bg-amber-400 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-black shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
      >
        <Orbit className="size-4" aria-hidden="true" />
        {label}
      </a>
    </div>
  );
}
