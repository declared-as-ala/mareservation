import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Event } from '../models/Event';
import { Venue } from '../models/Venue';
import { Scene } from '../models/Scene';

const EVENT_MEDIA = [
  {
    slug: 'rooftop-sunset-dj-skyline',
    title: 'Rooftop Sunset DJ',
    type: 'concert',
    startAt: '2026-06-12T20:00:00.000Z',
    endsAt: '2026-06-13T01:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1800&q=85',
    galleryUrls: [
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=85',
    ],
    tickets: [
      { name: 'Normal', price: 45, capacity: 2400, maxPerOrder: 10 },
      { name: 'VIP Rooftop', price: 130, capacity: 300, maxPerOrder: 6 },
    ],
    scenes: [
      { name: 'Rooftop 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-1.jpg' },
      { name: 'Dancefloor 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-2.jpg' },
    ],
  },
  {
    slug: 'concert-live-el-teatro',
    title: 'Concert Live',
    type: 'concert',
    startAt: '2026-06-20T19:30:00.000Z',
    endsAt: '2026-06-20T23:30:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85',
    galleryUrls: [
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1400&q=85',
    ],
    tickets: [
      { name: 'Normal', price: 35, capacity: 2600, maxPerOrder: 10 },
      { name: 'VIP Front Row', price: 95, capacity: 400, maxPerOrder: 4 },
    ],
    scenes: [
      { name: 'Salle principale 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-3.jpg' },
      { name: 'Balcon 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-1.jpg' },
    ],
  },
  {
    slug: 'soiree-jazz-babol',
    title: 'Soiree Jazz',
    type: 'concert',
    startAt: '2026-06-27T20:30:00.000Z',
    endsAt: '2026-06-27T23:45:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=1800&q=85',
    galleryUrls: [
      'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1400&q=85',
    ],
    tickets: [
      { name: 'Normal', price: 28, capacity: 900, maxPerOrder: 8 },
      { name: 'Table VIP', price: 80, capacity: 120, maxPerOrder: 6 },
    ],
    scenes: [
      { name: 'Lounge Jazz 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-2.jpg' },
    ],
  },
  {
    slug: 'nuit-latina-mojito',
    title: 'Nuit Latina',
    type: 'festival',
    startAt: '2026-07-04T21:00:00.000Z',
    endsAt: '2026-07-05T02:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1800&q=85',
    galleryUrls: [
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85',
    ],
    tickets: [
      { name: 'Normal', price: 40, capacity: 1800, maxPerOrder: 10 },
      { name: 'VIP Salsa', price: 110, capacity: 220, maxPerOrder: 6 },
    ],
    scenes: [
      { name: 'Piste Latina 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-3.jpg' },
      { name: 'Bar 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-2.jpg' },
    ],
  },
  {
    slug: 'beach-party-azure',
    title: 'Beach Party',
    type: 'festival',
    startAt: '2026-07-18T18:00:00.000Z',
    endsAt: '2026-07-19T01:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1800&q=85',
    galleryUrls: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1496024840928-4c417adf211d?auto=format&fit=crop&w=1400&q=85',
    ],
    tickets: [
      { name: 'Normal', price: 55, capacity: 3000, maxPerOrder: 10 },
      { name: 'VIP Beach Deck', price: 150, capacity: 350, maxPerOrder: 6 },
    ],
    scenes: [
      { name: 'Beach Club 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-1.jpg' },
      { name: 'Pool Stage 360', image: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-3.jpg' },
    ],
  },
];

const FALLBACK_EVENT_VENUES: Record<string, { name: string; slug: string; city: string; address: string; description: string }> = {
  'soiree-jazz-babol': {
    name: 'Babol Jazz Club',
    slug: 'babol-jazz-club-tunis',
    city: 'Tunis',
    address: 'Centre Urbain Nord, Tunis',
    description: 'Club intimiste pour concerts jazz, showcases live et soirees privees avec experience 360.',
  },
  'nuit-latina-mojito': {
    name: 'Mojito Latino Club',
    slug: 'mojito-latino-club-tunis',
    city: 'Tunis',
    address: 'La Marsa, Tunis',
    description: 'Espace evenementiel latino pour danse, DJ sets et soirees a theme avec zones VIP.',
  },
};

async function main() {
  await connectDatabase();

  for (const item of EVENT_MEDIA) {
    const event = await Event.findOne({ slug: item.slug });
    if (!event) {
      console.warn(`Event not found: ${item.slug}`);
      continue;
    }

    event.title = item.title;
    event.type = item.type as any;
    event.startAt = new Date(item.startAt);
    event.endsAt = new Date(item.endsAt);
    event.coverImage = item.coverImage;
    event.afficheImageUrl = item.coverImage;
    event.galleryUrls = item.galleryUrls;
    event.description = event.description || `${item.title} avec billets Normal et VIP, acces QR et experience immersive 360 du lieu.`;
    event.reservationMode = item.tickets.some((ticket) => ticket.name.toLowerCase().includes('vip')) ? 'seat_zone' : 'ticket';
    event.isPublished = true;
    event.approvalStatus = 'approved';
    event.ticketTypes = item.tickets.map((ticket) => ({
      _id: new mongoose.Types.ObjectId(),
      name: ticket.name,
      price: ticket.price,
      capacity: ticket.capacity,
      sold: 0,
      maxPerOrder: ticket.maxPerOrder,
      isActive: true,
      salesStartAt: new Date(),
      salesEndAt: new Date(new Date(item.startAt).getTime() - 60 * 60 * 1000),
    })) as any;
    await event.save();

    let venue = await Venue.findById(event.venueId);
    if (!venue) {
      const fallback = FALLBACK_EVENT_VENUES[item.slug] || {
        name: `${item.title} Venue`,
        slug: `${item.slug}-venue`,
        city: 'Tunis',
        address: 'Tunis',
        description: `Espace evenementiel pour ${item.title}.`,
      };
      venue = await Venue.findOneAndUpdate(
        { slug: fallback.slug },
        {
          $setOnInsert: {
            ...fallback,
            type: 'EVENT_SPACE',
            isPublished: true,
            approvalStatus: 'approved',
            reservationModes: ['ticket', 'seat_zone'],
            startingPrice: Math.min(...item.tickets.map((ticket) => ticket.price)),
          },
        },
        { upsert: true, new: true }
      );
    }
    if (!venue) {
      throw new Error(`Unable to create or load venue for event: ${item.slug}`);
    }
    event.venueId = venue._id as any;

    venue.coverImage = venue.coverImage || item.galleryUrls[0] || item.coverImage;
    venue.gallery = Array.from(new Set([...(venue.gallery || []), item.coverImage, ...item.galleryUrls]));
    venue.hasVirtualTour = true;
    venue.immersiveType = 'view-360';
    venue.immersiveSourceType = 'upload';
    venue.immersiveFile = venue.immersiveFile || item.scenes[0]?.image;
    await venue.save();
    await event.save();

    const existingScenes = await Scene.countDocuments({ venueId: venue._id });
    if (existingScenes === 0) {
      await Scene.insertMany(
        item.scenes.map((scene, index) => ({
          venueId: venue._id,
          name: scene.name,
          image: scene.image,
          order: index,
          isActive: true,
        }))
      );
    }

    console.log(`Seeded event media: ${event.title}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
