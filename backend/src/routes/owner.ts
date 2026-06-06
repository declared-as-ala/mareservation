import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest, requireAnyServiceDomains, requireEstablishmentOwner } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { Room } from '../models/Room';
import { Scene } from '../models/Scene';
import { Table } from '../models/Table';
import { TablePlacement } from '../models/TablePlacement';
import { ReservableUnit } from '../models/ReservableUnit';
import { TourHotspot } from '../models/TourHotspot';
import { logAudit } from '../utils/audit.util';
import { domainsToVenueTypes, normalizeServiceDomains, venueTypeToDomain } from '../utils/service-domain';

const router = Router();

async function resolveOwnedVenues(req: AuthRequest) {
  if (!req.userId) return [];
  if (req.userRole === 'ADMIN') return Venue.find({}).sort({ createdAt: -1 }).lean();
  const owner = await User.findById(req.userId).select('serviceDomains').lean();
  const domains = normalizeServiceDomains((owner as any)?.serviceDomains);
  const allowedVenueTypes = domainsToVenueTypes(domains);
  const filter: Record<string, unknown> = { ownerId: req.userId };
  if (allowedVenueTypes.length > 0) filter.type = { $in: allowedVenueTypes };
  return Venue.find(filter).sort({ createdAt: -1 }).lean();
}

async function assertOwnedVenue(venueId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) return null;
  const venue = await Venue.findById(venueId).select('_id ownerId type').lean();
  if (!venue) return null;
  if (req.userRole === 'ADMIN') return venue;
  if (String((venue as any).ownerId) !== String(req.userId)) return null;
  return venue;
}

router.get('/dashboard', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const ownerProfile = await User.findById(req.userId).select('serviceDomains').lean();
    const ownerDomains = normalizeServiceDomains((ownerProfile as any)?.serviceDomains);
    const venues = await resolveOwnedVenues(req);
    const derivedDomains = ownerDomains.length
      ? ownerDomains
      : Array.from(
          new Set(
            venues
              .map((v: any) => String(v?.type || '').toUpperCase())
              .filter(Boolean)
              .map((type) => venueTypeToDomain(type as any))
          )
        );
    if (!venues.length) {
      return res.json({
        venues: [],
        serviceDomains: derivedDomains,
        stats: { totalVenues: 0, totalReservations: 0, upcomingReservations: 0, confirmedReservations: 0 },
      });
    }

    const venueIds = venues.map((venue: any) => venue._id);
    const reservations = await Reservation.find({ venueId: { $in: venueIds } })
      .populate('venueId', 'name city')
      .sort({ startAt: -1 })
      .limit(100)
      .lean();

    const now = new Date();
    res.json({
      venues,
      serviceDomains: derivedDomains,
      stats: {
        totalVenues: venues.length,
        totalReservations: reservations.length,
        upcomingReservations: reservations.filter((item: any) => new Date(item.startAt) >= now).length,
        confirmedReservations: reservations.filter((item: any) => ['confirmed', 'CONFIRMED'].includes(item.status)).length,
      },
      recentReservations: reservations.slice(0, 12),
    });
  } catch (error) {
    console.error('Owner dashboard error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord proprietaire.' });
  }
});

router.get('/venues', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venues = await resolveOwnedVenues(req);
    res.json(venues);
  } catch (error) {
    console.error('Owner venues error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des lieux proprietaires.' });
  }
});

router.post('/venues', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifie.' });
    const {
      name,
      type,
      city,
      address,
      description,
      shortDescription,
      coverImage,
      gallery,
      phone,
      slug,
      immersiveType,
      immersiveSourceType,
      immersiveUrl,
      immersiveFile,
    } = req.body ?? {};
    if (!name || !type || !city || !address) {
      return res.status(400).json({ error: 'name, type, city, address requis.' });
    }

    const ownerProfile = await User.findById(req.userId).select('serviceDomains').lean();
    const ownerDomains = normalizeServiceDomains((ownerProfile as any)?.serviceDomains);
    if (ownerDomains.length > 0) {
      const neededDomain = venueTypeToDomain(String(type).toUpperCase() as any);
      if (!ownerDomains.includes(neededDomain)) {
        return res.status(403).json({ error: `Ce compte ne peut pas créer un établissement de type ${type}.` });
      }
    }

    const iType = ['none', 'virtual-tour', 'view-360'].includes(String(immersiveType || 'none'))
      ? String(immersiveType || 'none')
      : 'none';
    const venue = await Venue.create({
      ownerId: req.userId,
      name: String(name).trim(),
      type: String(type).toUpperCase(),
      city: String(city).trim(),
      address: String(address).trim(),
      description: description ? String(description).trim() : undefined,
      shortDescription: shortDescription ? String(shortDescription).trim() : undefined,
      coverImage: coverImage ? String(coverImage).trim() : undefined,
      gallery: Array.isArray(gallery) ? gallery.filter(Boolean) : [],
      phone: phone ? String(phone).trim() : undefined,
      slug: slug ? String(slug).trim() : undefined,
      immersiveType: iType,
      immersiveSourceType: iType === 'none' ? null : (immersiveSourceType || 'upload'),
      immersiveProvider: iType === 'none' ? null : 'custom',
      immersiveUrl: immersiveUrl || null,
      immersiveFile: immersiveFile || null,
      isPublished: true,
    });
    await logAudit(req, {
      action: 'VENUE_CREATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: venue._id as any,
      details: { flow: 'owner', type: venue.type, city: venue.city },
    });
    return res.status(201).json({ success: true, data: venue });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Slug déjà utilisé.' });
    console.error('Owner venue create error:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du lieu.' });
  }
});

router.patch('/venues/:id', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifie.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID invalide.' });
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (req.userRole !== 'ADMIN' && String((venue as any).ownerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }
    const allowed = [
      'name', 'city', 'address', 'description', 'shortDescription', 'coverImage', 'gallery',
      'phone', 'slug', 'isPublished', 'isFeatured', 'isVedette',
      'immersiveType', 'immersiveSourceType', 'immersiveUrl', 'immersiveFile',
    ];
    for (const key of allowed) {
      if ((req.body as any)?.[key] !== undefined) (venue as any)[key] = (req.body as any)[key];
    }
    const iType = String((venue as any).immersiveType || 'none');
    if (iType === 'none') {
      (venue as any).immersiveSourceType = null;
      (venue as any).immersiveProvider = null;
      (venue as any).immersiveUrl = null;
      (venue as any).immersiveFile = null;
    } else {
      (venue as any).immersiveProvider = 'custom';
      if (!(venue as any).immersiveSourceType) (venue as any).immersiveSourceType = 'upload';
    }
    await venue.save();
    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: venue._id as any,
      details: { flow: 'owner', fields: Object.keys(req.body || {}) },
    });
    return res.json({ success: true, data: venue });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Slug déjà utilisé.' });
    console.error('Owner venue update error:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du lieu.' });
  }
});

router.get('/venues/:id/scenes', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID invalide.' });
    const venue = await Venue.findById(req.params.id).select('_id ownerId').lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (req.userRole !== 'ADMIN' && String((venue as any).ownerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }
    const scenes = await Scene.find({ venueId: req.params.id, roomId: null, isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    return res.json({ success: true, data: scenes });
  } catch (error) {
    console.error('Owner scene list error:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des scènes.' });
  }
});

router.post('/venues/:id/scenes', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID invalide.' });
    const venue = await Venue.findById(req.params.id).select('_id ownerId').lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (req.userRole !== 'ADMIN' && String((venue as any).ownerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }
    const { name, image, description, order } = req.body ?? {};
    if (!name || !image) return res.status(400).json({ error: 'name et image requis.' });
    const scene = await Scene.create({
      venueId: req.params.id,
      roomId: null,
      name: String(name).trim(),
      image: String(image).trim(),
      description: description ? String(description).trim() : undefined,
      order: Number(order || 0),
      isActive: true,
    });
    await Venue.findByIdAndUpdate(req.params.id, {
      $set: { hasVirtualTour: true, immersiveType: 'view-360', immersiveSourceType: 'upload' },
    });
    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_scene_create', sceneId: String(scene._id) },
    });
    return res.status(201).json({ success: true, data: scene });
  } catch (error) {
    console.error('Owner scene create error:', error);
    return res.status(500).json({ error: 'Erreur création scène.' });
  }
});

router.delete('/venues/:id/scenes/:sceneId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.sceneId)) {
      return res.status(400).json({ error: 'ID invalide.' });
    }
    const venue = await Venue.findById(req.params.id).select('_id ownerId').lean();
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (req.userRole !== 'ADMIN' && String((venue as any).ownerId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }
    await Scene.deleteOne({ _id: req.params.sceneId, venueId: req.params.id, roomId: null });
    await TablePlacement.deleteMany({ venueId: req.params.id, sceneId: req.params.sceneId });
    await TourHotspot.deleteMany({ virtualTourId: req.params.sceneId, venueId: req.params.id });
    await TourHotspot.deleteMany({ targetType: 'scene', targetId: req.params.sceneId, venueId: req.params.id });
    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_scene_delete', sceneId: req.params.sceneId },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Owner scene delete error:', error);
    return res.status(500).json({ error: 'Erreur suppression scène.' });
  }
});

router.get('/venues/:id/scene-hotspots', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    const scenes = await Scene.find({ venueId: req.params.id, roomId: null, isActive: true }).select('_id').lean();
    const sceneIds = scenes.map((scene: any) => scene._id);
    const hotspots = sceneIds.length
      ? await TourHotspot.find({
          venueId: req.params.id,
          virtualTourId: { $in: sceneIds },
          targetType: 'scene',
          isActive: true,
        }).sort({ displayOrder: 1, createdAt: 1 }).lean()
      : [];
    return res.json({ success: true, data: hotspots });
  } catch (error) {
    console.error('Owner scene hotspots list error:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des liens 360.' });
  }
});

router.post('/venues/:id/scene-hotspots', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    const { sceneId, targetSceneId, label, xPercent, yPercent, yaw, pitch } = req.body ?? {};
    if (!sceneId || !targetSceneId || !label || xPercent == null || yPercent == null) {
      return res.status(400).json({ error: 'sceneId, targetSceneId, label, xPercent, yPercent requis.' });
    }
    if (!mongoose.Types.ObjectId.isValid(sceneId) || !mongoose.Types.ObjectId.isValid(targetSceneId)) {
      return res.status(400).json({ error: 'sceneId ou targetSceneId invalide.' });
    }
    const count = await Scene.countDocuments({
      _id: { $in: [sceneId, targetSceneId] },
      venueId: req.params.id,
      roomId: null,
      isActive: true,
    });
    if (count !== 2) return res.status(404).json({ error: 'Scene source ou destination introuvable.' });

    const hotspot = await TourHotspot.create({
      venueId: req.params.id,
      virtualTourId: sceneId,
      targetType: 'scene',
      targetId: targetSceneId,
      label: String(label).trim(),
      xPercent: Number(xPercent),
      yPercent: Number(yPercent),
      yaw: yaw != null ? Number(yaw) : undefined,
      pitch: pitch != null ? Number(pitch) : undefined,
      isActive: true,
    });

    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_scene_hotspot_create', hotspotId: String(hotspot._id), sceneId, targetSceneId },
    });

    return res.status(201).json({ success: true, data: hotspot });
  } catch (error) {
    console.error('Owner scene hotspot create error:', error);
    return res.status(500).json({ error: 'Erreur creation lien 360.' });
  }
});

router.delete('/venues/:id/scene-hotspots/:hotspotId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.hotspotId)) return res.status(400).json({ error: 'hotspotId invalide.' });
    const hotspot = await TourHotspot.findOneAndDelete({
      _id: req.params.hotspotId,
      venueId: req.params.id,
      targetType: 'scene',
    });
    if (!hotspot) return res.status(404).json({ error: 'Lien 360 introuvable.' });
    return res.json({ success: true, message: 'Lien 360 supprime.' });
  } catch (error) {
    console.error('Owner scene hotspot delete error:', error);
    return res.status(500).json({ error: 'Erreur suppression lien 360.' });
  }
});

// Tables (owner scoped)
router.get('/venues/:id/tables', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    const tables = await Table.find({ venueId: req.params.id }).sort({ displayOrder: 1, tableNumber: 1 }).lean();
    return res.json({ success: true, data: tables });
  } catch (error) {
    console.error('Owner tables list error:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des tables.' });
  }
});

router.post('/venues/:id/tables', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });

    const { name, capacity, price, minimumSpend, isVip } = req.body ?? {};
    if (!capacity || Number(capacity) < 1) return res.status(400).json({ error: 'capacity requis >= 1.' });
    if (price == null || Number(price) < 0) return res.status(400).json({ error: 'price requis >= 0.' });

    const lastTable = await Table.findOne({ venueId: req.params.id }).sort({ tableNumber: -1 }).select('tableNumber').lean();
    const nextTableNumber = Number((lastTable as any)?.tableNumber || 0) + 1;
    const code = `T${nextTableNumber}`;

    const table = await Table.create({
      venueId: req.params.id,
      tableNumber: nextTableNumber,
      code,
      name: String(name || `Table ${nextTableNumber}`).trim(),
      capacity: Number(capacity),
      capacityMax: Number(capacity),
      price: Number(price),
      basePrice: Number(price),
      minimumSpend: minimumSpend != null ? Number(minimumSpend) : undefined,
      isVip: !!isVip,
      isActive: true,
      isReservable: true,
      defaultStatus: 'available',
      locationLabel: '',
      priceType: 'fixed',
      currency: 'TND',
    });

    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_table_create', tableId: String(table._id), tableNumber: table.tableNumber },
    });

    return res.status(201).json({ success: true, data: table });
  } catch (error: any) {
    console.error('Owner table create error:', error);
    if (error?.code === 11000) return res.status(409).json({ error: 'Conflit numero/code table.' });
    return res.status(500).json({ error: 'Erreur lors de la creation de la table.' });
  }
});

router.patch('/venues/:id/tables/:tableId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.tableId)) return res.status(400).json({ error: 'tableId invalide.' });

    const table = await Table.findOne({ _id: req.params.tableId, venueId: req.params.id });
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });

    const { name, capacity, price, minimumSpend, isVip } = req.body ?? {};
    if (name !== undefined) table.name = String(name).trim();
    if (capacity !== undefined) {
      if (Number(capacity) < 1) return res.status(400).json({ error: 'capacity doit etre >= 1.' });
      table.capacity = Number(capacity);
      table.capacityMax = Number(capacity);
    }
    if (price !== undefined) {
      if (Number(price) < 0) return res.status(400).json({ error: 'price doit etre >= 0.' });
      table.price = Number(price);
      table.basePrice = Number(price);
    }
    if (minimumSpend !== undefined) table.minimumSpend = minimumSpend != null ? Number(minimumSpend) : undefined;
    if (isVip !== undefined) table.isVip = !!isVip;

    await table.save();

    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_table_update', tableId: req.params.tableId, fields: Object.keys(req.body || {}) },
    });

    return res.json({ success: true, data: table });
  } catch (error) {
    console.error('Owner table update error:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise a jour de la table.' });
  }
});

router.delete('/venues/:id/tables/:tableId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.tableId)) return res.status(400).json({ error: 'tableId invalide.' });

    const table = await Table.findOneAndDelete({ _id: req.params.tableId, venueId: req.params.id });
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });
    await TablePlacement.deleteMany({ venueId: req.params.id, tableId: req.params.tableId });

    await logAudit(req, {
      action: 'VENUE_UPDATED',
      userId: req.userId as any,
      entityType: 'venue',
      entityId: (venue as any)._id as any,
      details: { flow: 'owner_table_delete', tableId: req.params.tableId },
    });

    return res.json({ success: true, message: 'Table supprimee.' });
  } catch (error) {
    console.error('Owner table delete error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de la table.' });
  }
});

// Table placements (owner scoped)
router.get('/venues/:id/table-placements', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    const placements = await TablePlacement.find({ venueId: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: placements });
  } catch (error) {
    console.error('Owner table placements list error:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des placements.' });
  }
});

router.post('/venues/:id/table-placements', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });

    const { tableId, sceneId, yaw, pitch } = req.body ?? {};
    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) return res.status(400).json({ error: 'tableId requis.' });
    if (!sceneId) return res.status(400).json({ error: 'sceneId requis.' });
    if (yaw == null || pitch == null) return res.status(400).json({ error: 'yaw/pitch requis.' });

    const table = await Table.findOne({ _id: tableId, venueId: req.params.id }).select('_id').lean();
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });

    const placement = await TablePlacement.create({
      venueId: req.params.id,
      tableId,
      sceneId: String(sceneId),
      positionType: 'yaw_pitch',
      yaw: Number(yaw),
      pitch: Number(pitch),
    });

    return res.status(201).json({ success: true, data: placement });
  } catch (error: any) {
    console.error('Owner table placement create error:', error);
    if (error?.code === 11000) return res.status(409).json({ error: 'Placement deja existant pour cette scene/table.' });
    return res.status(500).json({ error: 'Erreur lors de la creation du placement.' });
  }
});

router.patch('/venues/:id/table-placements/:placementId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.placementId)) return res.status(400).json({ error: 'placementId invalide.' });

    const { yaw, pitch } = req.body ?? {};
    if (yaw == null || pitch == null) return res.status(400).json({ error: 'yaw/pitch requis.' });

    const placement = await TablePlacement.findOneAndUpdate(
      { _id: req.params.placementId, venueId: req.params.id, tableId: { $exists: true } },
      { $set: { yaw: Number(yaw), pitch: Number(pitch), positionType: 'yaw_pitch' } },
      { new: true }
    );
    if (!placement) return res.status(404).json({ error: 'Placement introuvable.' });

    return res.json({ success: true, data: placement });
  } catch (error) {
    console.error('Owner table placement update error:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise a jour du placement.' });
  }
});

router.delete('/venues/:id/table-placements/:placementId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.placementId)) return res.status(400).json({ error: 'placementId invalide.' });

    const placement = await TablePlacement.findOneAndDelete({
      _id: req.params.placementId,
      venueId: req.params.id,
      tableId: { $exists: true },
    });
    if (!placement) return res.status(404).json({ error: 'Placement introuvable.' });
    return res.json({ success: true, message: 'Placement supprime.' });
  } catch (error) {
    console.error('Owner table placement delete error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du placement.' });
  }
});

// Coworking unit placements (owner scoped)
router.get('/venues/:id/unit-placements', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (String((venue as any).type) !== 'COWORKING') return res.status(400).json({ error: 'Venue non coworking.' });

    const placements = await TablePlacement.find({
      venueId: req.params.id,
      reservableUnitId: { $exists: true },
    }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: placements });
  } catch (error) {
    console.error('Owner unit placements list error:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des placements unites.' });
  }
});

router.post('/venues/:id/unit-placements', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (String((venue as any).type) !== 'COWORKING') return res.status(400).json({ error: 'Venue non coworking.' });

    const { reservableUnitId, sceneId, yaw, pitch } = req.body ?? {};
    if (!reservableUnitId || !mongoose.Types.ObjectId.isValid(reservableUnitId)) return res.status(400).json({ error: 'reservableUnitId requis.' });
    if (!sceneId) return res.status(400).json({ error: 'sceneId requis.' });
    if (yaw == null || pitch == null) return res.status(400).json({ error: 'yaw/pitch requis.' });

    const unit = await ReservableUnit.findOne({ _id: reservableUnitId, venueId: req.params.id }).lean();
    if (!unit) return res.status(404).json({ error: 'Unite introuvable.' });

    const placement = await TablePlacement.create({
      venueId: req.params.id,
      reservableUnitId,
      sceneId: String(sceneId),
      positionType: 'yaw_pitch',
      yaw: Number(yaw),
      pitch: Number(pitch),
    });

    return res.status(201).json({ success: true, data: placement });
  } catch (error: any) {
    console.error('Owner unit placement create error:', error);
    if (error?.code === 11000) return res.status(409).json({ error: 'Placement deja existant pour cette scene/unite.' });
    return res.status(500).json({ error: 'Erreur lors de la creation du placement unite.' });
  }
});

router.patch('/venues/:id/unit-placements/:placementId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.placementId)) return res.status(400).json({ error: 'placementId invalide.' });

    const { yaw, pitch } = req.body ?? {};
    if (yaw == null || pitch == null) return res.status(400).json({ error: 'yaw/pitch requis.' });

    const placement = await TablePlacement.findOneAndUpdate(
      { _id: req.params.placementId, venueId: req.params.id, reservableUnitId: { $exists: true } },
      { $set: { yaw: Number(yaw), pitch: Number(pitch), positionType: 'yaw_pitch' } },
      { new: true }
    );
    if (!placement) return res.status(404).json({ error: 'Placement unite introuvable.' });
    return res.json({ success: true, data: placement });
  } catch (error) {
    console.error('Owner unit placement update error:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise a jour du placement unite.' });
  }
});

router.delete('/venues/:id/unit-placements/:placementId', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venue = await assertOwnedVenue(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.placementId)) return res.status(400).json({ error: 'placementId invalide.' });

    const placement = await TablePlacement.findOneAndDelete({
      _id: req.params.placementId,
      venueId: req.params.id,
      reservableUnitId: { $exists: true },
    });
    if (!placement) return res.status(404).json({ error: 'Placement unite introuvable.' });

    return res.json({ success: true, message: 'Placement unite supprime.' });
  } catch (error) {
    console.error('Owner unit placement delete error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du placement unite.' });
  }
});

router.get('/reservations', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const venues = await resolveOwnedVenues(req);
    const venueIds = venues.map((venue: any) => venue._id);
    if (!venueIds.length) return res.json([]);

    const reservations = await Reservation.find({ venueId: { $in: venueIds } })
      .populate('venueId', 'name city')
      .populate('userId', 'fullName email')
      .sort({ startAt: -1 })
      .lean();
    res.json(reservations);
  } catch (error) {
    console.error('Owner reservations error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des reservations proprietaire.' });
  }
});

router.patch('/reservations/:id/verify-qr', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifie.' });
    const reservation = await Reservation.findById(req.params.id).populate('venueId', 'ownerId');
    if (!reservation) return res.status(404).json({ error: 'Reservation introuvable.' });
    const ownerId = String((reservation.venueId as any)?.ownerId || '');
    if (req.userRole !== 'ADMIN' && ownerId !== req.userId) return res.status(403).json({ error: 'Acces refuse.' });
    if (reservation.checkInStatus === 'checked_in') return res.status(400).json({ error: 'Deja verifiee.' });
    reservation.checkInStatus = 'checked_in';
    reservation.checkedInAt = new Date();
    reservation.checkedInBy = req.userId as any;
    reservation.status = 'checked_in';
    await reservation.save();
    await logAudit(req, {
      action: 'RESERVATION_CHECKED_IN',
      userId: req.userId as any,
      entityType: 'reservation',
      entityId: reservation._id as any,
      details: { flow: 'owner_qr_verify' },
    });
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Owner QR verify error:', error);
    res.status(500).json({ error: 'Erreur verification QR.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Rooms management for hotel owners (full CRUD scoped to their venues)
// ─────────────────────────────────────────────────────────────────────

async function assertHotelOwnedByCaller(venueId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) return null;
  const venue = await Venue.findById(venueId).select('_id type ownerId').lean();
  if (!venue || (venue as any).type !== 'HOTEL') return null;
  if (req.userRole === 'ADMIN') return venue;
  if (String((venue as any).ownerId) !== String(req.userId)) return null;
  return venue;
}

async function assertRoomOwnedByCaller(roomId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(roomId)) return null;
  const room = await Room.findById(roomId);
  if (!room) return null;
  const venue = await assertHotelOwnedByCaller(String(room.venueId), req);
  if (!venue) return null;
  return room;
}

// GET /api/v1/owner/hotels/:id/rooms
router.get('/hotels/:id/rooms', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    const venue = await assertHotelOwnedByCaller(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Hôtel introuvable ou non autorisé.' });
    const rooms = await Room.find({ venueId: (venue as any)._id }).sort({ pricePerNight: 1 }).lean();
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Owner rooms list error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// POST /api/v1/owner/hotels/:id/rooms
router.post('/hotels/:id/rooms', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    const venue = await assertHotelOwnedByCaller(req.params.id, req);
    if (!venue) return res.status(404).json({ error: 'Hôtel introuvable ou non autorisé.' });
    const { roomNumber, roomType, capacity, pricePerNight } = req.body;
    if (!roomNumber || !roomType || !capacity || !pricePerNight) {
      return res.status(400).json({ error: 'roomNumber, roomType, capacity, pricePerNight requis.' });
    }
    const room = await Room.create({ venueId: (venue as any)._id, ...req.body });
    await logAudit(req, {
      userId: req.userId as any,
      action: 'ROOM_CREATED',
      entityType: 'venue',
      entityId: (venue as any)._id,
      details: { roomId: String(room._id), roomNumber: room.roomNumber, roomType: room.roomType, pricePerNight: room.pricePerNight, flow: 'owner' },
    });
    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    console.error('Owner room create error:', error);
    if (error.code === 11000) return res.status(409).json({ error: 'Numéro de chambre déjà utilisé.' });
    res.status(500).json({ error: 'Erreur.' });
  }
});

// PATCH /api/v1/owner/rooms/:id — update room (including gallery + panoramicImages)
router.patch('/rooms/:id', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    const room = await assertRoomOwnedByCaller(req.params.id, req);
    if (!room) return res.status(404).json({ error: 'Chambre introuvable ou non autorisé.' });
    Object.assign(room, req.body);
    await room.save();
    await logAudit(req, {
      userId: req.userId as any,
      action: 'ROOM_UPDATED',
      entityType: 'venue',
      entityId: room.venueId as any,
      details: { roomId: String(room._id), flow: 'owner', fields: Object.keys(req.body || {}) },
    });
    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Owner room update error:', error);
    if (error.code === 11000) return res.status(409).json({ error: 'Numéro de chambre déjà utilisé.' });
    res.status(500).json({ error: 'Erreur.' });
  }
});

// DELETE /api/v1/owner/rooms/:id
router.delete('/rooms/:id', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    const room = await assertRoomOwnedByCaller(req.params.id, req);
    if (!room) return res.status(404).json({ error: 'Chambre introuvable ou non autorisé.' });
    const venueId = room.venueId;
    const snapshot = { roomNumber: room.roomNumber, roomType: room.roomType, name: room.name };
    await room.deleteOne();
    await logAudit(req, {
      userId: req.userId as any,
      action: 'ROOM_DELETED',
      entityType: 'venue',
      entityId: venueId as any,
      details: { roomId: req.params.id, snapshot, flow: 'owner' },
    });
    res.json({ success: true, message: 'Chambre supprimée.' });
  } catch (error) {
    console.error('Owner room delete error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Revenue Reports
// GET /api/v1/owner/revenue?venueId=&period=month|year&year=&month=
// ─────────────────────────────────────────────────────────────────────
router.get('/revenue', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Non authentifié.' });

    const { venueId, period, year: yearStr, month: monthStr } = req.query as Record<string, string>;
    const periodType = period === 'year' ? 'year' : 'month';
    const year = parseInt(yearStr) || new Date().getFullYear();
    const month = parseInt(monthStr) || (new Date().getMonth() + 1); // 1-12

    // Resolve owned venue IDs
    let venueIds: mongoose.Types.ObjectId[];
    if (req.userRole === 'ADMIN') {
      const allVenues = await Venue.find({}).select('_id').lean();
      venueIds = allVenues.map((v: any) => v._id);
    } else {
      const ownedVenues = await Venue.find({ ownerId: req.userId }).select('_id').lean();
      venueIds = ownedVenues.map((v: any) => v._id);
    }

    if (!venueIds.length) {
      return res.json({
        totalRevenue: 0, totalNights: 0, reservationCount: 0, avgDailyRate: 0,
        occupancyRate: 0, cancellationRate: 0, noShowRate: 0,
        byRoomType: [], byMonth: [], byDay: [], topRooms: [],
      });
    }

    // If specific venueId requested, verify ownership
    let targetVenueIds = venueIds;
    if (venueId && mongoose.Types.ObjectId.isValid(venueId)) {
      const oid = new mongoose.Types.ObjectId(venueId);
      const owned = venueIds.some((id) => id.toString() === venueId);
      if (!owned && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
      targetVenueIds = [oid];
    }

    // Period date range
    let periodStart: Date;
    let periodEnd: Date;
    let daysInPeriod: number;

    if (periodType === 'year') {
      periodStart = new Date(year, 0, 1, 0, 0, 0);
      periodEnd = new Date(year + 1, 0, 1, 0, 0, 0);
      daysInPeriod = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
    } else {
      periodStart = new Date(year, month - 1, 1, 0, 0, 0);
      periodEnd = new Date(year, month, 1, 0, 0, 0);
      daysInPeriod = new Date(year, month, 0).getDate();
    }

    const completedStatuses = ['completed', 'COMPLETED', 'confirmed', 'CONFIRMED', 'checked_in'];
    const cancelledStatuses = ['cancelled', 'CANCELLED'];
    const noShowStatuses = ['no_show', 'NO_SHOW'];

    const baseMatch = {
      venueId: { $in: targetVenueIds },
      bookingType: 'ROOM',
      startAt: { $gte: periodStart, $lt: periodEnd },
    };

    // Fetch completed reservations
    const [completedRaw, cancelledCount, noShowCount, allRooms] = await Promise.all([
      Reservation.find({
        ...baseMatch,
        status: { $in: completedStatuses },
        paymentStatus: 'paid',
      }).populate('roomId', 'name roomType roomNumber').lean(),
      Reservation.countDocuments({ ...baseMatch, status: { $in: cancelledStatuses } }),
      Reservation.countDocuments({ ...baseMatch, status: { $in: noShowStatuses } }),
      Room.find({ venueId: { $in: targetVenueIds }, isActive: true }).select('_id roomType').lean(),
    ]);

    const completed = completedRaw as any[];
    const totalRevenue = completed.reduce((s, r) => s + (Number(r.totalPrice) || 0), 0);
    const totalNights = completed.reduce((s, r) => s + (Number(r.nights) || 1), 0);
    const reservationCount = completed.length;
    const avgDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;

    // Occupancy rate: booked room-nights / (total rooms × days in period) × 100
    const totalRooms = allRooms.length;
    const occupancyRate = totalRooms > 0 && daysInPeriod > 0
      ? Math.min(100, (totalNights / (totalRooms * daysInPeriod)) * 100)
      : 0;

    const totalForRate = reservationCount + cancelledCount + noShowCount;
    const cancellationRate = totalForRate > 0 ? (cancelledCount / totalForRate) * 100 : 0;
    const noShowRate = totalForRate > 0 ? (noShowCount / totalForRate) * 100 : 0;

    // By room type
    const roomTypeMap: Record<string, { type: string; count: number; revenue: number }> = {};
    for (const r of completed) {
      const rt = (r.roomId as any)?.roomType || 'Inconnu';
      if (!roomTypeMap[rt]) roomTypeMap[rt] = { type: rt, count: 0, revenue: 0 };
      roomTypeMap[rt].count += 1;
      roomTypeMap[rt].revenue += Number(r.totalPrice) || 0;
    }
    const byRoomType = Object.values(roomTypeMap).sort((a, b) => b.revenue - a.revenue);

    // By month (year view) or by day (month view)
    const byMonth: { month: number; count: number; revenue: number }[] = [];
    const byDay: { day: number; count: number; revenue: number }[] = [];

    if (periodType === 'year') {
      const monthMap: Record<number, { count: number; revenue: number }> = {};
      for (const r of completed) {
        const m = new Date(r.startAt).getMonth() + 1;
        if (!monthMap[m]) monthMap[m] = { count: 0, revenue: 0 };
        monthMap[m].count += 1;
        monthMap[m].revenue += Number(r.totalPrice) || 0;
      }
      for (let m = 1; m <= 12; m++) {
        byMonth.push({ month: m, count: monthMap[m]?.count ?? 0, revenue: monthMap[m]?.revenue ?? 0 });
      }
    } else {
      const dayMap: Record<number, { count: number; revenue: number }> = {};
      for (const r of completed) {
        const d = new Date(r.startAt).getDate();
        if (!dayMap[d]) dayMap[d] = { count: 0, revenue: 0 };
        dayMap[d].count += 1;
        dayMap[d].revenue += Number(r.totalPrice) || 0;
      }
      for (let d = 1; d <= daysInPeriod; d++) {
        byDay.push({ day: d, count: dayMap[d]?.count ?? 0, revenue: dayMap[d]?.revenue ?? 0 });
      }
    }

    // Top 5 rooms by revenue
    const roomRevMap: Record<string, { roomId: string; name: string; nights: number; revenue: number }> = {};
    for (const r of completed) {
      const rid = r.roomId?._id ? String(r.roomId._id) : String(r.roomId || '');
      if (!rid) continue;
      if (!roomRevMap[rid]) {
        const rName = (r.roomId as any)?.name || `Chambre ${(r.roomId as any)?.roomNumber ?? rid}`;
        roomRevMap[rid] = { roomId: rid, name: rName, nights: 0, revenue: 0 };
      }
      roomRevMap[rid].nights += Number(r.nights) || 1;
      roomRevMap[rid].revenue += Number(r.totalPrice) || 0;
    }
    const topRooms = Object.values(roomRevMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalNights,
      reservationCount,
      avgDailyRate: Math.round(avgDailyRate * 100) / 100,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      byRoomType,
      byMonth,
      byDay,
      topRooms,
    });
  } catch (error) {
    console.error('Owner revenue error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des rapports.' });
  }
});

export default router;
