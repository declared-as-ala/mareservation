import { Router, Request } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAnyServiceDomains, requireRoles, type AuthRequest } from '../middleware/auth';
import { Event } from '../models/Event';
import { Venue } from '../models/Venue';
import { logAudit } from '../utils/audit.util';

const router = Router();
const EVENT_RESERVATION_MODES = ['ticket', 'seat_zone', 'seat', 'table'];

router.use(authenticate, requireRoles('ESTABLISHMENT_OWNER', 'ORGANIZER', 'ADMIN'), requireAnyServiceDomains('EVENT', 'EVENT_SPACE'));

function isPrivileged(role?: string) {
  return role === 'ADMIN' || role === 'ORGANIZER';
}

// GET /api/v1/owner-events
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const role = req.userRole;
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });

    let venueIds: mongoose.Types.ObjectId[] = [];
    if (!isPrivileged(role)) {
      const venues = await Venue.find({ ownerId: userId }).select('_id').lean();
      venueIds = venues.map((v: any) => v._id);
    }

    const filter: any = isPrivileged(role)
      ? { createdBy: userId }
      : { venueId: { $in: venueIds } };

    const events = await Event.find(filter)
      .populate('venueId', 'name city')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('owner-events list error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// POST /api/v1/owner-events
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    const {
      venueId,
      title,
      type,
      description,
      coverImage,
      galleryUrls,
      startAt,
      endsAt,
      reservationMode,
      ageRestriction,
      termsFr,
      ticketTypes = [],
    } = req.body ?? {};

    if (!venueId || !mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ error: 'venueId invalide.' });
    }
    if (!title || !startAt) {
      return res.status(400).json({ error: 'title et startAt requis.' });
    }

    const venue = await Venue.findById(venueId).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!isPrivileged(req.userRole) && String((venue as any).ownerId ?? '') !== String(userId)) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const slug = String(title).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const event = await Event.create({
      venueId,
      title,
      slug,
      type: type || 'other',
      description: description || '',
      coverImage: coverImage || undefined,
      afficheImageUrl: coverImage || undefined,
      galleryUrls: Array.isArray(galleryUrls) ? galleryUrls.filter(Boolean) : [],
      startAt: new Date(startAt),
      endsAt: endsAt ? new Date(endsAt) : undefined,
      reservationMode: EVENT_RESERVATION_MODES.includes(reservationMode) ? reservationMode : 'ticket',
      isPublished: false,
      approvalStatus: 'draft',
      ticketTypes: Array.isArray(ticketTypes)
        ? ticketTypes.map((t: any) => ({
            name: t.name || 'Standard',
            price: Number(t.price || 0),
            capacity: Number(t.capacity || 0),
            sold: Number(t.sold || 0),
            salesStartAt: t.salesStartAt ? new Date(t.salesStartAt) : undefined,
            salesEndAt: t.salesEndAt ? new Date(t.salesEndAt) : undefined,
            maxPerOrder: Number(t.maxPerOrder || 10),
            isActive: t.isActive !== false,
          }))
        : [],
      ageRestriction: ageRestriction || undefined,
      termsFr: termsFr || undefined,
      createdBy: userId,
      updatedBy: userId,
      organizerName: (req as any).user?.fullName,
    });

    await logAudit(req as unknown as Request, {
      action: 'EVENT_CREATED',
      userId,
      entityType: 'event',
      entityId: event._id as mongoose.Types.ObjectId,
      details: { flow: 'owner_events_create', title: event.title, venueId },
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('owner-events create error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// PATCH /api/v1/owner-events/:id
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID invalide.' });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

    const venue = await Venue.findById(event.venueId).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!isPrivileged(req.userRole) && String((venue as any).ownerId ?? '') !== String(userId)) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const {
      title,
      type,
      description,
      coverImage,
      galleryUrls,
      startAt,
      endsAt,
      reservationMode,
      ageRestriction,
      termsFr,
      ticketTypes,
    } = req.body ?? {};

    if (title !== undefined) event.title = title;
    if (type !== undefined) event.type = type;
    if (description !== undefined) event.description = description;
    if (coverImage !== undefined) {
      (event as any).coverImage = coverImage || undefined;
      (event as any).afficheImageUrl = coverImage || undefined;
    }
    if (Array.isArray(galleryUrls)) (event as any).galleryUrls = galleryUrls.filter(Boolean);
    if (startAt !== undefined) event.startAt = new Date(startAt);
    if (endsAt !== undefined) event.endsAt = endsAt ? new Date(endsAt) : undefined;
    if (reservationMode !== undefined && EVENT_RESERVATION_MODES.includes(reservationMode)) {
      (event as any).reservationMode = reservationMode;
    }
    if (ageRestriction !== undefined) (event as any).ageRestriction = ageRestriction || undefined;
    if (termsFr !== undefined) (event as any).termsFr = termsFr || undefined;
    if (Array.isArray(ticketTypes)) {
      (event as any).ticketTypes = ticketTypes.map((t: any) => ({
        _id: t._id && mongoose.Types.ObjectId.isValid(t._id) ? t._id : new mongoose.Types.ObjectId(),
        name: t.name || 'Standard',
        price: Number(t.price || 0),
        capacity: Number(t.capacity || 0),
        sold: Number(t.sold || 0),
        salesStartAt: t.salesStartAt ? new Date(t.salesStartAt) : undefined,
        salesEndAt: t.salesEndAt ? new Date(t.salesEndAt) : undefined,
        maxPerOrder: Number(t.maxPerOrder || 10),
        isActive: t.isActive !== false,
      }));
    }
    event.updatedBy = userId as any;
    await event.save();

    await logAudit(req as unknown as Request, {
      action: 'EVENT_UPDATED',
      userId,
      entityType: 'event',
      entityId: event._id as mongoose.Types.ObjectId,
      details: { flow: 'owner_events_update', eventId: id },
    });

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('owner-events update error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// POST /api/v1/owner-events/:id/submit
router.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID invalide.' });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    const venue = await Venue.findById(event.venueId).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!isPrivileged(req.userRole) && String((venue as any).ownerId ?? '') !== String(userId)) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const activeTicketTypes = (event.ticketTypes ?? []).filter((t: any) => t.isActive !== false);
    const totalCapacity = activeTicketTypes.reduce((sum: number, t: any) => sum + Number(t.capacity || 0), 0);
    if (!activeTicketTypes.length || totalCapacity <= 0) {
      return res.status(400).json({ error: 'Ajoutez au moins un type de billet avec une capacite.' });
    }
    if (!event.description || String(event.description).trim().length < 20) {
      return res.status(400).json({ error: 'Ajoutez une description claire avant la moderation.' });
    }

    event.approvalStatus = 'pending_review';
    event.adminNote = undefined;
    event.rejectionReason = undefined;
    event.isPublished = false;
    event.updatedBy = userId as any;
    await event.save();

    await logAudit(req as unknown as Request, {
      action: 'EVENT_UPDATED',
      userId,
      entityType: 'event',
      entityId: event._id as mongoose.Types.ObjectId,
      details: { flow: 'owner_events_submit_review', eventId: id },
    });

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('owner-events submit error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

export default router;
