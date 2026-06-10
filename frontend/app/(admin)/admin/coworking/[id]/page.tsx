'use client';

import { useParams } from 'next/navigation';
import { VenueAdminShell } from '@/components/admin/venue/VenueAdminShell';

export default function AdminCoworkingPage() {
  const { id } = useParams<{ id: string }>();
  return <VenueAdminShell venueId={id} category="COWORKING" />;
}
