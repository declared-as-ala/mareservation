/** Maps AI extraction JSON ↔ SOS Conseil form values (avoid inventing defaults for identity fields). */

export type PreferredCategory =
  | 'cafe'
  | 'restaurant'
  | 'hotel'
  | 'cinema'
  | 'event_space'
  | 'lounge'
  | 'rooftop';

export type ContactPref = 'whatsapp' | 'phone' | 'email';

export interface SOSAssistantExtracted {
  fullName: string;
  phone: string;
  email: string;
  /** Maps to backend occasion enum */
  eventType: string;
  participants: string;
  ageRanges: string[];
  region: string;
  placeType: string;
  date: string;
  time: string;
  budget: string;
  ambiance: string[];
  contactPreference: string;
  details: string;
}

export interface SOSConseilFormShape {
  fullName: string;
  phone: string;
  email: string;
  occasionType: string;
  participantsCount: string;
  averageAgeRanges: string[];
  preferredRegion: string;
  preferredCategory: string;
  budgetRange: string;
  ambianceTags: string[];
  contactPreference: '' | ContactPref;
  preferredDate: string;
  preferredTime: string;
  details: string;
}

const OCCASION_VALUES = [
  'birthday',
  'wedding_engagement',
  'business_meeting',
  'family_event',
  'romantic_dinner',
  'graduation',
  'corporate',
  'other',
] as const;

const CATEGORY_VALUES: PreferredCategory[] = [
  'cafe',
  'restaurant',
  'hotel',
  'cinema',
  'event_space',
  'lounge',
  'rooftop',
];

/** Try to match loosely from FR/AR/EN-ish tokens */
function coerceOccasion(raw: string): (typeof OCCASION_VALUES)[number] {
  const s = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (OCCASION_VALUES.includes(s as (typeof OCCASION_VALUES)[number])) return s as (typeof OCCASION_VALUES)[number];
  const hints = [
    [['anniversaire', 'birthday', 'عرس', 'anniv'], 'birthday'],
    [['wedding', 'mariage', 'fianc', 'خطوبة'], 'wedding_engagement'],
    [['affaires', 'business', 'réunion', 'meeting'], 'business_meeting'],
    [['famil', 'famille', 'أسرة'], 'family_event'],
    [['romant', 'dîner', 'couple', 'ليالي'], 'romantic_dinner'],
    [['diplo', 'graduation', 'توزيع'], 'graduation'],
    [['entreprise', 'corporate', 'شركة'], 'corporate'],
  ] as const satisfies readonly (readonly [readonly string[], typeof OCCASION_VALUES[number]])[];
  const low = raw.toLowerCase();
  for (const [keywords, v] of hints) {
    if (keywords.some((w) => s.includes(w) || low.includes(w))) return v;
  }
  return 'other';
}

function coerceCategory(raw: string): PreferredCategory {
  const x = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (CATEGORY_VALUES.includes(x as PreferredCategory)) return x as PreferredCategory;
  const h: Record<string, PreferredCategory> = {
    cafe: 'cafe',
    coffee: 'cafe',
    café: 'cafe',
    restaurant: 'restaurant',
    resto: 'restaurant',
    hotel: 'hotel',
    hôtel: 'hotel',
    cinema: 'cinema',
    cinéma: 'cinema',
    event_space: 'event_space',
    event: 'event_space',
    espace: 'event_space',
    lounge: 'lounge',
    salon: 'lounge',
    rooftop: 'rooftop',
    terrasse: 'rooftop',
    roof: 'rooftop',
  };
  for (const [key, cat] of Object.entries(h))
    if (x.includes(key) || raw.toLowerCase().includes(key.replace(/_/g, ' '))) return cat;

  const contains = (w: string) => raw.toLowerCase().includes(w);
  if (contains('roof') || contains('terras')) return 'rooftop';
  if (contains('lounge') || contains('salon')) return 'lounge';
  return 'restaurant';
}

function coerceContact(raw: string): ContactPref | undefined {
  const s = raw.toLowerCase();
  if (s.includes('whatsapp') || s.includes('wats')) return 'whatsapp';
  if (s.includes('mail') || s.includes('email') || s.includes('@')) return 'email';
  if (s.includes('phone') || s.includes('tél') || s.includes('tel') || s.includes('appel'))
    return 'phone';
  if (raw === 'whatsapp' || raw === 'phone' || raw === 'email') return raw;
  return undefined;
}

/** Map budget-ish text to predefined keys used by backend email formatter */
export function coerceBudgetKey(raw: string): string {
  const s = raw.toLowerCase().trim();
  const keys = ['moins_100', '100_300', '300_600', '600_1000', 'plus_1000'] as const;
  if (keys.includes(s as typeof keys[number])) return s;
  const num = parseInt(/\d+/.exec(s)?.[0] ?? '', 10);
  if (!Number.isFinite(num))
    return s.length > 0 ? raw.trim() : '';
  if (num < 100) return 'moins_100';
  if (num <= 300) return '100_300';
  if (num <= 600) return '300_600';
  if (num <= 1000) return '600_1000';
  return 'plus_1000';
}

const AGE_LEGIT = ['18-20', '20-30', '30-40', '40-50', '50-60', '+60'] as const;

function filterAgeRanges(ranges: string[]): string[] {
  const out = ranges
    .map((r) => String(r).trim())
    .filter((r): r is typeof AGE_LEGIT[number] => (AGE_LEGIT as readonly string[]).includes(r));
  return [...new Set(out)].slice(0, 16);
}

/** Merge AI extraction into partial form patch — prefers non-empty extraction over empty. */
export function mergeExtractedIntoForm(base: SOSConseilFormShape, extracted: SOSAssistantExtracted): Partial<SOSConseilFormShape> {
  const patch: Partial<SOSConseilFormShape> = {};

  if (extracted.fullName?.trim()) patch.fullName = extracted.fullName.trim();
  if (extracted.phone?.trim()) patch.phone = extracted.phone.trim();
  if (extracted.email?.trim()) patch.email = extracted.email.trim();
  if (extracted.eventType?.trim()) patch.occasionType = coerceOccasion(extracted.eventType);
  if (extracted.participants?.trim()) {
    const n = parseInt(String(extracted.participants).replace(/\D+/g, ''), 10);
    if (Number.isFinite(n) && n > 0) patch.participantsCount = String(n);
  }
  const ages = filterAgeRanges(extracted.ageRanges ?? []);
  if (ages.length) patch.averageAgeRanges = ages;

  if (extracted.region?.trim()) patch.preferredRegion = extracted.region.trim();
  if (extracted.placeType?.trim()) patch.preferredCategory = coerceCategory(extracted.placeType);

  if (extracted.date?.trim()) patch.preferredDate = normalizeDateInput(extracted.date);
  if (extracted.time?.trim()) patch.preferredTime = normalizeTimeInput(extracted.time);

  if (extracted.budget?.trim()) patch.budgetRange = coerceBudgetKey(extracted.budget);

  const amb = [...new Set((extracted.ambiance ?? []).map((a) => a.trim()).filter(Boolean))];
  if (amb.length) patch.ambianceTags = amb.slice(0, 40);

  const cp = extracted.contactPreference?.trim()
    ? coerceContact(extracted.contactPreference)
    : undefined;
  if (cp) patch.contactPreference = cp;

  if (extracted.details?.trim()) patch.details = extracted.details.trim();

  return patch;
}

function normalizeDateInput(d: string): string {
  const t = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    return dt.toISOString().slice(0, 10);
  }
  return t;
}

function normalizeTimeInput(t: string): string {
  const s = t.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/(\d{1,2})[h:.](\d{2})/i);
  if (m) {
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return s;
}

/** Short summary stored on submit for admins */
export function buildAiAssistSummary(
  extracted: SOSAssistantExtracted | undefined | null,
  extraDetails?: string
): string | undefined {
  if (!extracted && !extraDetails?.trim()) return undefined;

  const parts: string[] = [];
  const e = extracted;
  if (e?.region || e?.eventType || e?.placeType) {
    parts.push(
      [e?.region, e?.eventType, e?.placeType].filter(Boolean).join(' · ')
    );
  }
  if (e?.budget?.trim()) parts.push(`Budget indiqué: ${e.budget}`);
  if (e?.ambiance?.length) parts.push(`Ambiance: ${e!.ambiance.join(', ')}`);
  if (e?.contactPreference?.trim()) parts.push(`Contact préféré: ${e.contactPreference}`);
  const line = parts.filter(Boolean).join('\n');

  let out =
    extraDetails?.trim().length ?
      `${line ? `${line}\n\n` : ''}${extraDetails!.trim()}`
    : line;

  out = out.trim();
  return out.length ? out.slice(0, 7000) : undefined;
}

export function extractionToStructured(extracted: SOSAssistantExtracted): SOSAssistantExtracted {
  return {
    ...extracted,
    eventType: extracted.eventType?.trim() ? coerceOccasion(extracted.eventType) : '',
    placeType: extracted.placeType?.trim() ? coerceCategory(extracted.placeType) : '',
  };
}
