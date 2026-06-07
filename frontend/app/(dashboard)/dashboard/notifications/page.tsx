import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Préférences de notifications</CardTitle>
          <CardDescription>
            Gérez vos préférences pour les rappels de réservation et les actualités. Bientôt disponible.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
