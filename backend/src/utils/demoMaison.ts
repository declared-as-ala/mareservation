/**
 * The single, clearly labelled DEMONSTRATION maison d'hôtes.
 *
 * Exploria360 is currently a prospecting platform: this listing shows hospitality
 * owners what the immersive experience looks like. It is NOT a real, verified or
 * bookable property, and it deliberately contains no invented address, owner,
 * rating, review, price, amenity or availability.
 */
import type { Model } from 'mongoose';
import type { IVenue } from '../models/Venue';

export const DEMO_SLUG = 'maison-hotes-demo-exploria360';
export const DEMO_TOUR_URL = 'https://spinview360.com/villaaa/';
export const DEMO_BOOKING_MESSAGE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";

export function demoMaisonFields() {
  return {
    name: "Maison d'Hôtes Démo — Exploria360",
    slug: DEMO_SLUG,
    type: 'MAISON_DHOTE' as const,
    isDemo: true,
    shortDescription:
      "Fiche de démonstration : découvrez en 360° ce que l'expérience Exploria360 offrira à vos futurs hôtes.",
    description:
      "Cette maison d'hôtes est une présentation de démonstration d'Exploria360. Elle illustre la manière dont une maison " +
      "d'hôtes tunisienne peut se faire découvrir en immersion 360° avant toute réservation : pièces de vie, extérieurs, " +
      "ambiance, tout se parcourt à son rythme, sur ordinateur comme sur mobile. " +
      "Il ne s'agit pas d'une maison d'hôtes réservable : aucune réservation ni aucun paiement n'est possible pour le moment, " +
      "et les informations pratiques (adresse, chambres, tarifs, disponibilités) ne sont volontairement pas renseignées. " +
      "Vous êtes propriétaire d'une maison d'hôtes ? Contactez-nous pour faire visiter la vôtre de la même façon.",
    // `city` and `address` are required by the schema; they are explicit non-addresses.
    city: 'Tunisie',
    address: 'Adresse non communiquée (fiche de démonstration)',
    // Real still rendered from the authorised 360° tour itself (served from the frontend /public).
    coverImage: '/demo/maison-demo-cover.jpg',
    gallery: ['/demo/maison-demo-cover.jpg'],
    amenities: [] as string[],
    isPublished: true,
    isFeatured: true,
    approvalStatus: 'approved' as const,
    hasVirtualTour: true,
    immersiveType: 'virtual-tour' as const,
    immersiveSourceType: 'embed' as const,
    immersiveProvider: 'custom',
    immersiveUrl: DEMO_TOUR_URL,
    reservationModes: [] as string[],
  };
}

/**
 * Idempotent: inserts the demo venue or updates ONLY that venue (matched by slug).
 * Never deletes, never touches any other document or collection.
 */
export async function upsertDemoMaison(Venue: Model<IVenue>) {
  const fields = demoMaisonFields();
  const res = await Venue.updateOne({ slug: DEMO_SLUG }, { $set: fields }, { upsert: true });
  return { inserted: res.upsertedCount > 0, matched: res.matchedCount, modified: res.modifiedCount };
}
