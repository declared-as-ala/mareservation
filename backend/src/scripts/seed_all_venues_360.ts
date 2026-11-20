/**
 * Seed 360 images (Scenes, VirtualTours) and Hotspots (TablePlacements, TourHotspots, TableHotspots)
 * for EVERY establishment in the database.
 *
 * Idempotent and safe:
 *  - Upserts scenes, virtual tours, and hotspots for every existing venue.
 *  - Sets venue-level 360 fields (hasVirtualTour, immersiveType, immersiveFile).
 *  - Ensures tables/rooms exist with positions and hotspots.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Venue } from '../models/Venue';
import { VirtualTour } from '../models/VirtualTour';
import { TourHotspot } from '../models/TourHotspot';
import { Scene } from '../models/Scene';
import { Table } from '../models/Table';
import { TablePlacement } from '../models/TablePlacement';
import { TableHotspot } from '../models/TableHotspot';
import { Room } from '../models/Room';

dotenv.config();

const KLAPTY_EMBED = 'https://www.klapty.com/tour/tunnel/IBJ0xpE8hq';

// Real equirectangular (2:1) interior/exterior 360° photos from Wikimedia Commons
// (free licences), matched to the kind of place each establishment is.
// Local equirectangular (2:1) interior/exterior 360 photos hosted locally (/uploads/panoramas/)
const PANO_DIR = '/uploads/panoramas';
const p = (file: string) => `${PANO_DIR}/${file}`;

const PANOS = {
  resto1: p('resto1.jpg'),
  resto2: p('resto2.jpg'),
  cafe1: p('cafe1.jpg'),
  cafe2: p('cafe2.jpg'),
  hotel1: p('hotel1.jpg'),
  hotel2: p('hotel2.jpg'),
  maison1: p('maison1.jpg'),
  maison2: p('maison2.jpg'),
  lounge1: p('lounge1.jpg'),
  lounge2: p('lounge2.jpg'),
  bar1: p('bar1.jpg'),
  bar2: p('bar2.jpg'),
  roof1: p('roof1.jpg'),
  club1: p('club1.jpg'),
  event1: p('event1.jpg'),
  event2: p('event2.jpg'),
  stade1: p('stade1.jpg'),
  stade2: p('stade2.jpg'),
};

type Plan = { img1: string; img2: string; n1: string; n2: string };

// Per-establishment plan (by slug) so each 360° matches the place.
const BY_SLUG: Record<string, Plan> = {
  'cafe-lumiere': { img1: PANOS.cafe1, img2: PANOS.cafe2, n1: 'Salle du café', n2: 'Espace détente' },
  bruscheta: { img1: PANOS.resto1, img2: PANOS.resto2, n1: 'Salle du restaurant', n2: 'Grande salle' },
  'el-mouradi-palace': { img1: PANOS.hotel1, img2: PANOS.hotel2, n1: 'Chambre / Suite', n2: 'Chambre Deluxe' },
  'dar-el-medina': { img1: PANOS.maison1, img2: PANOS.maison2, n1: 'Salon & chambre', n2: "Chambre d'hôte" },
  'atelier-lac-2': { img1: PANOS.lounge2, img2: PANOS.event2, n1: 'Espace coworking', n2: 'Salle de réunion' },
  'riad-azura': { img1: PANOS.lounge1, img2: PANOS.bar2, n1: 'Espace de travail', n2: 'Lounge & accueil' },
  'skyline-rooftop-bar': { img1: PANOS.roof1, img2: PANOS.bar1, n1: 'Rooftop', n2: 'Bar intérieur' },
  'club-nocturne': { img1: PANOS.club1, img2: PANOS.bar2, n1: 'Grande salle', n2: 'Foyer' },
  'le-qg': { img1: PANOS.lounge1, img2: PANOS.lounge2, n1: 'Lounge principal', n2: 'Espace lounge' },
  'hangar-events': { img1: PANOS.event1, img2: PANOS.event2, n1: 'Grande salle événementielle', n2: 'Salle de conférence' },
  'stade-olympique': { img1: PANOS.stade1, img2: PANOS.stade2, n1: 'Stade - vue centrale', n2: 'Tribunes' },
};

async function seedAllVenues360() {
  await connectDatabase();
  const venues = await Venue.find({});
  console.log(`\n🚀 Seeding 360 images & hotspots for ${venues.length} establishments...\n`);

  for (const v of venues) {
    console.log(`Processing: [${v.type}] "${v.name}" (${v.slug})`);
    const vid = v._id;
    const vtype = String(v.type || '').toUpperCase();

    // Per-establishment panoramas matched to the kind of place
    const fallback: Plan =
      vtype === 'HOTEL' || vtype === 'MAISON_DHOTE'
        ? { img1: PANOS.hotel1, img2: PANOS.hotel2, n1: 'Chambre', n2: 'Suite' }
        : vtype === 'COWORKING'
        ? { img1: PANOS.lounge2, img2: PANOS.event2, n1: 'Espace de travail', n2: 'Salle de réunion' }
        : vtype === 'EVENT_SPACE'
        ? { img1: PANOS.event1, img2: PANOS.event2, n1: 'Grande salle', n2: 'Salle annexe' }
        : vtype === 'RESTAURANT'
        ? { img1: PANOS.resto1, img2: PANOS.resto2, n1: 'Salle du restaurant', n2: 'Grande salle' }
        : vtype === 'CAFE'
        ? { img1: PANOS.cafe1, img2: PANOS.cafe2, n1: 'Salle du café', n2: 'Espace détente' }
        : { img1: PANOS.lounge1, img2: PANOS.bar1, n1: 'Salle principale', n2: 'Bar' };
    const plan: Plan = BY_SLUG[String(v.slug)] ?? fallback;
    const img1 = plan.img1;
    const img2 = plan.img2;
    const scene1Name = plan.n1;
    const scene2Name = plan.n2;

    // 1. Update Venue fields
    await Venue.updateOne(
      { _id: vid },
      {
        $set: {
          hasVirtualTour: true,
          immersiveType: 'view-360',
          immersiveSourceType: 'upload',
          immersiveProvider: 'custom',
          immersiveFile: img1,
          virtualTourUrl: KLAPTY_EMBED,
          isPublished: true,
          approvalStatus: 'approved',
        },
      }
    );

    // 2. Ensure VirtualTour
    await VirtualTour.deleteMany({ venueId: vid });
    const vt = await VirtualTour.create({
      venueId: vid,
      provider: 'pannellum',
      embedUrl: KLAPTY_EMBED,
      previewImage: img1,
      aspectRatio: 16 / 9,
      isActive: true,
    });

    // 3. Upsert 2 360 Scenes for this venue
    await Scene.deleteMany({ venueId: vid });
    const scene1 = await Scene.create({
      venueId: vid,
      name: scene1Name,
      description: `Vue 360° immersive : ${scene1Name}`,
      image: img1,
      order: 0,
      isActive: true,
    });
    const scene2 = await Scene.create({
      venueId: vid,
      name: scene2Name,
      description: `Vue 360° immersive : ${scene2Name}`,
      image: img2,
      order: 1,
      isActive: true,
    });

    // 4. Navigation Hotspots (linking Scene 1 <-> Scene 2)
    await TourHotspot.deleteMany({
      virtualTourId: { $in: [scene1._id, scene2._id, vt._id] },
    });

    await TourHotspot.create({
      virtualTourId: scene1._id,
      targetType: 'scene',
      targetId: scene2._id,
      label: `Aller à : ${scene2Name}`,
      xPercent: 78,
      yPercent: 50,
      isActive: true,
    });

    await TourHotspot.create({
      virtualTourId: scene2._id,
      targetType: 'scene',
      targetId: scene1._id,
      label: `Retour : ${scene1Name}`,
      xPercent: 22,
      yPercent: 50,
      isActive: true,
    });

    // 5. Handle Units (Tables vs Rooms)
    if (vtype === 'HOTEL' || vtype === 'MAISON_DHOTE') {
      // Ensure Rooms exist
      let rooms = await Room.find({ venueId: vid });
      if (rooms.length === 0) {
        rooms = await Room.insertMany([
          {
            venueId: vid,
            roomNumber: 101,
            name: 'Chambre Supérieure Vue Jardin',
            roomType: 'SUPERIEURE',
            capacity: 2,
            capacityAdults: 2,
            bedType: 'Queen Size',
            pricePerNight: v.startingPrice || 180,
            hasVirtualTour: true,
            panoramicImages: [img1],
            isActive: true,
            isReservable: true,
          },
          {
            venueId: vid,
            roomNumber: 201,
            name: 'Suite Deluxe Vue Mer',
            roomType: 'SUITE',
            capacity: 4,
            capacityAdults: 2,
            capacityChildren: 2,
            bedType: 'King Size',
            pricePerNight: (v.startingPrice || 180) * 1.6,
            hasVirtualTour: true,
            panoramicImages: [img2],
            isActive: true,
            isReservable: true,
          },
        ]);
      } else {
        // Update existing rooms to enable 360
        await Room.updateMany(
          { venueId: vid },
          {
            $set: {
              hasVirtualTour: true,
              panoramicImages: [img1, img2],
              isActive: true,
              isReservable: true,
            },
          }
        );
      }

      // Add room hotspots in Scene 1 and Scene 2
      if (rooms[0]) {
        await TourHotspot.create({
          virtualTourId: scene1._id,
          targetType: 'room',
          targetId: rooms[0]._id,
          label: `Chambre: ${rooms[0].name || rooms[0].roomNumber}`,
          xPercent: 40,
          yPercent: 55,
          isActive: true,
        });
      }
      if (rooms[1]) {
        await TourHotspot.create({
          virtualTourId: scene2._id,
          targetType: 'room',
          targetId: rooms[1]._id,
          label: `Suite: ${rooms[1].name || rooms[1].roomNumber}`,
          xPercent: 60,
          yPercent: 55,
          isActive: true,
        });
      }
    } else {
      // Dining / Coworking / Lounge / Club / Event Space: ensure Tables & Placements
      let tables = await Table.find({ venueId: vid }).sort({ tableNumber: 1 });
      if (tables.length === 0) {
        const tableConfigs = [
          { num: 1, name: 'Table 1 - Fenêtre', cap: 2, spend: 20, isVip: false, locationLabel: 'Fenêtre' },
          { num: 2, name: 'Table 2 - Centrale', cap: 4, spend: 35, isVip: false, locationLabel: 'Salle principale' },
          { num: 3, name: 'Table 3 - Confort', cap: 4, spend: 40, isVip: false, locationLabel: 'Terrasse' },
          { num: 4, name: 'Table 4 - Grande Table', cap: 6, spend: 60, isVip: false, locationLabel: 'Terrasse' },
          { num: 5, name: 'Table 5 - Carré VIP', cap: 6, spend: 100, isVip: true, locationLabel: 'Lounge VIP' },
        ];
        tables = await Table.insertMany(
          tableConfigs.map((tc) => ({
            venueId: vid,
            tableNumber: tc.num,
            code: `T${tc.num}`,
            name: tc.name,
            capacity: tc.cap,
            capacityMin: 1,
            capacityMax: tc.cap,
            locationLabel: tc.locationLabel,
            minimumSpend: tc.spend,
            price: tc.spend,
            isVip: tc.isVip,
            isActive: true,
            isReservable: true,
            defaultStatus: 'available',
            displayOrder: tc.num,
          }))
        );
      }

      // Clear existing placements and table hotspots
      await TablePlacement.deleteMany({ venueId: vid });
      await TableHotspot.deleteMany({ venueId: vid });

      // Placement slots: 3 in scene 1, remainder in scene 2
      const slots = [
        { scene: scene1, yaw: -2.1, pitch: -0.32, xPercent: 18, yPercent: 60 },
        { scene: scene1, yaw: -0.2, pitch: -0.38, xPercent: 47, yPercent: 62 },
        { scene: scene1, yaw: 1.8, pitch: -0.30, xPercent: 78, yPercent: 59 },
        { scene: scene2, yaw: -1.2, pitch: -0.35, xPercent: 30, yPercent: 61 },
        { scene: scene2, yaw: 0.8, pitch: -0.33, xPercent: 65, yPercent: 60 },
        { scene: scene2, yaw: 2.1, pitch: -0.28, xPercent: 82, yPercent: 58 },
      ];

      for (let i = 0; i < tables.length; i++) {
        const slot = slots[i % slots.length];
        const tbl = tables[i];

        // 1. TablePlacement for 360 viewer (yaw/pitch)
        await TablePlacement.create({
          venueId: vid,
          tableId: tbl._id,
          sceneId: slot.scene._id.toString(),
          positionType: 'yaw_pitch',
          yaw: slot.yaw,
          pitch: slot.pitch,
        });

        // 2. TableHotspot
        await TableHotspot.create({
          venueId: vid,
          tableId: tbl._id,
          sceneId: slot.scene._id.toString(),
          pitch: slot.pitch,
          yaw: slot.yaw,
          label: tbl.name || `Table ${tbl.tableNumber}`,
        });

        // 3. TourHotspot on the scene
        await TourHotspot.create({
          virtualTourId: slot.scene._id,
          targetType: 'table',
          targetId: tbl._id,
          label: tbl.name || `Table ${tbl.tableNumber}`,
          xPercent: slot.xPercent,
          yPercent: slot.yPercent,
          isActive: true,
        });
      }
    }

    console.log(`  ✅ Done! Configured 2 scenes, 360 viewer & hotspots for "${v.name}"`);
  }

  console.log('\n🎉 ALL ESTABLISHMENTS HAVE BEEN SUCCESSFULLY SEEDED WITH 360 & HOTSPOTS!\n');
  await mongoose.disconnect();
}

seedAllVenues360().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
