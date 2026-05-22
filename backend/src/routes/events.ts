import { Router } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/Event';
import { EventSession } from '../models/EventSession';
import { Venue } from '../models/Venue';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { city, type, venueId, upcoming, includeUnpublished } = req.query;
    const filter: Record<string, unknown> = {};

    if (upcoming !== 'false') filter.startAt = { $gte: new Date() };
    if (includeUnpublished !== 'true') {
      filter.isPublished = true;
      filter.approvalStatus = 'approved';
    }
    if (type) filter.type = type;
    if (venueId) filter.venueId = venueId;
    if (city) {
      const venueIds = await Venue.find({ city }).distinct('_id');
      filter.venueId = { $in: venueIds };
    }

    const events = await Event.find(filter)
      .populate('venueId', 'name address city coverImage gallery hasVirtualTour immersiveType immersiveFile')
      .sort({ startAt: 1 });

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:id/sessions', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const event = await (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
      ? Event.findById(idOrSlug)
      : Event.findOne({ slug: idOrSlug })
    ).lean();
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });
    const sessions = await EventSession.find({ eventId: (event as any)._id })
      .sort({ startsAt: 1 })
      .lean();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching event sessions:', error);
    res.status(500).json({ error: 'Echec du chargement des sessions.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const event = await (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
      ? Event.findById(idOrSlug)
      : Event.findOne({ slug: idOrSlug })
    ).populate('venueId');
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });
    if (!event.isPublished || event.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Evenement non trouve' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: "Echec du chargement de l'evenement." });
  }
});

export default router;
