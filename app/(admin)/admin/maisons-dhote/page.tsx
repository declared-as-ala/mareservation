import { redirect } from 'next/navigation';

/**
 * Maisons d'hôte are managed through the generic admin venues page,
 * filtered by type. This keeps a single CRUD surface for all venues.
 *
 * Admins land on a list of MAISON_DHOTE venues, can create new ones,
 * and edit each one (including its venue-level 360° tours).
 */
export default function AdminMaisonsDhotePage() {
  redirect('/admin/venues?type=MAISON_DHOTE');
}
