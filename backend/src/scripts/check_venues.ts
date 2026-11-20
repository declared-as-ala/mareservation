import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Venue } from '../models/Venue';
import { VirtualTour } from '../models/VirtualTour';
import { TourHotspot } from '../models/TourHotspot';
import { TableHotspot } from '../models/TableHotspot';
import { Scene } from '../models/Scene';
import { TablePlacement } from '../models/TablePlacement';
import { Table } from '../models/Table';
import { Room } from '../models/Room';
import { Seat } from '../models/Seat';

dotenv.config();

async function run() {
  await connectDatabase();
  const venues = await Venue.find({}).sort({ type: 1, name: 1 });
  console.log(`=== Total venues in DB: ${venues.length} ===\n`);

  for (const v of venues) {
    const [tours, scenes, tableHotspots, tourHotspots, placements, tables, rooms, seats] = await Promise.all([
      VirtualTour.find({ venueId: v._id }),
      Scene.find({ venueId: v._id }),
      TableHotspot.find({ venueId: v._id }),
      TourHotspot.find({ virtualTourId: { $in: await VirtualTour.find({ venueId: v._id }).distinct('_id') } }),
      TablePlacement.find({ venueId: v._id }),
      Table.find({ venueId: v._id }),
      Room.find({ venueId: v._id }),
      Seat.find({ venueId: v._id }),
    ]);

    console.log(`[${v.type}] "${v.name}" (slug: ${v.slug})`);
    console.log(`  hasVirtualTour: ${(v as any).hasVirtualTour}`);
    console.log(`  VirtualTours: ${tours.length}, Scenes: ${scenes.length}`);
    console.log(`  TableHotspots: ${tableHotspots.length}, TourHotspots: ${tourHotspots.length}, Placements: ${placements.length}`);
    console.log(`  Tables: ${tables.length}, Rooms: ${rooms.length}, Seats: ${seats.length}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);

