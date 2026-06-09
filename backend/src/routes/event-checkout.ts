import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { Event } from '../models/Event';
import { Reservation } from '../models/Reservation';
import { generateQRDataURL } from '../utils/qr';
import { sendEmail } from '../services/email.service';
import {
  createReservationQrAttachment,
  createReservationTicketEmail,
  RESERVATION_QR_CONTENT_ID,
} from '../services/reservation-ticket-email';

const router = Router();
const EVENT_SERVICE_FEE_TND = 1.5;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';

function makeCode(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// POST /api/v1/event-checkout/orders
router.post('/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifie.' });

    const {
      eventId,
      ticketTypeId,
      quantity,
      firstName,
      lastName,
      email,
      phone,
      paymentMethod = 'online_mock',
    } = req.body ?? {};

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ error: 'eventId invalide.' });
    const qty = Number(quantity || 1);
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'Quantite invalide.' });
    if (!ticketTypeId || !mongoose.Types.ObjectId.isValid(String(ticketTypeId))) {
      return res.status(400).json({ error: 'Type de billet requis.' });
    }
    if (!firstName || !lastName || !email) return res.status(400).json({ error: 'Informations client incompletes.' });

    const event = await Event.findById(eventId).populate('venueId', 'name address city');
    if (!event) return res.status(404).json({ error: 'Evenement introuvable.' });
    if (event.approvalStatus !== 'approved' || !event.isPublished) {
      return res.status(400).json({ error: 'Evenement non disponible a la reservation.' });
    }

    const ticketType = (event.ticketTypes ?? []).find((t: any) => String(t._id) === String(ticketTypeId));
    if (!ticketType || ticketType.isActive === false) return res.status(404).json({ error: 'Type de billet introuvable.' });
    const now = new Date();
    if (ticketType.salesStartAt && now < new Date(ticketType.salesStartAt)) {
      return res.status(400).json({ error: 'La vente n a pas commence pour ce billet.' });
    }
    if (ticketType.salesEndAt && now > new Date(ticketType.salesEndAt)) {
      return res.status(400).json({ error: 'La vente est terminee pour ce billet.' });
    }
    if (qty > Number(ticketType.maxPerOrder || 10)) {
      return res.status(400).json({ error: `Quantite max par commande: ${ticketType.maxPerOrder || 10}.` });
    }
    const remaining = Number(ticketType.capacity || 0) - Number(ticketType.sold || 0);
    if (remaining < qty) return res.status(400).json({ error: 'Stock insuffisant.' });

    const ticketObjectId = new mongoose.Types.ObjectId(String(ticketTypeId));
    const maxSoldBeforeOrder = Number(ticketType.capacity || 0) - qty;
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: event._id,
        approvalStatus: 'approved',
        isPublished: true,
        ticketTypes: {
          $elemMatch: {
            _id: ticketObjectId,
            isActive: { $ne: false },
            sold: { $lte: maxSoldBeforeOrder },
          },
        },
      },
      { $inc: { 'ticketTypes.$.sold': qty } },
      { new: true }
    ).populate('venueId', 'name address city');

    if (!updatedEvent) {
      return res.status(409).json({ error: 'Stock insuffisant ou billet indisponible.' });
    }

    const reservationCode = makeCode('EVT');
    const confirmationCode = makeCode('CF');
    const subtotal = Number(ticketType.price || 0) * qty;
    const serviceFee = EVENT_SERVICE_FEE_TND * qty;
    const total = subtotal + serviceFee;
    const isCashOrder = paymentMethod === 'cash_order';
    const cashExpiresAt = isCashOrder ? new Date(Date.now() + 4 * 60 * 60 * 1000) : undefined;

    let reservation;
    try {
      reservation = await Reservation.create({
        reservationCode,
        confirmationCode,
        userId,
        venueId: event.venueId,
        eventId: event._id,
        bookingType: 'SEAT',
        startAt: event.startAt,
        endAt: event.endsAt || event.startAt,
        status: 'confirmed',
        paymentStatus: isCashOrder ? 'pending' : 'paid',
        paymentMethod: isCashOrder ? 'cash' : 'online',
        partySize: qty,
        peopleCount: qty,
        totalPrice: total,
        amountPaid: isCashOrder ? 0 : total,
        remainingAmount: isCashOrder ? total : 0,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerEmail: email,
        customerPhone: phone,
        notes: `event_ticket:${ticketType.name};quantity:${qty};cash_expires_at:${cashExpiresAt?.toISOString() || ''}`,
        priceBreakdown: {
          subtotal,
          serviceFee,
          total,
          currency: 'TND',
        },
        source: 'event_checkout',
      });
    } catch (createError) {
      await Event.updateOne(
        { _id: event._id, 'ticketTypes._id': ticketObjectId },
        { $inc: { 'ticketTypes.$.sold': -qty } }
      );
      throw createError;
    }

    const qrPayload = `${FRONTEND_URL}/reservation/${reservation._id}/verify?code=${confirmationCode}`;
    const qrCodeImageUrl = await generateQRDataURL(qrPayload, { width: 320, margin: 1 });
    reservation.qrCodeData = qrPayload;
    reservation.qrCodeImageUrl = qrCodeImageUrl;
    await reservation.save();

    if (email) {
      const venue = event.venueId as any;
      const ticketUrl = `${FRONTEND_URL}/reservation/${reservation._id}/confirmation`;
      const startsAt = new Date(event.startAt);
      const template = createReservationTicketEmail({
        guestName: `${firstName} ${lastName}`.trim(),
        reservationCode,
        venueName: event.title,
        experienceLabel: 'Billet événement',
        status: 'confirmed',
        ticketUrl,
        qrImageSrc: `cid:${RESERVATION_QR_CONTENT_ID}`,
        address: [venue?.name, venue?.address, venue?.city].filter(Boolean).join(', ') || undefined,
        details: [
          { label: 'Billet', value: `${ticketType.name} x${qty}`, accent: true },
          {
            label: 'Date',
            value: startsAt.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          },
          { label: 'Heure', value: startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Paiement', value: isCashOrder ? 'À régler' : 'Payé' },
          { label: 'Total', value: `${total.toLocaleString('fr-FR')} TND`, accent: true },
        ],
        note: 'Chaque ticket est unique. Ne partagez pas votre QR code avant votre arrivée.',
      });
      const qrAttachment = createReservationQrAttachment(qrCodeImageUrl);
      void sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: qrAttachment ? [qrAttachment] : undefined,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        reservationId: reservation._id,
        reservationCode,
        confirmationCode,
        eventTitle: event.title,
        ticketTypeName: ticketType.name,
        quantity: qty,
        subtotal,
        serviceFee,
        totalPrice: total,
        paymentStatus: reservation.paymentStatus,
        cashExpiresAt,
        qrCodeImageUrl,
      },
    });
  } catch (error) {
    console.error('event-checkout/order failed', error);
    res.status(500).json({ error: 'Erreur lors de la creation de la commande.' });
  }
});

export default router;
