'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function GlobalSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const term = q.trim();
      if (term) router.push(`/recherche?q=${encodeURIComponent(term)}`);
    },
    [q, router]
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Rechercher un lieu, un événement..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={cn(
            'pl-9 pr-9 h-10 rounded-lg border bg-background',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label="Recherche"
        />
        {q && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md"
            onClick={() => setQ('')}
            aria-label="Effacer"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <Button type="submit" size="sm" className="h-10 rounded-lg">
        Rechercher
      </Button>
    </form>
  );
}
