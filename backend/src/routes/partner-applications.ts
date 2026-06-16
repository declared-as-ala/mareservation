import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PartnerApplication } from '../models/PartnerApplication';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sendEmail, createPartnerApplicationAdminTemplate } from '../services/email.service';
import { getEnv } from '../config/env';

const router = Router();

/** Emails notifiés pour chaque nouvelle demande de partenariat. */
const PARTNER_EMAIL_DEFAULT =
  'alamissaoui.dev@gmail.com,Wassim.ouelhazi100119862@gmail.com';

function parseEmailRecipientList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const e = part.trim();
    if (!e) continue;
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function getPartnerNotificationRecipients(): string[] {
  const fromEnv =
    process.env.PARTNER_NOTIFICATION_EMAILS?.trim() ||
    process.env.SOS_CONSEIL_NOTIFICATION_EMAILS?.trim();
  return parseEmailRecipientList(fromEnv || PARTNER_EMAIL_DEFAULT);
}

/** Public: submit a partnership application */
router.post(
  '/',
  [
    body('establishmentName').trim().notEmpty().withMessage("Le nom de l'établissement est requis"),
    body('contactName').trim().notEmpty().withMessage('Le nom du contact est requis'),
    body('email').trim().isEmail().withMessage('Email invalide'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Le numéro de téléphone est requis')
      .bail()
      .custom((value: string) => {
        const phone = String(value).replace(/\s/g, '');
        if (!/^(\+216|216)?[0-9]{8}$/.test(phone) && !/^[0-9]{6,15}$/.test(phone)) {
          throw new Error('Format téléphone invalide');
        }
        return true;
      }),
    body('city').trim().notEmpty().withMessage('La ville est requise'),
    body('message').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 4000 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    try {
      const { establishmentName, contactName, email, phone, city, message } = req.body;

      const application = await PartnerApplication.create({
        establishmentName,
        contactName,
        email,
        phone: String(phone).trim(),
        city,
        message: message || undefined,
        status: 'new',
      });

      const env = getEnv();
      const recipients = getPartnerNotificationRecipients();
      if (recipients.length > 0 && env.EMAIL_FROM) {
        const frontendUrl = process.env.FRONTEND_URL || env.FRONTEND_URL || '';
        const template = createPartnerApplicationAdminTemplate({
          establishmentName,
          contactName,
          email,
          phone: String(phone).trim(),
          city,
          message: message || undefined,
          dashboardUrl: frontendUrl ? `${frontendUrl}/admin/partners` : undefined,
        });
        for (const to of recipients) {
          sendEmail({ to, subject: template.subject, html: template.html, text: template.text }).catch((err) =>
            console.error(`Partner application email error (${to}):`, err)
          );
        }
      }

      return res.status(201).json({ success: true, data: application });
    } catch (err) {
      console.error('Partner application create error:', err);
      return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
);

/** Admin: list applications */
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query as { page?: string }).page || '1', 10));
    const limit = 20;
    const status = (req.query as { status?: string }).status;

    const filter: Record<string, string> = {};
    if (status) filter.status = status;

    const [applications, total] = await Promise.all([
      PartnerApplication.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PartnerApplication.countDocuments(filter),
    ]);

    return res.json({ success: true, data: applications, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Partner application list error:', err);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/** Admin: update status */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [body('status').isIn(['new', 'in_review', 'contacted', 'closed']).withMessage('Statut invalide')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const application = await PartnerApplication.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      ).lean();
      if (!application) return res.status(404).json({ success: false, error: 'Introuvable' });
      return res.json({ success: true, data: application });
    } catch {
      return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
);

/** Admin: delete */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const application = await PartnerApplication.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ success: false, error: 'Introuvable' });
    return res.json({ success: true, message: 'Supprimé' });
  } catch {
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;
