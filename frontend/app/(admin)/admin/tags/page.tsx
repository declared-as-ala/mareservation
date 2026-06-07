import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminTagsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tags</h1>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des tags</CardTitle>
          <CardContent className="pt-4">
            <p className="text-muted-foreground">CRUD tags à connecter à l&apos;API admin.</p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
