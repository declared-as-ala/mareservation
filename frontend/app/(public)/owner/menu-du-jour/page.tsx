'use client';

import { useEffect, useState } from 'react';
import { createOwnerMenu, fetchOwnerMenus } from '@/lib/api/menu-du-jour';

type OwnerMenu = { _id: string; title: string; date: string; isActive: boolean };

export default function OwnerMenuDuJourPage() {
  const [menus, setMenus] = useState<OwnerMenu[]>([]);
  const [title, setTitle] = useState('');
  const [venueId, setVenueId] = useState('');

  async function load() {
    const res = await fetchOwnerMenus();
    setMenus(((res as any)?.data || []) as OwnerMenu[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate() {
    await createOwnerMenu({ title, venueId, date: new Date().toISOString().slice(0, 10), items: [] });
    setTitle('');
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-zinc-100">
      <h1 className="text-2xl font-semibold">Menu du jour</h1>
      <div className="grid gap-2 md:grid-cols-3">
        <input value={venueId} onChange={(e) => setVenueId(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2" placeholder="Venue ID" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2" placeholder="Titre" />
        <button onClick={onCreate} className="rounded bg-amber-500 px-3 py-2 font-medium text-black">Creer</button>
      </div>
      <div className="space-y-2">
        {menus.map((m) => (
          <div key={m._id} className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            {m.title} - {m.date} {m.isActive ? '(actif)' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
