import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEnv } from '../src/config/env';
import { getPublicVenueSlugs, getPublicVenueTypes, isPublicVenue, publicVenueFilter } from '../src/config/publicCatalog';
import { runExclusive } from '../src/utils/bookingLock';

const GOOD_SECRET = 'k3J9x-Zq72LmN8vB4tRw1YcD6sHf0GpA5eUo-XyT';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('JWT secret requirements', () => {
  it('rejects a missing secret in every environment', () => {
    for (const nodeEnv of ['development', 'production', 'test']) {
      vi.stubEnv('NODE_ENV', nodeEnv);
      vi.stubEnv('JWT_SECRET', '');
      vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/x');
      expect(() => getEnv()).toThrow();
    }
  });

  it('rejects short and placeholder secrets', () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/x');
    for (const bad of ['short', 'your-super-secret-jwt-key-change-in-production', 'changeme-changeme-changeme-changeme-1234']) {
      vi.stubEnv('JWT_SECRET', bad);
      expect(() => getEnv()).toThrow();
    }
  });

  it('accepts a strong secret and does not require REFRESH_SECRET', () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/x');
    vi.stubEnv('JWT_SECRET', GOOD_SECRET);
    vi.stubEnv('REFRESH_SECRET', '');
    expect(getEnv().JWT_SECRET).toBe(GOOD_SECRET);
  });
});

describe('public catalogue flag', () => {
  it('defaults to MAISON_DHOTE only', () => {
    vi.stubEnv('PUBLIC_VENUE_TYPES', '');
    expect(getPublicVenueTypes()).toEqual(['MAISON_DHOTE']);
    expect(isPublicVenue({ type: 'MAISON_DHOTE', slug: 'a' })).toBe(true);
    for (const t of ['HOTEL', 'CAFE', 'RESTAURANT', 'CINEMA', 'EVENT_SPACE', 'COWORKING']) {
      expect(isPublicVenue({ type: t, slug: 'a' })).toBe(false);
    }
  });

  it('can re-enable categories later via env, case-insensitively', () => {
    vi.stubEnv('PUBLIC_VENUE_TYPES', 'maison_dhote, restaurant');
    expect(getPublicVenueTypes()).toEqual(['MAISON_DHOTE', 'RESTAURANT']);
    expect(isPublicVenue({ type: 'RESTAURANT' })).toBe(true);
  });

  it('applies the optional slug allowlist and builds a safe Mongo filter', () => {
    vi.stubEnv('PUBLIC_VENUE_TYPES', '');
    vi.stubEnv('PUBLIC_VENUE_SLUGS', 'Villa-One, villa-two');
    expect(getPublicVenueSlugs()).toEqual(['villa-one', 'villa-two']);
    expect(isPublicVenue({ type: 'MAISON_DHOTE', slug: 'VILLA-ONE' })).toBe(true);
    expect(isPublicVenue({ type: 'MAISON_DHOTE', slug: 'demo' })).toBe(false);
    expect(isPublicVenue({ type: 'MAISON_DHOTE' })).toBe(false);
    expect(publicVenueFilter()).toMatchObject({
      type: { $in: ['MAISON_DHOTE'] },
      isPublished: { $ne: false },
      archivedAt: null,
      slug: { $in: ['villa-one', 'villa-two'] },
    });
  });
});

describe('runExclusive (booking lock mutex)', () => {
  it('runs same-key sections strictly one at a time, in order', async () => {
    const log: string[] = [];
    const section = (name: string, ms: number) =>
      runExclusive('room:1', async () => {
        log.push(`start ${name}`);
        await new Promise((r) => setTimeout(r, ms));
        log.push(`end ${name}`);
      });
    await Promise.all([section('A', 30), section('B', 5), section('C', 1)]);
    expect(log).toEqual(['start A', 'end A', 'start B', 'end B', 'start C', 'end C']);
  });

  it('does not block different keys and survives a failing section', async () => {
    const order: string[] = [];
    const failing = runExclusive('k1', async () => {
      throw new Error('boom');
    });
    await expect(failing).rejects.toThrow('boom');
    await Promise.all([
      runExclusive('k1', async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push('k1');
      }),
      runExclusive('k2', async () => {
        order.push('k2');
      }),
    ]);
    expect(order).toEqual(['k2', 'k1']);
  });
});

import { parseStayQuery } from '../src/utils/stayAvailability';

describe('parseStayQuery (server-side date validation)', () => {
  const now = new Date('2026-06-10T15:00:00Z');
  const ok = (q: any) => parseStayQuery(q, now);

  it('no dates means no availability filter', () => {
    expect(ok({})).toEqual({ ok: true, value: null });
  });
  it('accepts a valid stay, defaulting to 1 guest', () => {
    const r = ok({ checkIn: '2026-06-12', checkOut: '2026-06-15' }) as any;
    expect(r.ok).toBe(true);
    expect(r.value.guests).toBe(1);
    expect(r.value.checkOut.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
  it('allows arriving today', () => {
    expect((ok({ checkIn: '2026-06-10', checkOut: '2026-06-11' }) as any).ok).toBe(true);
  });
  it.each([
    [{ checkIn: '2026-06-12' }],
    [{ checkOut: '2026-06-15' }],
    [{ checkIn: '12/06/2026', checkOut: '15/06/2026' }],
    [{ checkIn: '2026-02-31', checkOut: '2026-03-02' }],
    [{ checkIn: '2026-06-09', checkOut: '2026-06-12' }],
    [{ checkIn: '2026-06-15', checkOut: '2026-06-15' }],
    [{ checkIn: '2026-06-15', checkOut: '2026-06-12' }],
    [{ checkIn: '2026-06-12', checkOut: '2026-08-12' }],
    [{ checkIn: '2026-06-12', checkOut: '2026-06-15', guests: '0' }],
    [{ checkIn: '2026-06-12', checkOut: '2026-06-15', guests: '2.5' }],
    [{ checkIn: '2026-06-12', checkOut: '2026-06-15', guests: '99' }],
    [{ checkIn: '2026-06-12', checkOut: '2026-06-15', guests: 'abc' }],
  ])('rejects %j', (q) => {
    expect((ok(q) as any).ok).toBe(false);
  });
});
