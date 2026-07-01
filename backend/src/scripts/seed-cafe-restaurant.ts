/**
 * Remove all existing café / restaurant venues, then seed 2 cafés + 2
 * restaurants — each with a cover, a photo gallery, a multi-scene 360°
 * virtual tour (linked by navigation hotspots), reservable tables with a
 * minimum consommation, table placements inside the 360° view, sample
 * blocks, a table policy, and a full menu.
 *
 *   cd backend && npx tsx src/scripts/seed-cafe-restaurant.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { MenuItem } from '../models/MenuItem';
import { VenueMedia } from '../models/VenueMedia';
import { ReservableUnit } from '../models/ReservableUnit';
import { Table } from '../models/Table';
import { TablePlacement } from '../models/TablePlacement';
import { Scene } from '../models/Scene';
import { TourHotspot } from '../models/TourHotspot';
import { TableBlock } from '../models/TableBlock';
import { VenueTablePolicy } from '../models/VenueTablePolicy';

dotenv.config();

// Equirectangular 2:1 panoramas (Photo Sphere Viewer public demo assets).
const PANO = (n: number) =>
  `https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-${n}.jpg`;

type MenuRow = {
  category: 'entree' | 'plat' | 'dessert' | 'boisson' | 'autre';
  name: string;
  description: string;
  price: number;
  isPopular?: boolean;
};

type TableRow = {
  tableNumber: number;
  capacity: number;
  minimumSpend: number;
  isVip?: boolean;
  locationLabel: string;
  sceneIndex: 0 | 1;
  yaw: number;
  pitch: number;
};

type VenueSeed = {
  name: string;
  slug: string;
  type: 'CAFE' | 'RESTAURANT';
  city: string;
  governorate: string;
  address: string;
  phone: string;
  email: string;
  coordinates: { lat: number; lng: number };
  description: string;
  shortDescription: string;
  amenities: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  startingPrice: number;
  gallery: string[];
  scenes: { name: string; description: string; image: string }[];
  tables: TableRow[];
  menu: MenuRow[];
};

/** 6 tables per venue: 3 in scene 0, 3 in scene 1, last one VIP. */
function tableset(minSpends: number[]): TableRow[] {
  const slots: Array<{ sceneIndex: 0 | 1; yaw: number; pitch: number }> = [
    { sceneIndex: 0, yaw: -2.1, pitch: -0.32 },
    { sceneIndex: 0, yaw: -0.2, pitch: -0.4 },
    { sceneIndex: 0, yaw: 1.9, pitch: -0.3 },
    { sceneIndex: 1, yaw: -1.8, pitch: -0.34 },
    { sceneIndex: 1, yaw: 0.3, pitch: -0.42 },
    { sceneIndex: 1, yaw: 2.2, pitch: -0.28 },
  ];
  const caps = [2, 2, 4, 4, 6, 6];
  return slots.map((s, i) => ({
    tableNumber: i + 1,
    capacity: caps[i],
    minimumSpend: minSpends[i],
    isVip: i === 5,
    locationLabel: s.sceneIndex === 0 ? 'Salle principale' : 'Terrasse',
    ...s,
  }));
}

const VENUES: VenueSeed[] = [
  // ── CAFÉ 1 ────────────────────────────────────────────────────────────
  {
    name: 'Nour Coffee House',
    slug: 'nour-coffee-house-tunis',
    type: 'CAFE',
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Rue du Lac Turkana, Les Berges du Lac 2',
    phone: '+216 71 100 200',
    email: 'hello@nourcoffee.tn',
    coordinates: { lat: 36.8398, lng: 10.2755 },
    shortDescription: 'Coffee shop de spécialité, lumineux et cosy, au Lac 2.',
    description:
      "Nour Coffee House est un coffee shop de spécialité au cœur du Lac 2. Torréfaction artisanale, " +
      "baristas passionnés et une salle baignée de lumière naturelle.\n\n" +
      "Explorez la salle en visite virtuelle 360°, choisissez votre table et réservez en quelques secondes.",
    amenities: ['Wi-Fi gratuit', 'Terrasse', 'Café de spécialité', 'Brunch', 'Climatisation', 'Prises électriques', 'Paiement par carte'],
    priceRangeMin: 4,
    priceRangeMax: 30,
    startingPrice: 4,
    gallery: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1920&auto=format&fit=crop',
    ],
    scenes: [
      { name: 'Salle principale', description: 'L’espace café et le comptoir.', image: PANO(1) },
      { name: 'Terrasse', description: 'La terrasse extérieure ombragée.', image: PANO(2) },
    ],
    tables: tableset([20, 20, 35, 35, 50, 80]),
    menu: [
      { category: 'boisson', name: 'Espresso', description: 'Café serré, corsé et intense.', price: 3.5, isPopular: true },
      { category: 'boisson', name: 'Flat White', description: 'Double ristretto, lait micro-moussé.', price: 6.5, isPopular: true },
      { category: 'boisson', name: 'V60 Pour Over', description: 'Café d’origine en filtre lent.', price: 9.0 },
      { category: 'boisson', name: 'Matcha Latte', description: 'Matcha cérémoniel et lait d’amande.', price: 8.5 },
      { category: 'entree', name: 'Avocado Toast', description: 'Pain au levain, avocat, œuf poché.', price: 14.0, isPopular: true },
      { category: 'entree', name: 'Granola Bowl', description: 'Granola maison, fruits de saison, miel.', price: 12.0 },
      { category: 'plat', name: 'Club Sandwich', description: 'Poulet grillé, bacon, frites maison.', price: 18.0, isPopular: true },
      { category: 'plat', name: 'Shakshuka', description: 'Œufs pochés, sauce tomate épicée.', price: 15.0 },
      { category: 'dessert', name: 'Cheesecake Fruits Rouges', description: 'Crémeux, coulis fraise-framboise.', price: 10.0, isPopular: true },
      { category: 'dessert', name: 'Cookie Cœur Fondant', description: 'Chocolat noir, fleur de sel.', price: 6.0 },
    ],
  },
  // ── CAFÉ 2 ────────────────────────────────────────────────────────────
  {
    name: 'Café des Délices',
    slug: 'cafe-des-delices-sidi-bou-said',
    type: 'CAFE',
    city: 'Sidi Bou Saïd',
    governorate: 'Tunis',
    address: 'Avenue Habib Bourguiba, Sidi Bou Saïd',
    phone: '+216 71 740 088',
    email: 'contact@cafedesdelices.tn',
    coordinates: { lat: 36.8702, lng: 10.3417 },
    shortDescription: 'Café panoramique bleu et blanc, vue sur la baie de Tunis.',
    description:
      "Niché dans le village de Sidi Bou Saïd, le Café des Délices offre une vue imprenable sur la baie. " +
      "Thé à la menthe aux pignons, pâtisseries orientales et ambiance authentique.\n\n" +
      "Découvrez la terrasse panoramique en 360° et réservez votre table face à la mer.",
    amenities: ['Terrasse panoramique', 'Vue mer', 'Thé traditionnel', 'Chicha', 'Pâtisseries orientales', 'Wi-Fi gratuit'],
    priceRangeMin: 3,
    priceRangeMax: 25,
    startingPrice: 3,
    gallery: [
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=1920&auto=format&fit=crop',
    ],
    scenes: [
      { name: 'Salon intérieur', description: 'Le salon traditionnel tunisien.', image: PANO(3) },
      { name: 'Terrasse panoramique', description: 'La terrasse avec vue sur la baie.', image: PANO(4) },
    ],
    tables: tableset([15, 15, 25, 25, 40, 60]),
    menu: [
      { category: 'boisson', name: 'Thé à la Menthe aux Pignons', description: 'Thé vert, menthe, pignons grillés.', price: 4.5, isPopular: true },
      { category: 'boisson', name: 'Café Turc', description: 'Café finement moulu, servi avec lokum.', price: 5.0, isPopular: true },
      { category: 'boisson', name: 'Citronnade Maison', description: 'Citron pressé, menthe, fleur d’oranger.', price: 6.0 },
      { category: 'entree', name: 'Assiette de Bricks', description: 'Bricks à l’œuf et au thon.', price: 8.0, isPopular: true },
      { category: 'plat', name: 'Tajine Tunisien', description: 'Tajine au poulet, fromage et persil.', price: 13.0 },
      { category: 'dessert', name: 'Bambalouni', description: 'Beignet tunisien chaud sucré.', price: 4.0, isPopular: true },
      { category: 'dessert', name: 'Pâtisseries Orientales', description: 'Baklava, cornes de gazelle, makroudh.', price: 11.0 },
      { category: 'dessert', name: 'Glace Maison', description: 'Jasmin, dattes ou pistache.', price: 7.0 },
    ],
  },
  // ── RESTAURANT 1 ──────────────────────────────────────────────────────
  {
    name: 'La Table d’Or',
    slug: 'la-table-dor-gammarth',
    type: 'RESTAURANT',
    city: 'Gammarth',
    governorate: 'Tunis',
    address: 'Route Touristique, Gammarth',
    phone: '+216 71 911 444',
    email: 'reservation@latabledor.tn',
    coordinates: { lat: 36.9183, lng: 10.2881 },
    shortDescription: 'Restaurant gastronomique méditerranéen, face à la mer.',
    description:
      "La Table d’Or est une adresse gastronomique de Gammarth où la cuisine méditerranéenne est sublimée " +
      "par des produits d’exception.\n\n" +
      "Visitez la salle et la terrasse en 360°, choisissez votre table et composez votre menu.",
    amenities: ['Vue mer', 'Terrasse', 'Cave à vin', 'Voiturier', 'Climatisation', 'Menu gastronomique', 'Réservation conseillée'],
    priceRangeMin: 18,
    priceRangeMax: 120,
    startingPrice: 18,
    gallery: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=1920&auto=format&fit=crop',
    ],
    scenes: [
      { name: 'Salle gastronomique', description: 'La salle principale élégante.', image: PANO(5) },
      { name: 'Terrasse face mer', description: 'La terrasse avec vue sur la Méditerranée.', image: PANO(6) },
    ],
    tables: tableset([60, 60, 100, 100, 140, 220]),
    menu: [
      { category: 'entree', name: 'Carpaccio de Daurade', description: 'Daurade royale, huile d’olive citronnée.', price: 26.0, isPopular: true },
      { category: 'entree', name: 'Velouté de Potimarron', description: 'Crème de potimarron, noisette.', price: 18.0 },
      { category: 'entree', name: 'Foie Gras Mi-Cuit', description: 'Foie gras maison, chutney de figues.', price: 32.0 },
      { category: 'plat', name: 'Loup Grillé', description: 'Loup de Méditerranée, fenouil confit.', price: 48.0, isPopular: true },
      { category: 'plat', name: 'Filet de Bœuf Rossini', description: 'Filet, foie gras poêlé, sauce truffe.', price: 62.0, isPopular: true },
      { category: 'plat', name: 'Risotto aux Gambas', description: 'Risotto crémeux, gambas snackées.', price: 42.0 },
      { category: 'dessert', name: 'Fondant au Chocolat', description: 'Cœur coulant, glace vanille.', price: 14.0, isPopular: true },
      { category: 'dessert', name: 'Tarte au Citron Meringuée', description: 'Crème de citron, meringue dorée.', price: 12.0 },
      { category: 'boisson', name: 'Vin Rouge — Magon Premium', description: 'Bouteille 75 cl, cépage syrah.', price: 70.0 },
      { category: 'boisson', name: 'Eau Minérale', description: 'Plate ou gazeuse, 1 L.', price: 4.0 },
    ],
  },
  // ── RESTAURANT 2 ──────────────────────────────────────────────────────
  {
    name: 'Dar El Jeld Bistro',
    slug: 'dar-el-jeld-bistro-tunis',
    type: 'RESTAURANT',
    city: 'Tunis',
    governorate: 'Tunis',
    address: 'Rue Dar El Jeld, Médina de Tunis',
    phone: '+216 71 560 916',
    email: 'contact@dareljeld-bistro.tn',
    coordinates: { lat: 36.7997, lng: 10.1706 },
    shortDescription: 'Cuisine tunisienne authentique dans un palais de la Médina.',
    description:
      "Installé dans une demeure historique de la Médina de Tunis, Dar El Jeld Bistro célèbre la cuisine " +
      "tunisienne traditionnelle revisitée.\n\n" +
      "Parcourez le patio et la salle voûtée en visite virtuelle 360° et réservez votre table.",
    amenities: ['Patio historique', 'Cuisine tunisienne', 'Climatisation', 'Groupes & événements', 'Paiement par carte', 'Réservation conseillée'],
    priceRangeMin: 14,
    priceRangeMax: 80,
    startingPrice: 14,
    gallery: [
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1428515613728-6b4607e44363?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1920&auto=format&fit=crop',
    ],
    scenes: [
      { name: 'Patio central', description: 'Le patio à ciel ouvert aux faïences anciennes.', image: PANO(7) },
      { name: 'Salle voûtée', description: 'La salle intérieure voûtée et intime.', image: PANO(1) },
    ],
    tables: tableset([40, 40, 70, 70, 110, 160]),
    menu: [
      { category: 'entree', name: 'Slata Méchouia', description: 'Légumes grillés, thon, œuf.', price: 9.0, isPopular: true },
      { category: 'entree', name: 'Brik à l’Œuf', description: 'Feuille de brick croustillante, œuf coulant.', price: 6.0, isPopular: true },
      { category: 'entree', name: 'Chorba Frik', description: 'Soupe au blé concassé et agneau.', price: 8.0 },
      { category: 'plat', name: 'Couscous Royal', description: 'Semoule, agneau, merguez, poulet.', price: 28.0, isPopular: true },
      { category: 'plat', name: 'Ojja Merguez', description: 'Œufs, merguez, sauce tomate épicée.', price: 16.0 },
      { category: 'plat', name: 'Tajine Malsouka', description: 'Tourte croustillante au poulet.', price: 18.0 },
      { category: 'plat', name: 'Poisson du Jour Grillé', description: 'Pêche locale, tastira, citron confit.', price: 34.0, isPopular: true },
      { category: 'dessert', name: 'Assida Zgougou', description: 'Crème de pin d’Alep, fruits secs.', price: 9.0, isPopular: true },
      { category: 'dessert', name: 'Makroudh Datte', description: 'Semoule, dattes, sirop de miel.', price: 7.0 },
      { category: 'boisson', name: 'Thé aux Pignons', description: 'Thé vert à la menthe et pignons.', price: 4.5 },
      { category: 'boisson', name: 'Eau Minérale', description: 'Plate ou gazeuse, 1 L.', price: 4.0 },
    ],
  },
];

async function seedCafeRestaurant() {
  await connectDatabase();

  // ── Owner ──────────────────────────────────────────────────────────────
  let owner = await User.findOne({ email: 'owner.dining@exploria360.tn' });
  if (!owner) {
    owner = await User.create({
      fullName: 'Owner Dining Exploria360',
      email: 'owner.dining@exploria360.tn',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'ESTABLISHMENT_OWNER',
      isActive: true,
      emailVerified: true,
    });
    console.log('👤 Created dining owner: owner.dining@exploria360.tn / password123');
  }

  // ── Remove existing café / restaurant venues + all related data ────────
  const oldVenues = await Venue.find({ type: { $in: ['CAFE', 'CAFE_LOUNGE', 'RESTAURANT'] } })
    .select('_id')
    .lean();
  const oldIds = oldVenues.map((v) => v._id);
  if (oldIds.length > 0) {
    await Promise.all([
      MenuItem.deleteMany({ venueId: { $in: oldIds } }),
      VenueMedia.deleteMany({ venueId: { $in: oldIds } }),
      ReservableUnit.deleteMany({ venueId: { $in: oldIds } }),
      Table.deleteMany({ venueId: { $in: oldIds } }),
      TablePlacement.deleteMany({ venueId: { $in: oldIds } }),
      Scene.deleteMany({ venueId: { $in: oldIds } }),
      TourHotspot.deleteMany({ venueId: { $in: oldIds } }),
      TableBlock.deleteMany({ venueId: { $in: oldIds } }),
      VenueTablePolicy.deleteMany({ venueId: { $in: oldIds } }),
    ]);
    await Venue.deleteMany({ _id: { $in: oldIds } });
    console.log(`🗑️  Removed ${oldIds.length} existing café/restaurant venue(s) and related data`);
  } else {
    console.log('🗑️  No existing café/restaurant venues to remove');
  }

  let menuCount = 0;
  let tableCount = 0;

  for (const v of VENUES) {
    // Venue ───────────────────────────────────────────────────────────────
    const venue = await Venue.create({
      name: v.name,
      slug: v.slug,
      type: v.type,
      shortDescription: v.shortDescription,
      description: v.description,
      city: v.city,
      governorate: v.governorate,
      address: v.address,
      phone: v.phone,
      email: v.email,
      coordinates: v.coordinates,
      coverImage: v.gallery[0],
      gallery: v.gallery,
      amenities: v.amenities,
      startingPrice: v.startingPrice,
      priceRangeMin: v.priceRangeMin,
      priceRangeMax: v.priceRangeMax,
      isPublished: true,
      isFeatured: true,
      isVedette: true,
      hasVirtualTour: true,
      reservationModes: ['table'],
      immersiveType: 'view-360',
      immersiveSourceType: 'upload',
      immersiveProvider: 'custom',
      checkInPolicy: 'Tous les jours · 08h00 – 23h30',
      cancellationPolicy: "Annulation gratuite jusqu'à 2h avant la réservation.",
      approvalStatus: 'approved',
      ownerId: owner._id,
      createdBy: owner._id,
    });

    // Scenes (360° images) ────────────────────────────────────────────────
    const scenes = await Scene.insertMany(
      v.scenes.map((s, i) => ({
        venueId: venue._id,
        name: s.name,
        description: s.description,
        image: s.image,
        order: i,
        isActive: true,
      }))
    );

    // Navigation hotspots linking the scenes ──────────────────────────────
    await TourHotspot.insertMany([
      {
        venueId: venue._id,
        virtualTourId: scenes[0]._id,
        targetType: 'scene',
        targetId: scenes[1]._id,
        label: `Aller : ${v.scenes[1].name}`,
        isActive: true,
        xPercent: 72,
        yPercent: 58,
        displayOrder: 0,
      },
      {
        venueId: venue._id,
        virtualTourId: scenes[1]._id,
        targetType: 'scene',
        targetId: scenes[0]._id,
        label: `Aller : ${v.scenes[0].name}`,
        isActive: true,
        xPercent: 28,
        yPercent: 58,
        displayOrder: 0,
      },
    ]);

    // Tables + placements inside the 360° view ────────────────────────────
    for (const t of v.tables) {
      const table = await Table.create({
        venueId: venue._id,
        name: `Table ${t.tableNumber}`,
        code: `T${t.tableNumber}`,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        capacityMin: 1,
        capacityMax: t.capacity,
        locationLabel: t.locationLabel,
        priceType: 'fixed',
        basePrice: 0,
        price: 0,
        minimumSpend: t.minimumSpend,
        currency: 'TND',
        isVip: !!t.isVip,
        isActive: true,
        isReservable: true,
        defaultStatus: 'available',
        displayOrder: t.tableNumber,
      });

      await TablePlacement.create({
        venueId: venue._id,
        tableId: table._id,
        sceneId: String(scenes[t.sceneIndex]._id),
        positionType: 'yaw_pitch',
        yaw: t.yaw,
        pitch: t.pitch,
      });
      tableCount += 1;
    }

    // Sample owner blocks — one full-time, one time-range tomorrow ─────────
    const venueTables = await Table.find({ venueId: venue._id }).sort({ tableNumber: 1 }).lean();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const blockStart = new Date(tomorrow); blockStart.setHours(19, 0, 0, 0);
    const blockEnd = new Date(tomorrow); blockEnd.setHours(21, 0, 0, 0);

    await TableBlock.insertMany([
      {
        venueId: venue._id,
        tableId: venueTables[2]._id, // table 3 — blocked all the time (maintenance)
        startsAt: new Date('2024-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        reason: 'maintenance',
        note: 'Table en maintenance — indisponible.',
        isActive: true,
        createdBy: owner._id,
      },
      {
        venueId: venue._id,
        tableId: venueTables[4]._id, // table 5 — blocked tomorrow evening (private event)
        startsAt: blockStart,
        endsAt: blockEnd,
        reason: 'private_event',
        note: 'Réservé pour un événement privé.',
        isActive: true,
        createdBy: owner._id,
      },
    ]);

    // Table reservation policy ────────────────────────────────────────────
    await VenueTablePolicy.create({
      venueId: venue._id,
      slotMinutes: 30,
      reservationDurationMinutes: 120,
      openingHour: 8,
      closingHour: 24,
      shifts: [
        { name: 'Déjeuner', startHour: 11, endHour: 15 },
        { name: 'Dîner', startHour: 19, endHour: 24 },
      ],
    });

    // Menu ────────────────────────────────────────────────────────────────
    await MenuItem.insertMany(
      v.menu.map((m) => ({
        venueId: venue._id,
        category: m.category,
        name: m.name,
        description: m.description,
        price: m.price,
        isPopular: m.isPopular ?? false,
        isAvailable: true,
      }))
    );
    menuCount += v.menu.length;

    console.log(
      `${v.type === 'CAFE' ? '☕' : '🍴'} ${v.name} — ${v.gallery.length} photos · ` +
        `${v.scenes.length} scènes 360° · ${v.tables.length} tables · 2 blocs · ${v.menu.length} plats`
    );
  }

  console.log(
    `\n✅ Seeded ${VENUES.length} venues (2 cafés + 2 restaurants) · ${tableCount} tables · ${menuCount} menu items.`
  );
  console.log('   Visit /cafe/nour-coffee-house-tunis  ·  /restaurant/la-table-dor-gammarth');
  await mongoose.connection.close();
  process.exit(0);
}

seedCafeRestaurant().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
