import { Router } from 'express';
import mongoose from 'mongoose';
import { SupportCase } from '../models/SupportCase';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logger } from '../config/logger';
import { logAudit } from '../utils/audit.util';
import { AppSettings } from '../models/AppSettings';
import { User } from '../models/User';
import { sendEmail } from '../services/email.service';

const router = Router();

async function getSupportRecipientEmails(): Promise<string[]> {
  const out = new Set<string>();
  const settings = await AppSettings.findOne({}).sort({ updatedAt: -1 }).select('supportEmail').lean();
  if (settings?.supportEmail) out.add(String(settings.supportEmail).trim().toLowerCase());
  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email').lean();
  for (const admin of admins) {
    if (admin.email) out.add(String(admin.email).trim().toLowerCase());
  }
  return [...out];
}

async function notifySupportCaseOpened(caseNumber: string, subject: string, body: string) {
  try {
    const recipients = await getSupportRecipientEmails();
    if (!recipients.length) return;
    const html = `<p>Nouvelle demande support <strong>${caseNumber}</strong></p><p><strong>${subject}</strong></p><p>${body}</p>`;
    await Promise.all(recipients.map((to) => sendEmail({ to, subject: `[Support] Nouveau dossier ${caseNumber}`, html, text: `${subject}\n${body}` })));
  } catch (err) {
    logger.warn('notifySupportCaseOpened failed', err as any);
  }
}

/* ─── User routes ───────────────────────────────────────────────────── */

// POST /support/cases — open a new case
router.post('/cases', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subject, category, body, venueId, reservationId } = req.body ?? {};
    if (!subject || !body) return sendError(res, { message: 'subject et body requis.', statusCode: 400 });

    const c = await SupportCase.create({
      subject: String(subject).trim().slice(0, 200),
      category: category ?? 'other',
      userId: req.userId,
      venueId: venueId && mongoose.Types.ObjectId.isValid(venueId) ? venueId : undefined,
      reservationId: reservationId && mongoose.Types.ObjectId.isValid(reservationId) ? reservationId : undefined,
      messages: [{
        sender: 'user',
        senderId: req.userId,
        body: String(body).trim().slice(0, 5000),
      }],
    });
    await logAudit(req as any, {
      action: 'SUPPORT_CASE_CREATED',
      userId: req.userId as any,
      entityType: 'support_case',
      entityId: c._id as any,
      details: { caseNumber: c.caseNumber, category: c.category, subject: c.subject },
    });
    void notifySupportCaseOpened(c.caseNumber, c.subject, String(body).trim().slice(0, 5000));

    return sendSuccess(res, { data: c, statusCode: 201 });
  } catch (err) {
    logger.error('support/cases POST', err as any);
    return sendError(res, { message: 'Erreur création.', statusCode: 500 });
  }
});

// GET /support/cases — list user's own cases
router.get('/cases', authenticate, async (req: AuthRequest, res) => {
  try {
    const cases = await SupportCase.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-messages')
      .lean();
    return sendSuccess(res, { data: cases });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// GET /support/cases/:id — get case with messages (own or admin)
router.get('/cases/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return sendError(res, { message: 'ID invalide.', statusCode: 400 });

    const c = await SupportCase.findById(req.params.id)
      .populate('userId', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    if (!c) return sendError(res, { message: 'Dossier introuvable.', statusCode: 404 });
    if (req.userRole !== 'ADMIN' && String((c as any).userId?._id ?? (c as any).userId) !== String(req.userId))
      return sendError(res, { message: 'Accès refusé.', statusCode: 403 });

    return sendSuccess(res, { data: c });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// POST /support/cases/:id/messages — reply (user or admin)
router.post('/cases/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return sendError(res, { message: 'ID invalide.', statusCode: 400 });

    const c = await SupportCase.findById(req.params.id);
    if (!c) return sendError(res, { message: 'Dossier introuvable.', statusCode: 404 });

    const isAdmin = req.userRole === 'ADMIN';
    const isOwner = String(c.userId) === String(req.userId);
    if (!isAdmin && !isOwner) return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
    if (['resolved', 'closed'].includes(c.status) && !isAdmin)
      return sendError(res, { message: 'Ce dossier est fermé.', statusCode: 422 });

    const { body } = req.body ?? {};
    if (!body) return sendError(res, { message: 'body requis.', statusCode: 400 });

    c.messages.push({
      sender: isAdmin ? 'admin' : 'user',
      senderId: new mongoose.Types.ObjectId(req.userId),
      body: String(body).trim().slice(0, 5000),
      createdAt: new Date(),
    } as any);

    if (c.status === 'open' && isAdmin) c.status = 'in_progress';
    await c.save();
    await logAudit(req as any, {
      action: 'SUPPORT_CASE_REPLIED',
      userId: req.userId as any,
      entityType: 'support_case',
      entityId: c._id as any,
      details: { sender: isAdmin ? 'admin' : 'user', caseNumber: c.caseNumber, status: c.status },
    });
    try {
      if (isAdmin) {
        const user = await User.findById(c.userId).select('email fullName').lean();
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: `[Support] Réponse à votre dossier ${c.caseNumber}`,
            html: `<p>Bonjour ${user.fullName || ''},</p><p>Une réponse a été ajoutée à votre dossier support <strong>${c.caseNumber}</strong>.</p><p>${String(body).trim().slice(0, 5000)}</p>`,
            text: `Une réponse a été ajoutée à votre dossier ${c.caseNumber}: ${String(body).trim().slice(0, 5000)}`,
          });
        }
      } else {
        const recipients = await getSupportRecipientEmails();
        if (recipients.length) {
          await Promise.all(
            recipients.map((to) =>
              sendEmail({
                to,
                subject: `[Support] Réponse client ${c.caseNumber}`,
                html: `<p>Le client a répondu au dossier <strong>${c.caseNumber}</strong>.</p><p>${String(body).trim().slice(0, 5000)}</p>`,
                text: `Réponse client sur ${c.caseNumber}: ${String(body).trim().slice(0, 5000)}`,
              })
            )
          );
        }
      }
    } catch (err) {
      logger.warn('support reply notification failed', err as any);
    }

    return sendSuccess(res, { data: c.messages[c.messages.length - 1] });
  } catch (err) {
    logger.error('support/cases/:id/messages', err as any);
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// PATCH /support/cases/:id/close — user closes own case
router.patch('/cases/:id/close', authenticate, async (req: AuthRequest, res) => {
  try {
    const c = await SupportCase.findOne({ _id: req.params.id, userId: req.userId });
    if (!c) return sendError(res, { message: 'Dossier introuvable.', statusCode: 404 });
    c.status = 'closed';
    c.closedAt = new Date();
    await c.save();
    await logAudit(req as any, {
      action: 'SUPPORT_CASE_CLOSED',
      userId: req.userId as any,
      entityType: 'support_case',
      entityId: c._id as any,
      details: { caseNumber: c.caseNumber, actor: 'user' },
    });
    return sendSuccess(res, { data: { status: c.status } });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

/* ─── Admin routes ──────────────────────────────────────────────────── */

// GET /support/admin/cases — list all cases with filters
router.get('/admin/cases', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 30))));
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const [cases, total] = await Promise.all([
      SupportCase.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-messages')
        .populate('userId', 'fullName email')
        .populate('assignedTo', 'fullName')
        .lean(),
      SupportCase.countDocuments(filter),
    ]);

    const counts = await SupportCase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusCounts = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    return sendSuccess(res, {
      data: cases,
      meta: { total, page, limit, pages: Math.ceil(total / limit), statusCounts },
    });
  } catch (err) {
    logger.error('support/admin/cases', err as any);
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// PATCH /support/admin/cases/:id — update status, priority, assignedTo
router.patch('/admin/cases/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const c = await SupportCase.findById(req.params.id);
    if (!c) return sendError(res, { message: 'Dossier introuvable.', statusCode: 404 });

    const { status, priority, assignedTo } = req.body ?? {};
    if (status) {
      c.status = status;
      if (status === 'resolved' && !c.resolvedAt) c.resolvedAt = new Date();
      if (status === 'closed' && !c.closedAt) c.closedAt = new Date();
    }
    if (priority) c.priority = priority;
    if (assignedTo !== undefined) {
      c.assignedTo = assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)
        ? new mongoose.Types.ObjectId(assignedTo)
        : undefined;
    }

    await c.save();
    await logAudit(req as any, {
      action: 'SUPPORT_CASE_UPDATED',
      userId: req.userId as any,
      entityType: 'support_case',
      entityId: c._id as any,
      details: { status: c.status, priority: c.priority, assignedTo: c.assignedTo ? String(c.assignedTo) : null, caseNumber: c.caseNumber },
    });
    try {
      const user = await User.findById(c.userId).select('email fullName').lean();
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `[Support] Mise à jour dossier ${c.caseNumber}`,
          html: `<p>Bonjour ${user.fullName || ''},</p><p>Votre dossier support <strong>${c.caseNumber}</strong> a été mis à jour.</p><p>Statut: <strong>${c.status}</strong> - Priorité: <strong>${c.priority}</strong></p>`,
          text: `Votre dossier ${c.caseNumber} a été mis à jour. Statut: ${c.status}. Priorité: ${c.priority}.`,
        });
      }
    } catch (err) {
      logger.warn('support admin update notification failed', err as any);
    }
    return sendSuccess(res, { data: c });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

export default router;
