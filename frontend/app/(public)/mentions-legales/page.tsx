import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MentionsLegalesPage() {
  return (
    <div className="container px-4 py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Mentions légales</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          <p>Exploria360 — Plateforme de réservation. Tunis, Tunisie.</p>
          <p>Contact : contact@exploria360.com</p>
        </CardContent>
      </Card>
    </div>
  );
}
