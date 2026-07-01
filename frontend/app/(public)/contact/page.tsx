import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactPage() {
  return (
    <div className="container px-4 py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Une question ou besoin d&apos;aide ? Contactez l&apos;équipe Exploria360.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Email : contact@exploria360.com
          </p>
          <p className="text-muted-foreground">
            Téléphone : +216 70 000 000
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
