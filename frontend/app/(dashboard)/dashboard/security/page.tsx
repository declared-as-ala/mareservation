import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sécurité du compte</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>
            Cette fonctionnalité sera disponible prochainement. Contactez le support si vous avez oublié votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Réinitialisation via email à venir.</p>
        </CardContent>
      </Card>
    </div>
  );
}
