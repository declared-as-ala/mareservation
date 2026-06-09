import { Router } from 'express';
import { Reservation } from '../models/Reservation';
import { Table } from '../models/Table';
import { Room } from '../models/Room';
import { Seat } from '../models/Seat';
import { ReservableUnit } from '../models/ReservableUnit';
import { ReservationHold } from '../models/ReservationHold';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateConfirmationCode } from '../utils/confirmationCode';
import { generateQRDataURL } from '../utils/qr';
import { sendEmail } from '../services/email.service';
import {
  createReservationQrAttachment,
  createReservationTicketEmail,
  RESERVATION_QR_CONTENT_ID,
} from '../services/reservation-ticket-email';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function overlaps(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && end1 > start2;
}

// POST /api/reservations — create reservation (TABLE | ROOM | SEAT); prevent conflicts
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });

    const {
      venueId,
      bookingType,
      reservableUnitId,
      tableId,
      roomId,
      seatId,
      startAt,
      endAt,
      totalPrice,
      guestFirstName,
      guestLastName,
      guestPhone,
      guestEmail,
      partySize,
    } = req.body;
    if (!venueId || !startAt || !endAt) {
      return res.status(400).json({ error: 'venueId, startAt and endAt are required' });
    }
    if (!guestFirstName?.trim()) return res.status(400).json({ error: 'Prénom est requis' });
    if (!guestLastName?.trim()) return res.status(400).json({ error: 'Nom est requis' });
    if (!guestPhone?.trim()) return res.status(400).json({ error: 'Téléphone est requis' });
    const phone = String(guestPhone).trim().replace(/\s/g, '');
    if (!/^(\+216|216)?[0-9]{8}$/.test(phone) && !/^[0-9]{8}$/.test(phone)) {
      return res.status(400).json({ error: 'Format téléphone invalide (ex: 12345678 ou +21612345678)' });
    }
    const party = Number(partySize) || 1;
    if (party < 1 || party > 20) return res.status(400).json({ error: 'Nombre de personnes doit être entre 1 et 20' });
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (start >= end) return res.status(400).json({ error: 'startAt must be before endAt' });

    const isCoworking = bookingType === 'COWORKING';
    const type =
      bookingType === 'ROOM' || bookingType === 'SEAT' || bookingType === 'COWORKING'
        ? bookingType
        : 'TABLE';
    let total = Number(totalPrice) || 0;

    if (isCoworking) {
      if (!reservableUnitId) return res.status(400).json({ error: 'reservableUnitId required for coworking booking' });
      const unit = await ReservableUnit.findOne({
        _id: reservableUnitId,
        venueId,
        status: 'active',
        isReservable: true,
      });
      if (!unit) return res.status(404).json({ error: 'Coworking unit not found' });
      if (party > Number(unit.capacityMax || party)) {
        return res.status(400).json({ error: `Capacité max: ${unit.capacityMax} personnes` });
      }
      total = total || Number(unit.basePrice || 0);
      const existing = await Reservation.find({
        reservableUnitId,
        status: { $in: ['PENDING', 'CONFIRMED', 'pending', 'confirmed', 'checked_in'] },
      });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt)) {
          return res.status(409).json({ error: 'This coworking unit is already reserved for the selected time.' });
        }
      }
    } else if (type === 'TABLE') {
      if (!tableId) return res.status(400).json({ error: 'tableId required for table booking' });
      const table = await Table.findOne({ _id: tableId, venueId });
      if (!table) return res.status(404).json({ error: 'Table not found' });
      const tableCap = (table as any).capacity ?? 4;
      if (party > tableCap) return res.status(400).json({ error: `Capacité max: ${tableCap} personnes` });
      total = total || (table as any).price;
      const existing = await Reservation.find({ tableId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This table is already reserved for the selected time.' });
      }
    } else if (type === 'ROOM') {
      if (!roomId) return res.status(400).json({ error: 'roomId required for room booking' });
      const room = await Room.findOne({ _id: roomId, venueId });
      if (!room) return res.status(404).json({ error: 'Room not found' });
      const roomCap = (room as any).capacity ?? 4;
      if (party > roomCap) return res.status(400).json({ error: `Capacité max: ${roomCap} personnes` });
      total = total || (room as any).pricePerNight;
      const existing = await Reservation.find({ roomId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This room is already reserved for the selected nights.' });
      }
    } else {
      if (!seatId) return res.status(400).json({ error: 'seatId required for seat booking' });
      const seat = await Seat.findOne({ _id: seatId, venueId });
      if (!seat) return res.status(404).json({ error: 'Seat not found' });
      if (party > 1) return res.status(400).json({ error: '1 place par siège' });
      total = total || (seat as any).price;
      const existing = await Reservation.find({ seatId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This seat is already reserved.' });
      }
    }

    let confirmationCode = generateConfirmationCode(8);
    let exists = await Reservation.findOne({ confirmationCode });
    while (exists) {
      confirmationCode = generateConfirmationCode(8);
      exists = await Reservation.findOne({ confirmationCode });
    }

    const reservation = new Reservation({
      userId: req.userId,
      venueId,
      bookingType: type,
      reservableUnitId: isCoworking ? reservableUnitId : undefined,
      tableId: type === 'TABLE' ? tableId : undefined,
      roomId: type === 'ROOM' ? roomId : undefined,
      seatId: type === 'SEAT' ? seatId : undefined,
      startAt: start,
      endAt: end,
      status: 'CONFIRMED',
      paymentStatus: 'unpaid',
      confirmationCode,
      totalPrice: total,
      guestFirstName: String(guestFirstName).trim(),
      guestLastName: String(guestLastName).trim(),
      guestPhone: phone,
      customerEmail: typeof guestEmail === 'string' && guestEmail.trim() ? guestEmail.trim().toLowerCase() : undefined,
      partySize: party,
      source: 'web',
    });
    await reservation.save();
    await reservation.populate(['reservableUnitId', 'tableId', 'roomId', 'seatId', 'venueId']);

    const ticketUrl = `${FRONTEND_URL}/reservation/${reservation._id}/confirmation`;
    const verifyUrl = `${FRONTEND_URL}/reservation/${reservation._id}/verify?code=${confirmationCode}`;
    const qrPayload = verifyUrl;
    let qrCodeImageUrl: string | undefined;
    try {
      qrCodeImageUrl = await generateQRDataURL(qrPayload, { width: 320, margin: 1 });
      reservation.qrCodeData = qrPayload;
      reservation.qrCodeImageUrl = qrCodeImageUrl;
      await reservation.save();
    } catch (error) {
      console.warn('Reservation QR generation failed:', error);
    }

    const customerEmail =
      reservation.customerEmail ||
      (await User.findById(req.userId).select('email').lean())?.email;
    if (customerEmail) {
      const venue = reservation.venueId as any;
      const table = reservation.tableId as any;
      const room = reservation.roomId as any;
      const seat = reservation.seatId as any;
      const reservableUnit = reservation.reservableUnitId as any;
      const venueTypeLabels: Record<string, string> = {
        CAFE: 'Réservation café',
        CAFE_LOUNGE: 'Réservation café lounge',
        RESTAURANT: 'Réservation restaurant',
        HOTEL: 'Séjour hôtel',
        MAISON_DHOTE: "Séjour maison d'hôte",
        CINEMA: 'Billet cinéma',
        EVENT_SPACE: 'Réservation événement',
        COWORKING: 'Réservation coworking',
      };
      const unitLabel =
        isCoworking
          ? reservableUnit?.label
          : type === 'TABLE'
          ? table?.locationLabel || (table?.tableNumber != null ? `Table ${table.tableNumber}` : undefined)
          : type === 'ROOM'
            ? room?.roomType || (room?.roomNumber != null ? `Chambre ${room.roomNumber}` : undefined)
            : seat?.zone || (seat?.seatNumber != null ? `Place ${seat.seatNumber}` : undefined);
      const template = createReservationTicketEmail({
        guestName: `${reservation.guestFirstName ?? ''} ${reservation.guestLastName ?? ''}`.trim() || 'Client',
        reservationCode: confirmationCode,
        venueName: venue?.name || 'Votre établissement',
        experienceLabel: venueTypeLabels[venue?.type] || 'Réservation',
        status: 'confirmed',
        ticketUrl,
        qrImageSrc: qrCodeImageUrl ? `cid:${RESERVATION_QR_CONTENT_ID}` : undefined,
        address: [venue?.address, venue?.city].filter(Boolean).join(', ') || undefined,
        phone: venue?.phone,
        details: [
          {
            label: type === 'ROOM' ? 'Arrivée' : 'Date',
            value: start.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          },
          { label: 'Heure', value: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
          ...(type === 'ROOM'
            ? [{
                label: 'Départ',
                value: end.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }),
              }]
            : []),
          { label: type === 'SEAT' ? 'Billets' : 'Personnes', value: String(party) },
          ...(unitLabel
            ? [{
                label: isCoworking ? 'Espace' : type === 'TABLE' ? 'Table' : type === 'ROOM' ? 'Chambre' : 'Place',
                value: unitLabel,
                accent: true,
              }]
            : []),
          ...(total > 0 ? [{ label: 'Total', value: `${total.toLocaleString('fr-FR')} TND`, accent: true }] : []),
        ],
        note: 'Conservez cet email et présentez votre QR ticket ou votre référence à votre arrivée.',
      });
      const qrAttachment = createReservationQrAttachment(qrCodeImageUrl);
      void sendEmail({
        to: customerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: qrAttachment ? [qrAttachment] : undefined,
      });
    }

    res.status(201).json({
      message: 'Réservation créée',
      reservation: {
        _id: reservation._id,
        userId: reservation.userId,
        venueId: reservation.venueId,
        bookingType: reservation.bookingType,
        reservableUnitId: reservation.reservableUnitId,
        tableId: reservation.tableId,
        roomId: reservation.roomId,
        seatId: reservation.seatId,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        status: reservation.status,
        paymentStatus: reservation.paymentStatus,
        confirmationCode: reservation.confirmationCode,
        totalPrice: reservation.totalPrice,
        guestFirstName: reservation.guestFirstName,
        guestLastName: reservation.guestLastName,
        guestPhone: reservation.guestPhone,
        partySize: reservation.partySize,
        createdAt: reservation.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

async function getMyReservations(req: AuthRequest, res: import('express').Response) {
  if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
  const list = await Reservation.find({ userId: req.userId })
    .populate('tableId', 'tableNumber capacity locationLabel price isVip')
    .populate('roomId', 'roomNumber roomType capacity pricePerNight')
    .populate('seatId', 'seatNumber zone price')
    .populate('venueId', 'name address city')
    .sort({ startAt: -1 });
  res.json(list);
}

// GET /api/reservations/me and GET /api/reservations — current user's reservations
router.get(['/me', '/'], authenticate, async (req: AuthRequest, res) => {
  try {
    await getMyReservations(req, res);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

router.post('/holds', authenticate, async (req: AuthRequest, res) => {
  try {
    const { venueId, reservableUnitId, tableId, roomId, seatId, startsAt, endsAt, peopleCount } = req.body ?? {};
    const resources = [reservableUnitId, tableId, roomId, seatId].filter(Boolean);
    if (!venueId || !startsAt || !endsAt || resources.length !== 1) {
      return res.status(400).json({ error: 'venueId, startsAt, endsAt et exactement une ressource sont requis.' });
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
      return res.status(400).json({ error: 'Période invalide.' });
    }
    await ReservationHold.updateMany(
      { status: 'active', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );
    const resourceFilter = reservableUnitId ? { reservableUnitId } : tableId ? { tableId } : roomId ? { roomId } : { seatId };
    const conflict = await ReservationHold.exists({
      ...resourceFilter,
      status: 'active',
      expiresAt: { $gt: new Date() },
      startsAt: { $lt: end },
      endsAt: { $gt: start },
    });
    if (conflict) return res.status(409).json({ error: 'Cette ressource est temporairement réservée.' });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const hold = await ReservationHold.create({
      venueId,
      reservableUnitId,
      tableId,
      roomId,
      seatId,
      userId: req.userId,
      dateKey: start.toISOString().slice(0, 10),
      startsAt: start,
      endsAt: end,
      peopleCount: Number(peopleCount || 1),
      status: 'active',
      expiresAt,
    });
    res.status(201).json({ success: true, data: { _id: hold._id, expiresAt: hold.expiresAt } });
  } catch (error) {
    console.error('Error creating reservation hold:', error);
    res.status(500).json({ error: 'Erreur de création du hold.' });
  }
});

router.delete('/holds/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const filter: Record<string, unknown> = { _id: req.params.id };
    if (req.userRole !== 'ADMIN') filter.userId = req.userId;
    const hold = await ReservationHold.findOneAndUpdate(filter, { $set: { status: 'released' } }, { new: true });
    if (!hold) return res.status(404).json({ error: 'Hold introuvable.' });
    res.json({ success: true, message: 'Hold libéré.' });
  } catch (error) {
    console.error('Error releasing reservation hold:', error);
    res.status(500).json({ error: 'Erreur de libération du hold.' });
  }
});

// GET /api/reservations/:id/ticket — ticket data for QR display/print
router.get('/:id/ticket', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    })
      .populate('venueId', 'name address city')
      .populate('tableId', 'tableNumber capacity price')
      .populate('roomId', 'roomNumber roomType pricePerNight')
      .populate('seatId', 'seatNumber zone price')
      .lean();
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    const v = reservation.venueId as any;
    const payload = (reservation as any).confirmationCode || reservation._id.toString();
    res.json({
      _id: reservation._id,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      status: reservation.status,
      bookingType: reservation.bookingType,
      totalPrice: reservation.totalPrice,
      partySize: reservation.partySize,
      confirmationCode: (reservation as any).confirmationCode,
      venueName: v?.name,
      venueAddress: v?.address,
      venueCity: v?.city,
      tableNumber: (reservation.tableId as any)?.tableNumber,
      roomNumber: (reservation.roomId as any)?.roomNumber,
      seatNumber: (reservation.seatId as any)?.seatNumber,
      qrPayload: payload,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// GET /api/reservations/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    })
      .populate('tableId')
      .populate('roomId')
      .populate('seatId')
      .populate('venueId');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// PATCH /api/reservations/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Reservation already cancelled' });
    }
    reservation.status = 'CANCELLED';
    await reservation.save();
    res.json({ message: 'Reservation cancelled', reservation });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

export default router;
