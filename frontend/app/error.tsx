'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-muted-foreground max-w-md">{error.message || 'Erreur inattendue.'}</p>
      <div className="flex gap-4">
        <Button onClick={reset}>Réessayer</Button>
        <Button variant="outline" asChild>
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}
