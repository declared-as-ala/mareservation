'use client';

import { useParams } from 'next/navigation';
import { VenueAdminShell } from '@/components/admin/venue/VenueAdminShell';

export default function AdminRestaurantPage() {
  const { id } = useParams<{ id: string }>();
  return <VenueAdminShell venueId={id} category="RESTAURANT" />;
}
