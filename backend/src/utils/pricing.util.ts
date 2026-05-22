import { Types } from 'mongoose';
import { PricingRule } from '../models/PricingRule';
import { PromoCode } from '../models/PromoCode';

export interface PriceNightBreakdown {
  date: string;
  basePrice: number;
  finalPrice: number;
  applied: Array<{ ruleId?: string; kind: string; label: string; multiplier?: number; amount?: number; delta: number }>;
}

export interface PriceQuote {
  nights: number;
  subtotal: number;
  perNight: PriceNightBreakdown[];
  promo?: { code: string; kind: string; discount: number };
  total: number;
  errors: string[];
  warnings: string[];
}

function midnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffNights(start: Date, end: Date) {
  return Math.max(1, Math.round((midnight(end).getTime() - midnight(start).getTime()) / 86_400_000));
}

function dateInRange(date: Date, start?: Date | null, end?: Date | null) {
  const ts = date.getTime();
  if (start && ts < midnight(start).getTime()) return false;
  if (end && ts > midnight(end).getTime()) return false;
  return true;
}

function applyRuleToNight(basePrice: number, runningPrice: number, rule: any, nightDate: Date): { newPrice: number; delta: number } | null {
  // Validate window
  if (rule.startsAt || rule.endsAt) {
    if (!dateInRange(nightDate, rule.startsAt, rule.endsAt)) return null;
  }
  if (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0) {
    if (!rule.daysOfWeek.includes(nightDate.getDay())) return null;
  }

  switch (rule.kind) {
    case 'weekend': {
      const dow = nightDate.getDay();
      const isWeekend = dow === 5 || dow === 6 || dow === 0;
      if (!isWeekend) return null;
      if (rule.multiplier) {
        const next = Math.round(runningPrice * rule.multiplier);
        return { newPrice: next, delta: next - runningPrice };
      }
      if (rule.amount) return { newPrice: runningPrice + rule.amount, delta: rule.amount };
      return null;
    }
    case 'seasonal':
    case 'holiday': {
      if (rule.multiplier) {
        const next = Math.round(runningPrice * rule.multiplier);
        return { newPrice: next, delta: next - runningPrice };
      }
      if (rule.amount) return { newPrice: runningPrice + rule.amount, delta: rule.amount };
      return null;
    }
    default:
      return null;
  }
}

export async function quoteRoomPrice({
  venueId,
  roomId,
  basePricePerNight,
  startAt,
  endAt,
  bookedAt = new Date(),
  promoCode,
  userId,
}: {
  venueId: string | Types.ObjectId;
  roomId: string | Types.ObjectId;
  basePricePerNight: number;
  startAt: Date;
  endAt: Date;
  bookedAt?: Date;
  promoCode?: string;
  userId?: string | Types.ObjectId;
}): Promise<PriceQuote> {
  void userId;
  const errors: string[] = [];
  const warnings: string[] = [];
  const nights = diffNights(startAt, endAt);

  const rules = await PricingRule.find({
    venueId,
    isActive: true,
    $or: [{ roomId }, { roomId: null }, { roomId: { $exists: false } }],
  })
    .sort({ priority: 1 })
    .lean();

  // Min/max nights validation
  for (const r of rules) {
    if (r.kind === 'min_nights' && r.minNights && nights < r.minNights) {
      errors.push(`Séjour minimum requis : ${r.minNights} nuits (${r.label}).`);
    }
    if (r.kind === 'max_nights' && r.maxNights && nights > r.maxNights) {
      errors.push(`Séjour maximum : ${r.maxNights} nuits (${r.label}).`);
    }
  }

  // Per-night calculation
  const perNight: PriceNightBreakdown[] = [];
  for (let i = 0; i < nights; i++) {
    const nightDate = new Date(startAt);
    nightDate.setDate(nightDate.getDate() + i);
    nightDate.setHours(0, 0, 0, 0);
    let running = basePricePerNight;
    const applied: PriceNightBreakdown['applied'] = [];

    for (const rule of rules) {
      if (['weekend', 'seasonal', 'holiday'].includes(rule.kind)) {
        const result = applyRuleToNight(basePricePerNight, running, rule, nightDate);
        if (result) {
          applied.push({
            ruleId: String((rule as any)._id),
            kind: rule.kind,
            label: rule.label,
            multiplier: rule.multiplier,
            amount: rule.amount,
            delta: result.delta,
          });
          running = result.newPrice;
        }
      }
    }

    perNight.push({
      date: nightDate.toISOString().slice(0, 10),
      basePrice: basePricePerNight,
      finalPrice: running,
      applied,
    });
  }

  let subtotal = perNight.reduce((sum, n) => sum + n.finalPrice, 0);

  // Last-minute / early-booking adjustments (applied to subtotal)
  const daysToArrival = Math.round((midnight(startAt).getTime() - midnight(bookedAt).getTime()) / 86_400_000);
  for (const r of rules) {
    if (r.kind === 'last_minute' && r.windowDays && daysToArrival <= r.windowDays) {
      const mult = r.multiplier ?? 1;
      const fixed = r.amount ?? 0;
      const before = subtotal;
      subtotal = Math.max(0, Math.round(subtotal * mult - fixed));
      warnings.push(`Tarif dernière minute appliqué : ${before - subtotal} TND économisés.`);
    }
    if (r.kind === 'early_booking' && r.windowDays && daysToArrival >= r.windowDays) {
      const mult = r.multiplier ?? 1;
      const fixed = r.amount ?? 0;
      const before = subtotal;
      subtotal = Math.max(0, Math.round(subtotal * mult - fixed));
      warnings.push(`Tarif réservation anticipée : ${before - subtotal} TND économisés.`);
    }
  }

  // Promo code
  let promo: { code: string; kind: string; discount: number } | undefined;
  if (promoCode) {
    const trimmedCode = promoCode.trim().toUpperCase();
    const pc: any = await PromoCode.findOne({
      code: trimmedCode,
      isActive: true,
      $and: [
        { $or: [{ scope: 'global' }, { scope: 'venue', venueId }] },
      ],
    }).lean();
    if (!pc) {
      errors.push(`Code promo «${trimmedCode}» invalide ou expiré.`);
    } else {
      const now = bookedAt;
      if (pc.startsAt && now < new Date(pc.startsAt)) errors.push('Code promo non encore actif.');
      else if (pc.endsAt && now > new Date(pc.endsAt)) errors.push('Code promo expiré.');
      else if (pc.maxUses && pc.usedCount >= pc.maxUses) errors.push('Code promo épuisé.');
      else if (pc.minNights && nights < pc.minNights) errors.push(`Code promo nécessite ${pc.minNights} nuits min.`);
      else if (pc.minAmount && subtotal < pc.minAmount) errors.push(`Code promo nécessite ${pc.minAmount} TND min.`);
      else {
        let discount = 0;
        if (pc.kind === 'percent') discount = Math.round(subtotal * (pc.value / 100));
        else if (pc.kind === 'amount') discount = Math.min(subtotal, pc.value);
        else if (pc.kind === 'free_night' && perNight.length > 0) {
          // Free N cheapest nights
          const cheapest = [...perNight].sort((a, b) => a.finalPrice - b.finalPrice).slice(0, pc.value);
          discount = cheapest.reduce((s, n) => s + n.finalPrice, 0);
        }
        if (discount > 0) {
          promo = { code: trimmedCode, kind: pc.kind, discount };
          subtotal = Math.max(0, subtotal - discount);
        }
      }
    }
  }

  return { nights, subtotal, perNight, promo, total: subtotal, errors, warnings };
}
