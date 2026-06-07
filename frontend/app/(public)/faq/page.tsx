import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FAQPage() {
  return (
    <div className="container px-4 py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
          <CardDescription>
            Retrouvez les réponses aux questions les plus courantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Comment réserver ? Parcourez les lieux, choisissez votre créneau et validez.</p>
          <p>Puis-je annuler ? Oui, depuis votre tableau de bord dans la limite des conditions du lieu.</p>
        </CardContent>
      </Card>
    </div>
  );
}
