/**
 * Fresh catalog seed — DESTRUCTIVE.
 *
 * Wipes the venue catalog and seeds exactly:
 *   - 1 HOTEL with 5 rooms across 3 types (each room has its own 360°)
 *   - 1 MAISON_DHOTE with 3 rooms across 2 types (each room has its own 360°)
 *   - 1 CAFE with venue-level 360°
 *   - 1 RESTAURANT with venue-level 360°
 *   - 1 COWORKING with venue-level 360°
 *   - 1 cultural EVENT (concert) — ticket-only, NO 360°
 *   - 1 sport EVENT (match) — ticket-only, NO 360°
 *
 * Idempotent re-runs: each call clears and reseeds.
 *
 * Run:  cd backend && npx tsx src/scripts/seed-fresh-catalog.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Venue } from '../models/Venue';
import { VenueMedia } from '../models/VenueMedia';
import { VirtualTour } from '../models/VirtualTour';
import { TourHotspot } from '../models/TourHotspot';
import { Room } from '../models/Room';
import { Table } from '../models/Table';
import { TableHotspot } from '../models/TableHotspot';
import { Seat } from '../models/Seat';
import { Event } from '../models/Event';
import { Reservation } from '../models/Reservation';

dotenv.config();

// Klapty tunnel URL (the canonical demo 360 tour).
const KLAPTY_360 = 'https://www.klapty.com/tour/tunnel/IBJ0xpE8hq';

// Equirectangular panoramas (Unsplash) — used as per-room 360 imagery.
const PANO = {
  hotelStandard: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2400&auto=format&fit=crop',
  hotelDeluxe: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2400&auto=format&fit=crop',
  hotelSuite: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2400&auto=format&fit=crop',
  maisonSimple: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2400&auto=format&fit=crop',
  maisonFamily: 'https://images.unsplash.com/photo-1551776235-dde6c44f4d59?q=80&w=2400&auto=format&fit=crop',
};

async function wipe(): Promise<void> {
  await Reservation.deleteMany({});
  await TourHotspot.deleteMany({});
  await VirtualTour.deleteMany({});
  await TableHotspot.deleteMany({});
  await Seat.deleteMany({});
  await Room.deleteMany({});
  await Table.deleteMany({});
  await Event.deleteMany({});
  await VenueMedia.deleteMany({});
  await Venue.deleteMany({});
}

async function seedVenue(input: {
  slug: string;
  name: string;
  type: 'HOTEL' | 'MAISON_DHOTE' | 'CAFE' | 'RESTAURANT' | 'COWORKING' | 'EVENT_SPACE';
  city: string;
  governorate?: string;
  address: string;
  description: string;
  shortDescription: string;
  coverImage: string;
  gallery: string[];
  amenities: string[];
  startingPrice?: number;
  priceRangeMin: number;
  priceRangeMax: number;
  rating: number;
  ratingCount: number;
  withVenue360?: boolean;
  isFeatured?: boolean;
}): Promise<mongoose.Types.ObjectId> {
  const venue = await Venue.create({
    name: input.name,
    slug: input.slug,
    type: input.type,
    city: input.city,
    governorate: input.governorate,
    address: input.address,
    description: input.description,
    shortDescription: input.shortDescription,
    coverImage: input.coverImage,
    gallery: input.gallery,
    amenities: input.amenities,
    startingPrice: input.startingPrice ?? 0,
    priceRangeMin: input.priceRangeMin,
    priceRangeMax: input.priceRangeMax,
    rating: input.rating,
    ratingCount: input.ratingCount,
    isPublished: true,
    isFeatured: input.isFeatured ?? true,
    isVedette: false,
    hasVirtualTour: !!input.withVenue360,
    immersiveType: input.withVenue360 ? 'virtual-tour' : 'none',
    immersiveSourceType: input.withVenue360 ? 'embed' : null,
    immersiveProvider: input.withVenue360 ? 'klapty' : null,
    immersiveUrl: input.withVenue360 ? KLAPTY_360 : null,
    approvalStatus: 'approved',
  });

  if (input.withVenue360) {
    await VirtualTour.create({
      venueId: venue._id,
      provider: 'klapty',
      embedUrl: KLAPTY_360,
      previewImage: input.coverImage,
      aspectRatio: 16 / 9,
      isActive: true,
    });
  }

  return venue._id as mongoose.Types.ObjectId;
}

async function seedHotelRooms(venueId: mongoose.Types.ObjectId): Promise<void> {
  // 5 rooms across 3 types, each with a 360° panorama.
  await Room.create([
    {
      venueId, name: 'Standard Vue Jardin', roomNumber: 101, roomType: 'STANDARD',
      capacity: 2, capacityAdults: 2, bedType: 'Queen', pricePerNight: 320, surface: 24,
      amenities: ['wifi', 'climatisation', 'minibar', 'safe-box'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, panoramicImages: [PANO.hotelStandard],
    },
    {
      venueId, name: 'Standard Vue Patio', roomNumber: 102, roomType: 'STANDARD',
      capacity: 2, capacityAdults: 2, bedType: 'Twin', pricePerNight: 320, surface: 24,
      amenities: ['wifi', 'climatisation', 'minibar', 'safe-box'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, panoramicImages: [PANO.hotelStandard],
    },
    {
      venueId, name: 'Deluxe Vue Mer', roomNumber: 201, roomType: 'DELUXE',
      capacity: 2, capacityAdults: 2, bedType: 'King', pricePerNight: 540, surface: 36,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, hasBalcony: true, panoramicImages: [PANO.hotelDeluxe],
    },
    {
      venueId, name: 'Deluxe Vue Mer Premium', roomNumber: 202, roomType: 'DELUXE',
      capacity: 3, capacityAdults: 2, capacityChildren: 1, bedType: 'King + Sofa-bed',
      pricePerNight: 580, surface: 38,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box', 'spa-access'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, hasBalcony: true, panoramicImages: [PANO.hotelDeluxe],
    },
    {
      venueId, name: 'Suite Présidentielle', roomNumber: 301, roomType: 'PRESIDENTIAL_SUITE',
      capacity: 4, capacityAdults: 4, bedType: 'King + Twin', pricePerNight: 1280, surface: 86,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box', 'butler', 'spa-access', 'lounge'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, hasBalcony: true, isVip: true,
      panoramicImages: [PANO.hotelSuite],
    },
  ] as any);
}

async function seedMaisonRooms(venueId: mongoose.Types.ObjectId): Promise<void> {
  await Room.create([
    {
      venueId, name: 'Chambre Simple Médina', roomNumber: 1, roomType: 'STANDARD',
      capacity: 2, capacityAdults: 2, bedType: 'Queen', pricePerNight: 180, surface: 18,
      amenities: ['wifi', 'climatisation', 'petit-dej'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, panoramicImages: [PANO.maisonSimple],
    },
    {
      venueId, name: 'Chambre Patio', roomNumber: 2, roomType: 'STANDARD',
      capacity: 2, capacityAdults: 2, bedType: 'Queen', pricePerNight: 180, surface: 18,
      amenities: ['wifi', 'climatisation', 'petit-dej'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, panoramicImages: [PANO.maisonSimple],
    },
    {
      venueId, name: 'Suite Familiale', roomNumber: 3, roomType: 'SUITE',
      capacity: 4, capacityAdults: 2, capacityChildren: 2, bedType: 'King + 2 Twin',
      pricePerNight: 320, surface: 42,
      amenities: ['wifi', 'climatisation', 'petit-dej', 'terrasse', 'cuisine'],
      isActive: true, isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1551776235-dde6c44f4d59?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1551776235-dde6c44f4d59?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true, panoramicImages: [PANO.maisonFamily],
    },
  ] as any);
}

async function seedTicketEvent(input: {
  venueId: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  type: string;
  daysFromNow: number;
  tickets: { name: string; price: number; capacity: number }[];
}): Promise<void> {
  const startAt = new Date();
  startAt.setDate(startAt.getDate() + input.daysFromNow);
  startAt.setHours(20, 0, 0, 0);
  const endsAt = new Date(startAt);
  endsAt.setHours(endsAt.getHours() + 3);

  await Event.create({
    venueId: input.venueId,
    slug: input.slug,
    title: input.title,
    type: input.type,
    description: input.description,
    coverImage: input.coverImage,
    afficheImageUrl: input.coverImage,
    galleryUrls: [input.coverImage],
    startAt,
    endsAt,
    isPublished: true,
    reservationMode: 'ticket_only', // NO 360° — pure ticket flow
    approvalStatus: 'approved',
    ticketTypes: input.tickets.map((t) => ({
      name: t.name,
      price: t.price,
      capacity: t.capacity,
      sold: 0,
      maxPerOrder: 10,
      isActive: true,
    })),
    status: 'scheduled',
  });
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log('🧹 Wiping venue catalog…');
  await wipe();

  console.log('🏨 Seeding 1 Hotel…');
  const hotelId = await seedVenue({
    slug: 'riad-azura',
    name: 'Riad Azura',
    type: 'HOTEL',
    city: 'Sidi Bou Saïd',
    governorate: 'Tunis',
    address: '12 rue des Bougainvilliers, Sidi Bou Saïd',
    description:
      "Riad de prestige à deux pas de la médina bleue. Chambres en immersion 360° — explorez chaque type de chambre avant de réserver.",
    shortDescription: "Riad de prestige avec visite 360° de chaque chambre.",
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['piscine', 'wifi', 'spa', 'parking', 'restaurant'],
    startingPrice: 320,
    priceRangeMin: 320,
    priceRangeMax: 1280,
    rating: 4.8,
    ratingCount: 214,
    withVenue360: true,
  });
  await seedHotelRooms(hotelId);

  console.log("🏡 Seeding 1 Maison d'hôte…");
  const maisonId = await seedVenue({
    slug: 'dar-el-medina',
    name: 'Dar El Médina',
    type: 'MAISON_DHOTE',
    city: 'Tunis',
    governorate: 'Tunis',
    address: '64 rue Sidi Ben Arous, Médina',
    description:
      "Maison d'hôte authentique au cœur de la médina de Tunis. Patio andalou, terrasse panoramique, petit-déjeuner local.",
    shortDescription: "Maison d'hôte au cœur de la médina, accueil familial.",
    coverImage: 'https://images.unsplash.com/photo-1551776235-dde6c44f4d59?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['wifi', 'petit-dej', 'terrasse', 'patio'],
    startingPrice: 180,
    priceRangeMin: 180,
    priceRangeMax: 320,
    rating: 4.9,
    ratingCount: 168,
    withVenue360: true,
  });
  await seedMaisonRooms(maisonId);

  console.log('☕ Seeding 1 Café…');
  await seedVenue({
    slug: 'cafe-lumiere',
    name: 'Café Lumière',
    type: 'CAFE',
    city: 'La Marsa',
    governorate: 'Tunis',
    address: 'Avenue Habib Bourguiba, La Marsa',
    description:
      "Café-coworking en bord de mer. Wi-Fi très haut débit, prises à chaque table, terrasse vue océan.",
    shortDescription: "Café-coworking lumineux, terrasse vue mer.",
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['wifi', 'prises', 'terrasse', 'travail', 'brunch'],
    priceRangeMin: 8,
    priceRangeMax: 35,
    rating: 4.6,
    ratingCount: 312,
    withVenue360: true,
  });

  console.log('🍽️  Seeding 1 Restaurant…');
  await seedVenue({
    slug: 'la-table-dor',
    name: "La Table d'Or",
    type: 'RESTAURANT',
    city: 'Gammarth',
    governorate: 'Tunis',
    address: 'Route de la Corniche, Gammarth',
    description:
      "Restaurant gastronomique méditerranéen. Visite 360° de la salle avant de réserver votre table.",
    shortDescription: "Gastronomie méditerranéenne · visite 360° de la salle.",
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['restaurant', 'wifi', 'romantique', 'vue-mer', 'mediterraneen'],
    startingPrice: 75,
    priceRangeMin: 75,
    priceRangeMax: 220,
    rating: 4.7,
    ratingCount: 148,
    withVenue360: true,
  });

  console.log('💼 Seeding 1 Coworking…');
  await seedVenue({
    slug: 'atelier-lac-2',
    name: 'Atelier Lac 2',
    type: 'COWORKING',
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Les Berges du Lac 2, Tunis',
    description:
      "Espace de coworking premium : 120 bureaux, 8 salles de réunion, lounge. Visite 360° de chaque zone.",
    shortDescription: "Coworking premium · 120 bureaux · réunions privées.",
    coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['coworking', 'wifi', 'prises', 'salles-reunion', 'parking', 'cafe'],
    startingPrice: 45,
    priceRangeMin: 45,
    priceRangeMax: 380,
    rating: 4.7,
    ratingCount: 102,
    withVenue360: true,
  });

  console.log('🎤 Seeding 1 Cultural event (concert)…');
  const eventSpaceId = await seedVenue({
    slug: 'hangar-events',
    name: 'Hangar Events',
    type: 'EVENT_SPACE',
    city: 'Hammamet',
    governorate: 'Nabeul',
    address: 'Zone touristique Yasmine, Hammamet',
    description: "Salle événementielle modulable jusqu'à 800 personnes.",
    shortDescription: 'Salle 800 places, scène pro.',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop'],
    amenities: ['scene-pro', 'parking', 'climatisation', 'bar'],
    priceRangeMin: 0,
    priceRangeMax: 0,
    rating: 4.9,
    ratingCount: 56,
    withVenue360: false, // event venue itself doesn't expose 360 since events are ticket-only
  });
  await seedTicketEvent({
    venueId: eventSpaceId,
    slug: 'concert-tropic-wave',
    title: 'Tropic Wave · Concert Live',
    description:
      "Une soirée tropicale immersive — réservez votre billet, profitez du show.",
    coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop',
    type: 'CONCERT',
    daysFromNow: 7,
    tickets: [
      { name: 'Standard', price: 60, capacity: 400 },
      { name: 'VIP', price: 150, capacity: 100 },
      { name: 'Carré Or', price: 280, capacity: 40 },
    ],
  });

  console.log('⚽ Seeding 1 Sport event (match)…');
  const stadiumId = await seedVenue({
    slug: 'stade-olympique',
    name: 'Stade Olympique de Radès',
    type: 'EVENT_SPACE',
    city: 'Radès',
    governorate: 'Ben Arous',
    address: "Cité Olympique, Radès",
    description: "Stade national de Tunisie · 60 000 places.",
    shortDescription: 'Stade national · 60 000 places.',
    coverImage: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?q=80&w=1600&auto=format&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1600&auto=format&fit=crop'],
    amenities: ['parking', 'snack', 'tribune-vip'],
    priceRangeMin: 0,
    priceRangeMax: 0,
    rating: 4.6,
    ratingCount: 412,
    withVenue360: false,
  });
  await seedTicketEvent({
    venueId: stadiumId,
    slug: 'match-etoile-vs-esperance',
    title: 'Match · Étoile du Sahel vs Espérance Sportive',
    description:
      "Classique du championnat tunisien. Réservez votre tribune — billet numérique, entrée scannée à l'arrivée.",
    coverImage: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?q=80&w=1600&auto=format&fit=crop',
    type: 'SPORT',
    daysFromNow: 14,
    tickets: [
      { name: 'Tribune Populaire', price: 25, capacity: 30000 },
      { name: 'Tribune Centrale', price: 60, capacity: 10000 },
      { name: 'VIP', price: 180, capacity: 800 },
      { name: 'Loge Privée', price: 600, capacity: 40 },
    ],
  });

  console.log('\n✨ Fresh catalog seeded. Visit:');
  console.log('   /accommodation/riad-azura       — hotel with 5 rooms × 3 types, 360° per room');
  console.log("   /accommodation/dar-el-medina    — maison d'hôte with 3 rooms × 2 types");
  console.log('   /cafe/cafe-lumiere              — café with venue 360°');
  console.log("   /restaurant/la-table-dor        — restaurant with venue 360°");
  console.log('   /coworking/atelier-lac-2        — coworking with working 360°');
  console.log("   /evenement/concert-tropic-wave  — ticket-only concert (no 360°)");
  console.log('   /evenement/match-etoile-vs-esperance — ticket-only match (Sport)');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Fresh seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
