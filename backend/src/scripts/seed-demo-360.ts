/**
 * Additive demo seed — one venue per category with a working 360° tour.
 * Idempotent: upserts by slug, never deletes existing data.
 *
 * Run:  cd backend && npx tsx src/scripts/seed-demo-360.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Venue } from '../models/Venue';
import { VirtualTour } from '../models/VirtualTour';
import { Room } from '../models/Room';
import { Event } from '../models/Event';

dotenv.config();

// Public Klapty demo tunnel URL — same one used elsewhere in the project.
const KLAPTY_360 = 'https://www.klapty.com/tour/tunnel/IBJ0xpE8hq';

// Public Unsplash 360°/panorama-style images used by the panorama engine when
// virtualTourUrl is not consumable. Equirectangular-friendly assets.
const PANORAMA_IMG_HOTEL_1 = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2400&auto=format&fit=crop';
const PANORAMA_IMG_HOTEL_2 = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2400&auto=format&fit=crop';
const PANORAMA_IMG_HOTEL_3 = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2400&auto=format&fit=crop';

interface DemoVenue {
  slug: string;
  name: string;
  type: 'HOTEL' | 'RESTAURANT' | 'CAFE' | 'CINEMA' | 'EVENT_SPACE';
  city: string;
  governorate?: string;
  address: string;
  description: string;
  shortDescription: string;
  coverImage: string;
  gallery: string[];
  amenities: string[];
  startingPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  rating: number;
  ratingCount: number;
}

const DEMOS: DemoVenue[] = [
  {
    slug: 'riad-azura-360',
    name: 'Riad Azura · 360° Sidi Bou',
    type: 'HOTEL',
    city: 'Sidi Bou Saïd',
    governorate: 'Tunis',
    address: '12 rue des Bougainvilliers, Sidi Bou Saïd',
    description:
      "Un riad de prestige à deux pas de la médina bleue. Chambres en immersion 360° — choisissez votre suite directement depuis la visite virtuelle.",
    shortDescription: "Riad de prestige avec visite 360° immersive et suites vue mer.",
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['piscine', 'wifi', 'spa', 'parking', 'restaurant'],
    startingPrice: 320,
    priceRangeMin: 320,
    priceRangeMax: 1280,
    rating: 4.8,
    ratingCount: 214,
  },
  {
    slug: 'la-table-dor-360',
    name: "La Table d'Or · 360° Gammarth",
    type: 'RESTAURANT',
    city: 'Gammarth',
    governorate: 'Tunis',
    address: 'Route de la Corniche, Gammarth',
    description:
      "Restaurant gastronomique fusion méditerranéenne. Visualisez votre table dans la salle en 360° avant de réserver.",
    shortDescription: "Gastronomie fusion · sélectionnez votre table en 360°.",
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['restaurant', 'wifi', 'romantique', 'vue-mer', 'italien'],
    startingPrice: 75,
    priceRangeMin: 75,
    priceRangeMax: 220,
    rating: 4.7,
    ratingCount: 148,
  },
  {
    slug: 'cafe-lumiere-360',
    name: 'Café Lumière · 360° La Marsa',
    type: 'CAFE',
    city: 'La Marsa',
    governorate: 'Tunis',
    address: 'Avenue Habib Bourguiba, La Marsa',
    description:
      "Café-coworking en bord de mer. Wi-Fi très haut débit, prises à chaque table, terrasse vue océan — explorez l'espace en 360°.",
    shortDescription: "Café-coworking lumineux, terrasse vue mer.",
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['wifi', 'prises', 'terrasse', 'travail', 'brunch'],
    startingPrice: 0,
    priceRangeMin: 8,
    priceRangeMax: 35,
    rating: 4.6,
    ratingCount: 312,
  },
  {
    slug: 'cinema-etoile-360',
    name: 'Cinéma Étoile · 360° Tunis',
    type: 'CINEMA',
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Avenue Mohammed V, Tunis',
    description:
      "Cinéma premium avec salles VIP, son Dolby Atmos. Visualisez chaque salle en 360° et choisissez votre siège.",
    shortDescription: "Cinéma premium · Dolby Atmos · sièges VIP.",
    coverImage: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['climatisation', 'parking', 'vip', 'snack'],
    startingPrice: 18,
    priceRangeMin: 18,
    priceRangeMax: 45,
    rating: 4.5,
    ratingCount: 89,
  },
  {
    slug: 'hangar-events-360',
    name: 'Hangar · 360° Hammamet',
    type: 'EVENT_SPACE',
    city: 'Hammamet',
    governorate: 'Nabeul',
    address: 'Zone touristique Yasmine, Hammamet',
    description:
      "Salle événementielle modulable jusqu'à 800 personnes. Visite 360° complète pour vos repérages.",
    shortDescription: "Salle 800 pers., scène pro, visite 360° complète.",
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['scene-pro', 'parking', 'climatisation', 'bar', 'live-music'],
    startingPrice: 0,
    priceRangeMin: 0,
    priceRangeMax: 0,
    rating: 4.9,
    ratingCount: 56,
  },
  // Coworking — backend has no COWORKING enum so we use EVENT_SPACE with appropriate tags
  {
    slug: 'atelier-coworking-360',
    name: 'Atelier · 360° Coworking Lac 2',
    type: 'EVENT_SPACE',
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Les Berges du Lac 2, Tunis',
    description:
      "Espace de coworking premium : 120 bureaux, 8 salles de réunion, lounge. Explorez chaque zone en 360°.",
    shortDescription: "Coworking premium · 120 bureaux · réunions privées.",
    coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop',
    ],
    amenities: ['coworking', 'wifi', 'prises', 'salles-reunion', 'parking', 'café'],
    startingPrice: 45,
    priceRangeMin: 45,
    priceRangeMax: 380,
    rating: 4.7,
    ratingCount: 102,
  },
];

async function upsertVenue(demo: DemoVenue): Promise<mongoose.Types.ObjectId> {
  const update = {
    ...demo,
    isPublished: true,
    isFeatured: true,
  };
  const doc = await Venue.findOneAndUpdate(
    { slug: demo.slug },
    { $set: update },
    { upsert: true, new: true }
  );
  return (doc as any)._id;
}

async function upsertVirtualTour(venueId: mongoose.Types.ObjectId, previewImage: string) {
  // Idempotent: keep at most one Klapty tour per venue.
  await VirtualTour.deleteMany({ venueId, provider: 'klapty' });
  await VirtualTour.create({
    venueId,
    provider: 'klapty',
    embedUrl: KLAPTY_360,
    previewImage,
    aspectRatio: 16 / 9,
    isActive: true,
  });
}

async function upsertHotelRooms(venueId: mongoose.Types.ObjectId) {
  // Drop existing demo rooms (those with our marker name pattern) then recreate.
  await Room.deleteMany({ venueId, roomNumber: { $in: [101, 102, 201, 202, 301] } });

  const baseGallery = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
  ];

  const rooms = [
    {
      venueId,
      name: 'Standard Vue Jardin',
      roomNumber: 101,
      roomType: 'STANDARD',
      capacity: 2,
      capacityAdults: 2,
      bedType: 'Queen',
      pricePerNight: 320,
      surface: 24,
      amenities: ['wifi', 'climatisation', 'minibar', 'safe-box'],
      isActive: true,
      isReservable: true,
      coverImage: baseGallery[0],
      gallery: baseGallery,
      hasVirtualTour: true,
      panoramicImages: [PANORAMA_IMG_HOTEL_1],
    },
    {
      venueId,
      name: 'Standard Vue Patio',
      roomNumber: 102,
      roomType: 'STANDARD',
      capacity: 2,
      capacityAdults: 2,
      bedType: 'Twin',
      pricePerNight: 320,
      surface: 24,
      amenities: ['wifi', 'climatisation', 'minibar', 'safe-box'],
      isActive: true,
      isReservable: true,
      coverImage: baseGallery[1],
      gallery: baseGallery,
      hasVirtualTour: true,
      panoramicImages: [PANORAMA_IMG_HOTEL_2],
    },
    {
      venueId,
      name: 'Deluxe Vue Mer',
      roomNumber: 201,
      roomType: 'DELUXE',
      capacity: 2,
      capacityAdults: 2,
      bedType: 'King',
      pricePerNight: 540,
      surface: 36,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box'],
      isActive: true,
      isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      ],
      hasVirtualTour: true,
      hasBalcony: true,
      panoramicImages: [PANORAMA_IMG_HOTEL_3],
    },
    {
      venueId,
      name: 'Deluxe Vue Mer Premium',
      roomNumber: 202,
      roomType: 'DELUXE',
      capacity: 3,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: 'King + Sofa-bed',
      pricePerNight: 580,
      surface: 38,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box', 'spa-access'],
      isActive: true,
      isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop',
      gallery: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop'],
      hasVirtualTour: true,
      hasBalcony: true,
      panoramicImages: [PANORAMA_IMG_HOTEL_1],
    },
    {
      venueId,
      name: 'Suite Présidentielle',
      roomNumber: 301,
      roomType: 'PRESIDENTIAL_SUITE',
      capacity: 4,
      capacityAdults: 4,
      bedType: 'King + Twin',
      pricePerNight: 1280,
      surface: 86,
      amenities: ['wifi', 'climatisation', 'minibar', 'jacuzzi', 'balcony', 'safe-box', 'butler', 'spa-access', 'lounge'],
      isActive: true,
      isReservable: true,
      coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1600&auto=format&fit=crop',
      ],
      hasVirtualTour: true,
      hasBalcony: true,
      isVip: true,
      panoramicImages: [PANORAMA_IMG_HOTEL_2, PANORAMA_IMG_HOTEL_3],
    },
  ];

  // Use insertMany ignoring extra non-schema fields via strict:false fallback if needed.
  for (const r of rooms) {
    await Room.create(r as any);
  }
}

async function upsertEvent(venueId: mongoose.Types.ObjectId) {
  const slug = 'concert-hangar-demo-360';
  const startAt = new Date();
  startAt.setDate(startAt.getDate() + 7);
  startAt.setHours(21, 30, 0, 0);
  const endsAt = new Date(startAt);
  endsAt.setHours(endsAt.getHours() + 3);

  await Event.findOneAndUpdate(
    { slug },
    {
      $set: {
        venueId,
        slug,
        title: 'Concert Live · Tropic Wave',
        type: 'CONCERT',
        description:
          "Une soirée tropicale immersive — explorez la salle en 360° avant de réserver votre table ou votre zone.",
        coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop',
        startAt,
        endsAt,
        isPublished: true,
        reservationMode: 'table',
        status: 'scheduled',
      },
    },
    { upsert: true, new: true }
  );
}

async function main() {
  await connectDatabase();
  console.log('🌱 Demo 360° seed — additive, idempotent\n');

  const venueIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const demo of DEMOS) {
    const id = await upsertVenue(demo);
    venueIds[demo.slug] = id;
    await upsertVirtualTour(id, demo.coverImage);
    console.log(`✅ ${demo.type.padEnd(13)} · ${demo.name}  (360° ready)`);
  }

  // Hotel rooms with per-room 360° panoramas
  if (venueIds['riad-azura-360']) {
    await upsertHotelRooms(venueIds['riad-azura-360']);
    console.log('🛏️  Riad Azura · 5 demo rooms across 3 types created');
  }

  // Event tied to the event space
  if (venueIds['hangar-events-360']) {
    await upsertEvent(venueIds['hangar-events-360']);
    console.log('🎫 Demo event created at Hangar');
  }

  console.log('\n✨ Done. Visit:');
  console.log('   /hotel/riad-azura-360       — RoomTypeCard + RoomTypeViewer demo');
  console.log('   /restaurant/la-table-dor-360');
  console.log('   /cafe/cafe-lumiere-360');
  console.log('   /cinema/cinema-etoile-360');
  console.log('   /coworking/atelier-coworking-360');
  console.log('   /evenements                 — listing with Concert · Tropic Wave');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
