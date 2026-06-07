import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-bold">Accès refusé</h1>
      <p className="text-muted-foreground">Vous n&apos;avez pas les droits pour accéder à cette page.</p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/">Accueil</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/mes-reservations">Mon compte</Link>
        </Button>
      </div>
    </div>
  );
}
