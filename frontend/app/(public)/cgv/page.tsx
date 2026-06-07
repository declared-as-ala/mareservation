import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CGVPage() {
  return (
    <div className="container px-4 py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Conditions générales de vente</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          <p>Les présentes conditions régissent l&apos;utilisation de la plateforme Ma Reservation et les réservations effectuées via celle-ci.</p>
        </CardContent>
      </Card>
    </div>
  );
}
