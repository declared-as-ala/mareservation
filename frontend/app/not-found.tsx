import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Cette page n&apos;existe pas.</p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/">Accueil</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explorer">Explorer</Link>
        </Button>
      </div>
    </div>
  );
}
