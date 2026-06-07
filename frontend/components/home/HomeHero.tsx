'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

const CATEGORY_CHIPS = [
  { label: 'Cafés', href: '/cafes' },
  { label: 'Restaurants', href: '/restaurants' },
  { label: 'Hôtels', href: '/hotels' },
  { label: 'Cinéma', href: '/cinema' },
  { label: 'Événements', href: '/evenements' },
];

export function HomeHero() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const { user } = useAuthStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <section className="relative min-h-[70vh] overflow-hidden py-20 md:py-28">
      {/* Photo background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80)`,
        }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      <div className="container relative z-10 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-5xl lg:text-6xl">
            Bienvenue sur Before you go
          </h1>
          <p className="mt-4 text-lg text-white/90 drop-shadow md:text-xl">
            Réservez votre table, chambre ou place en quelques clics. Découvrez les meilleurs
            cafés, restaurants, hôtels et événements en Tunisie.
          </p>
          <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div className="relative flex-1 max-w-md mx-auto sm:mx-0 w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un lieu ou un événement..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-11 bg-white/95 border-white/50 placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Rechercher
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORY_CHIPS.map((chip) => (
              <Button key={chip.href} variant="secondary" size="sm" asChild className="bg-white/90 text-foreground hover:bg-white border-white/50">
                <Link href={chip.href}>{chip.label}</Link>
              </Button>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Link href="/explorer">Explorer en 360°</Link>
            </Button>
            {user ? (
              <Button variant="outline" size="lg" asChild className="border-white/60 text-white hover:bg-white/20">
                <Link href={user.role === 'ADMIN' ? '/admin' : '/mes-reservations'}>
                  {user.role === 'ADMIN' ? 'Tableau de bord' : 'Mes réservations'}
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="lg" asChild className="border-white/60 text-white hover:bg-white/20">
                <Link href="/login">Connexion</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
