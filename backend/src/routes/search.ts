import { Router } from 'express';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { Event } from '../models/Event';

const router = Router();

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/search?q=... — search venues, rooms, events
router.get(['/', '/global'], async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ venues: [], events: [], lieux: [], chambres: [], evenements: [] });
    }

    const regex = new RegExp(escapeRegExp(q), 'i');

    const [venues, rooms, events] = await Promise.all([
      Venue.find({
        isPublished: true,
        archivedAt: null,
        $or: [
          { name: regex },
          { shortDescription: regex },
          { description: regex },
          { city: regex },
          { governorate: regex },
          { address: regex },
        ],
      })
        .select('name slug type shortDescription description city governorate address coverImage isFeatured isVedette hasVirtualTour immersiveType immersiveFile')
        .sort({ isFeatured: -1, isVedette: -1, name: 1 })
        .lean()
        .limit(10),
      Room.find()
        .populate('venueId', 'name city type')
        .lean()
        .then((list) =>
          list.filter(
            (r) =>
              regex.test((r.venueId as any)?.name || '') ||
              regex.test(String(r.roomType)) ||
              regex.test((r.venueId as any)?.city || '')
          )
        )
        .then((list) => list.slice(0, 10)),
      Event.find({
        isPublished: true,
        $or: [{ title: regex }, { description: regex }],
      })
        .select('venueId title slug type description coverImage afficheImageUrl startAt endsAt isVedette reservationMode ticketTypes')
        .populate('venueId', 'name city type coverImage hasVirtualTour immersiveType immersiveFile')
        .sort({ startAt: 1 })
        .lean()
        .limit(10),
    ]);

    // The frontend uses the real venue type to build its dedicated detail URL.
    const venueResults = venues.map((venue) => ({ ...venue, resultType: 'venue' }));
    const eventResults = events.map((event) => ({ ...event, resultType: 'event' }));

    res.json({
      venues: venueResults,
      events: eventResults,
      lieux: venueResults,
      chambres: rooms.map((r) => ({
        type: 'room',
        _id: r._id,
        roomNumber: (r as any).roomNumber,
        roomType: (r as any).roomType,
        venueId: (r as any).venueId?._id,
        venueName: (r as any).venueId?.name,
        city: (r as any).venueId?.city,
      })),
      evenements: eventResults,
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
