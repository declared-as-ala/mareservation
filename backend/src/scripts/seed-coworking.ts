/**
 * Seed a premium coworking space ("The Hub Coworking", Tunis — Lac 2)
 * with reservable units (hot desks, private offices, meeting rooms)
 * and coworking add-ons.
 *
 * Idempotent: re-running replaces the venue's units/add-ons cleanly.
 *
 *   cd backend && npx tsx src/scripts/seed-coworking.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { ReservableUnit } from '../models/ReservableUnit';
import { CoworkingAddon } from '../models/CoworkingAddon';

dotenv.config();

const SLUG = 'the-hub-coworking-tunis';

const GALLERY = [
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1920&auto=format&fit=crop',
];

async function seedCoworking() {
  await connectDatabase();

  // ── Owner ──────────────────────────────────────────────────────────────
  let owner = await User.findOne({ email: 'owner.coworking@exploria360.tn' });
  if (!owner) {
    owner = await User.create({
      fullName: 'Owner Coworking Exploria360',
      email: 'owner.coworking@exploria360.tn',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'ESTABLISHMENT_OWNER',
      isActive: true,
      emailVerified: true,
    });
    console.log('👤 Created coworking owner: owner.coworking@exploria360.tn / password123');
  } else {
    console.log('👤 Coworking owner already exists');
  }

  // ── Venue (upsert) ─────────────────────────────────────────────────────
  const venueData = {
    name: 'The Hub Coworking',
    slug: SLUG,
    type: 'COWORKING' as const,
    shortDescription: 'Espace de coworking premium au cœur du Lac 2, Tunis.',
    description:
      "The Hub Coworking est un espace de travail premium situé au cœur du quartier d'affaires du Lac 2, à Tunis. " +
      "Conçu pour les indépendants, les startups et les équipes en croissance, l'espace combine un design contemporain, " +
      "une lumière naturelle généreuse et une connexion fibre dédiée.\n\n" +
      "Vous y trouverez des bureaux partagés en open space, des bureaux privés fermés, ainsi que des salles de réunion " +
      "entièrement équipées. Café de spécialité, espaces détente, cabines d'appel et terrasse complètent l'expérience.",
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Rue du Lac Léman, Les Berges du Lac 2',
    phone: '+216 71 000 360',
    email: 'hello@thehub.tn',
    coordinates: { lat: 36.8425, lng: 10.2731 },
    coverImage: GALLERY[0],
    gallery: GALLERY,
    amenities: [
      'Wi-Fi fibre 1 Gbps',
      'Café de spécialité illimité',
      'Salles de réunion équipées',
      'Climatisation',
      'Imprimante & scanner',
      'Casiers sécurisés',
      'Cabines d’appel',
      'Espace détente',
      'Terrasse',
      'Réception & courrier',
      'Parking privé',
      'Accès 24/7 (membres)',
    ],
    startingPrice: 12,
    priceRangeMin: 12,
    priceRangeMax: 90,
    isPublished: true,
    isFeatured: true,
    isVedette: true,
    vedetteOrder: 1,
    hasVirtualTour: false,
    reservationModes: ['seat_zone'],
    immersiveType: 'none' as const,
    checkInPolicy: 'Lun–Ven 08h00–20h00 · Sam 09h00–18h00',
    cancellationPolicy: "Annulation gratuite jusqu'à 12h avant la réservation.",
    approvalStatus: 'approved' as const,
    ownerId: owner._id,
    createdBy: owner._id,
  };

  let venue = await Venue.findOne({ slug: SLUG });
  if (venue) {
    await Venue.updateOne({ _id: venue._id }, { $set: venueData });
    venue = await Venue.findById(venue._id);
    console.log('🏢 Updated existing venue: The Hub Coworking');
  } else {
    venue = await Venue.create(venueData);
    console.log('🏢 Created venue: The Hub Coworking');
  }
  if (!venue) throw new Error('Venue creation failed');

  // ── Reservable units (replace) ─────────────────────────────────────────
  await ReservableUnit.deleteMany({ venueId: venue._id });

  const units = [
    // Hot desks
    { unitType: 'coworking_desk', label: 'Hot Desk — Open Space A', code: 'HD-A', capacityMin: 1, capacityMax: 1, basePrice: 12, displayOrder: 1 },
    { unitType: 'coworking_desk', label: 'Hot Desk — Open Space B', code: 'HD-B', capacityMin: 1, capacityMax: 1, basePrice: 12, displayOrder: 2 },
    { unitType: 'coworking_desk', label: 'Dedicated Desk — Lumière', code: 'DD-1', capacityMin: 1, capacityMax: 1, basePrice: 18, displayOrder: 3 },
    // Private offices
    { unitType: 'coworking_office', label: 'Bureau privé — Studio (2 pers.)', code: 'PO-2', capacityMin: 1, capacityMax: 2, basePrice: 38, displayOrder: 4 },
    { unitType: 'coworking_office', label: 'Bureau privé — Team (4 pers.)', code: 'PO-4', capacityMin: 1, capacityMax: 4, basePrice: 55, displayOrder: 5 },
    // Meeting rooms
    { unitType: 'coworking_meeting_room', label: 'Salle de réunion — Lac (6 pers.)', code: 'MR-6', capacityMin: 2, capacityMax: 6, basePrice: 70, displayOrder: 6 },
    { unitType: 'coworking_meeting_room', label: 'Salle de réunion — Board (12 pers.)', code: 'MR-12', capacityMin: 4, capacityMax: 12, basePrice: 110, displayOrder: 7 },
  ];

  await ReservableUnit.insertMany(
    units.map((u) => ({
      venueId: venue!._id,
      unitType: u.unitType,
      label: u.label,
      code: u.code,
      capacityMin: u.capacityMin,
      capacityMax: u.capacityMax,
      priceType: 'fixed',
      basePrice: u.basePrice,
      currency: 'TND',
      status: 'active',
      isReservable: true,
      displayOrder: u.displayOrder,
    }))
  );
  console.log(`🪑 Created ${units.length} reservable units (desks / offices / meeting rooms)`);

  // ── Coworking add-ons (replace) ────────────────────────────────────────
  await CoworkingAddon.deleteMany({ venueId: venue._id });

  const addons = [
    { key: 'coffee', name: 'Café & boissons illimités', unitPrice: 6, maxQty: 10 },
    { key: 'parking', name: 'Place de parking', unitPrice: 8, maxQty: 4 },
    { key: 'locker', name: 'Casier privé sécurisé', unitPrice: 4, maxQty: 6 },
    { key: 'screen', name: 'Écran externe 27"', unitPrice: 10, maxQty: 6 },
    { key: 'printing', name: 'Pack impression (50 pages)', unitPrice: 7, maxQty: 5 },
  ];

  await CoworkingAddon.insertMany(
    addons.map((a) => ({
      venueId: venue!._id,
      key: a.key,
      name: a.name,
      unitPrice: a.unitPrice,
      isActive: true,
      maxQty: a.maxQty,
    }))
  );
  console.log(`✨ Created ${addons.length} coworking add-ons`);

  console.log('\n✅ Done. Visit: /coworking/' + SLUG);
  await mongoose.connection.close();
  process.exit(0);
}

seedCoworking().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
