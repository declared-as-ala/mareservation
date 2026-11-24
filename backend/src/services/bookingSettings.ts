/**
 * Booking settings of an accommodation, editable by its owner (operational fields) and by the
 * super admin (everything, including demo / publication / booking switches and owner assignment).
 */
import { z } from 'zod';
import { FEATURE_KEYS, TUNISIA_GOVERNORATES } from '../config/tunisia';

const money = z.coerce.number().min(0).max(100000);
/** Stored media: absolute https URL (Cloudinary) or a site-relative path (/demo/…). */
const mediaUrl = z.string().trim().max(600).regex(/^(https:\/\/|\/(?!\/))\S+$/, 'URL d’image invalide.');
const smallInt = (max: number) => z.coerce.number().int().min(0).max(max);

export const ownerSettingsSchema = z
  .object({
    bookingMode: z.enum(['request', 'instant']),
    rentalMode: z.enum(['rooms', 'entire']),
    entirePricePerNight: money.nullable(),
    cleaningFee: money,
    serviceFee: money,
    minimumNights: z.coerce.number().int().min(1).max(30),
    maxGuests: z.coerce.number().int().min(1).max(50).nullable(),
    bedrooms: smallInt(50).nullable(),
    beds: smallInt(100).nullable(),
    bathrooms: smallInt(50).nullable(),
    features: z.array(z.enum(FEATURE_KEYS)).max(FEATURE_KEYS.length),
    houseRules: z.array(z.string().trim().min(1).max(200)).max(20),
    cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']),
    cancellationNotes: z.string().trim().max(2000),
    arrivalInstructions: z.string().trim().max(2000),
    checkInPolicy: z.string().trim().max(200),
    checkOutPolicy: z.string().trim().max(200),
    hostDisplayName: z.string().trim().max(120),
    hostBio: z.string().trim().max(1500),
    governorate: z.enum(TUNISIA_GOVERNORATES as unknown as [string, ...string[]]).nullable(),
    city: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1).max(200),
    coordinates: z
      .object({
        // Tunisia's bounding box (with margin) — coordinates outside it are certainly wrong.
        lat: z.coerce.number().min(30).max(37.6),
        lng: z.coerce.number().min(7.4).max(11.7),
      })
      .nullable(),
  })
  .partial()
  .strict();

export const adminSettingsSchema = ownerSettingsSchema
  .extend({
    bookingEnabled: z.boolean().nullable(),
    isDemo: z.boolean(),
    publicListed: z.boolean(),
    isPublished: z.boolean(),
    ownerId: z.string().regex(/^[a-f0-9]{24}$/i).nullable(),
    name: z.string().trim().min(2).max(140),
    shortDescription: z.string().trim().max(300),
    description: z.string().trim().min(1).max(8000),
    immersiveUrl: z.string().trim().url().max(500).nullable(),
    // Listing management (admin editor)
    slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug : minuscules, chiffres et tirets uniquement.'),
    approvalStatus: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'changes_requested', 'suspended']),
    coverImage: mediaUrl.nullable(),
    gallery: z.array(mediaUrl).max(60),
    galleryMeta: z.array(z.object({ url: mediaUrl, alt: z.string().trim().max(200) })).max(60),
  })
  .partial()
  .strict();

export type SettingsInput = z.infer<typeof adminSettingsSchema>;

/** Converts validated input into a Mongo $set / $unset pair (null = clear the field). */
export function toUpdate(input: SettingsInput): { $set: Record<string, unknown>; $unset: Record<string, ''> } {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (v === null) $unset[k] = '';
    else $set[k] = v;
  }
  if ('immersiveUrl' in $set) {
    $set.hasVirtualTour = true;
    $set.immersiveType = 'virtual-tour';
    $set.immersiveSourceType = 'embed';
  }
  if ('immersiveUrl' in $unset) $set.hasVirtualTour = false;
  return { $set, $unset };
}

export const SETTINGS_FIELDS =
  'name slug type city governorate address shortDescription description coverImage gallery ownerId isDemo isPublished publicListed approvalStatus bookingEnabled bookingMode rentalMode entirePricePerNight cleaningFee serviceFee minimumNights maxGuests bedrooms beds bathrooms features houseRules cancellationPolicy cancellationNotes arrivalInstructions checkInPolicy checkOutPolicy hostDisplayName hostBio coordinates timezone immersiveUrl hasVirtualTour galleryMeta updatedAt';
