'use client';

/**
 * HostMe-style search: one connected bar (Où · Arrivée · Départ · Voyageurs · Rechercher) on desktop,
 * stacked fields on mobile. Destinations come from real data + the 24 governorates; the search opens
 * the Explorer (/accommodations) with every filter pre-filled in the URL.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Minus, Plus, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { API_BASE } from '@/lib/api/base-url';
import { GOVERNORATES } from '@/lib/api/bookings';
import { MONTHS_FR, WEEKDAYS_FR, addDaysKey, monthStartKey, monthWeeks, parseKey, toKey } from '@/lib/booking/dates';

type Panel = 'where' | 'dates' | 'guests' | null;
type Destination = { name: string; kind: 'city' | 'governorate'; governorate: string | null; count: number };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const todayKey = () => {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
};
const short = (k: string) => {
  const { d, m } = parseKey(k);
  return `${d} ${MONTHS_FR[m].slice(0, 4)}${MONTHS_FR[m].length > 4 ? '.' : ''}`;
};

export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/v1/bookings/destinations`, { cache: 'no-store' });
      if (!r.ok) throw new Error('destinations');
      return (await r.json()) as { total: number; destinations: Destination[] };
    },
    staleTime: 5 * 60_000,
  });
}

function RangeCalendar({ start, end, onChange }: { start: string; end: string; onChange: (s: string, e: string) => void }) {
  const today = todayKey();
  const [month, setMonth] = useState(() => monthStartKey(start || today));
  const months = [month, monthStartKey(month, 1)];
  const pick = (k: string) => {
    if (!start || (start && end) || k <= start) onChange(k, '');
    else onChange(start, k);
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mois précédent" disabled={month <= monthStartKey(today)} onClick={() => setMonth(monthStartKey(month, -1))} className="grid size-9 place-items-center rounded-full border border-white/15 text-white disabled:opacity-25 hover:border-amber-400 rtl:rotate-180"><ChevronLeft className="size-4" /></button>
        <button type="button" aria-label="Mois suivant" onClick={() => setMonth(monthStartKey(month, 1))} className="grid size-9 place-items-center rounded-full border border-white/15 text-white hover:border-amber-400 rtl:rotate-180"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {months.map((mk, idx) => {
          const { y, m } = parseKey(mk);
          return (
            <div key={mk} className={cn(idx === 1 && 'hidden md:block')}>
              <p className="mb-2 text-center font-serif text-lg capitalize text-white">{MONTHS_FR[m]} {y}</p>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-neutral-500">{WEEKDAYS_FR.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
              {monthWeeks(mk).map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((k, di) => {
                    if (!k) return <span key={di} />;
                    const past = k < today;
                    const isStart = k === start;
                    const isEnd = k === end;
                    const inRange = start && end && k > start && k < end;
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={past}
                        onClick={() => pick(k)}
                        aria-pressed={isStart || isEnd}
                        aria-label={k}
                        className={cn(
                          'm-0.5 grid h-10 place-items-center rounded-full text-sm tabular-nums transition-colors',
                          past && 'cursor-not-allowed text-neutral-700 line-through',
                          !past && !isStart && !isEnd && !inRange && 'text-neutral-200 hover:bg-white/10',
                          inRange && 'rounded-none bg-amber-400/15 text-amber-100',
                          (isStart || isEnd) && 'bg-amber-400 font-bold text-black'
                        )}
                      >
                        {parseKey(k).d}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Counter({ label, hint, value, min, onChange }: { label: string; hint: string; value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/10 py-4 last:border-0">
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`− ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-white/20 text-white hover:border-amber-400 disabled:opacity-25"><Minus className="size-4" /></button>
        <span className="w-6 text-center font-semibold tabular-nums text-white" aria-live="polite">{value}</span>
        <button type="button" aria-label={`+ ${label}`} disabled={value >= 20} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-white/20 text-white hover:border-amber-400 disabled:opacity-25"><Plus className="size-4" /></button>
      </div>
    </div>
  );
}

export function SearchBar({ variant = 'hero', initial }: { variant?: 'hero' | 'compact'; initial?: { where?: string; checkIn?: string; checkOut?: string; adults?: number; children?: number } }) {
  const { t } = useI18n();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [where, setWhere] = useState(initial?.where ?? '');
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? '');
  const [adults, setAdults] = useState(initial?.adults ?? 0);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const root = useRef<HTMLFormElement>(null);
  const { data } = useDestinations();

  useEffect(() => {
    if (!panel) return;
    const onDoc = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setPanel(null); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [panel]);

  const suggestions = useMemo(() => {
    const counted = new Map((data?.destinations ?? []).map((d) => [norm(d.name), d]));
    const list: { name: string; sub: string; count: number }[] = [];
    for (const d of data?.destinations ?? []) if (d.kind === 'city') list.push({ name: d.name, sub: d.governorate ?? 'Tunisie', count: d.count });
    for (const g of GOVERNORATES) list.push({ name: g, sub: 'Gouvernorat', count: counted.get(norm(g))?.count ?? 0 });
    const q = norm(where.trim());
    return list.filter((s) => !q || norm(s.name).includes(q)).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [data, where]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const p = new URLSearchParams();
    if (where.trim()) p.set('where', where.trim());
    if (checkIn && checkOut) { p.set('checkIn', checkIn); p.set('checkOut', checkOut); }
    if (adults) p.set('adults', String(adults));
    if (children) p.set('children', String(children));
    setPanel(null);
    router.push(`/accommodations${p.toString() ? `?${p}` : ''}`);
  };

  const guestsLabel = adults + children > 0 ? `${adults + children} ${t('card.guests')}` : t('search.addGuests');
  const compact = variant === 'compact';
  const seg = 'group relative flex min-w-0 flex-col justify-center rounded-full px-6 text-start transition-colors hover:bg-white/[0.06] focus-within:bg-white/[0.06]';

  return (
    <form ref={root} onSubmit={submit} role="search" aria-label={t('search.submit')} className={cn('relative w-full', compact ? 'max-w-3xl' : 'max-w-5xl')}>
      {/* Desktop: one connected bar */}
      <div className={cn('hidden items-stretch rounded-full border border-white/15 bg-[#111112]/90 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex', compact ? 'h-14' : 'h-[4.5rem]')}>
        <label className={cn(seg, 'flex-[1.4]', panel === 'where' && 'bg-white/[0.08]')}>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.where')}</span>
          <input value={where} onChange={(e) => { setWhere(e.target.value); setPanel('where'); }} onFocus={() => setPanel('where')} placeholder={t('search.wherePh')} className="w-full truncate bg-transparent text-[15px] text-white placeholder:text-neutral-400 focus:outline-none" autoComplete="off" />
        </label>
        <span className="my-4 w-px bg-white/12" aria-hidden="true" />
        <button type="button" onClick={() => setPanel(panel === 'dates' ? null : 'dates')} className={cn(seg, 'flex-1', panel === 'dates' && 'bg-white/[0.08]')}>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.checkIn')}</span>
          <span className={cn('truncate text-[15px]', checkIn ? 'text-white' : 'text-neutral-400')}>{checkIn ? short(checkIn) : t('search.addDate')}</span>
        </button>
        <span className="my-4 w-px bg-white/12" aria-hidden="true" />
        <button type="button" onClick={() => setPanel(panel === 'dates' ? null : 'dates')} className={cn(seg, 'flex-1', panel === 'dates' && 'bg-white/[0.08]')}>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.checkOut')}</span>
          <span className={cn('truncate text-[15px]', checkOut ? 'text-white' : 'text-neutral-400')}>{checkOut ? short(checkOut) : t('search.addDate')}</span>
        </button>
        <span className="my-4 w-px bg-white/12" aria-hidden="true" />
        <div className={cn(seg, 'flex-[1.2] flex-row items-center gap-3 pe-2', panel === 'guests' && 'bg-white/[0.08]')}>
          <button type="button" onClick={() => setPanel(panel === 'guests' ? null : 'guests')} className="flex min-w-0 flex-1 flex-col text-start">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.guests')}</span>
            <span className={cn('truncate text-[15px]', adults + children ? 'text-white' : 'text-neutral-400')}>{guestsLabel}</span>
          </button>
          <button type="submit" className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-black shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white', compact ? 'size-10' : 'h-12 px-6')}>
            <Search className="size-[18px]" aria-hidden="true" />
            {!compact && <span>{t('search.submit')}</span>}
            {compact && <span className="sr-only">{t('search.submit')}</span>}
          </button>
        </div>
      </div>

      {/* Mobile: stacked fields */}
      <div className="space-y-2 rounded-[1.6rem] border border-white/15 bg-[#111112]/92 p-3 shadow-2xl backdrop-blur-xl md:hidden">
        <label className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <MapPin className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.where')}</span>
            <input value={where} onChange={(e) => { setWhere(e.target.value); setPanel('where'); }} onFocus={() => setPanel('where')} placeholder={t('search.wherePh')} className="w-full bg-transparent text-[16px] text-white placeholder:text-neutral-400 focus:outline-none" autoComplete="off" />
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPanel('dates')} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-4 py-3 text-start">
            <CalendarDays className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.checkIn')} – {t('search.checkOut')}</span>
              <span className={cn('block truncate text-sm', checkIn ? 'text-white' : 'text-neutral-400')}>{checkIn ? `${short(checkIn)}${checkOut ? ` → ${short(checkOut)}` : ''}` : t('search.addDate')}</span>
            </span>
          </button>
          <button type="button" onClick={() => setPanel('guests')} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-4 py-3 text-start">
            <Users className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">{t('search.guests')}</span>
              <span className={cn('block truncate text-sm', adults + children ? 'text-white' : 'text-neutral-400')}>{guestsLabel}</span>
            </span>
          </button>
        </div>
        <button type="submit" className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 py-3.5 font-bold text-black">
          <Search className="size-5" aria-hidden="true" /> {t('search.submit')}
        </button>
      </div>

      {/* Panels */}
      {panel && (
        <div className={cn(
          'z-50 rounded-[1.6rem] border border-white/12 bg-[#141415] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)]',
          'fixed inset-x-3 bottom-3 max-h-[80dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:bottom-auto md:top-[calc(100%+0.75rem)] md:max-h-none',
          panel === 'where' && 'md:start-0 md:w-[26rem]',
          panel === 'dates' && 'md:start-1/2 md:w-[44rem] md:-translate-x-1/2 rtl:md:translate-x-1/2',
          panel === 'guests' && 'md:end-0 md:w-[22rem]'
        )}>
          {panel === 'where' && (
            <div role="listbox" aria-label={t('search.suggestions')}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">{t('search.suggestions')}</p>
              <button type="button" onClick={() => { setWhere(''); setPanel('dates'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/[0.06]">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-400/12"><MapPin className="size-5 text-amber-300" aria-hidden="true" /></span>
                <span className="text-white">{t('search.anywhere')}</span>
              </button>
              {suggestions.map((s) => (
                <button key={`${s.sub}-${s.name}`} type="button" role="option" aria-selected={where === s.name} onClick={() => { setWhere(s.name); setPanel('dates'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/[0.06]">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/[0.05]"><MapPin className="size-5 text-neutral-300" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-white">{s.name}</span><span className="block text-xs text-neutral-500">{s.sub}</span></span>
                  {s.count > 0 && <span className="text-xs text-amber-300">{s.count} {s.count > 1 ? t('home.houses') : t('home.house')}</span>}
                </button>
              ))}
            </div>
          )}
          {panel === 'dates' && (
            <>
              <RangeCalendar start={checkIn} end={checkOut} onChange={(s, e) => { setCheckIn(s); setCheckOut(e); if (s && e) setPanel('guests'); }} />
              <div className="mt-4 flex justify-between gap-3">
                <button type="button" onClick={() => { setCheckIn(''); setCheckOut(''); }} className="h-11 rounded-xl px-4 text-sm font-semibold text-neutral-300 underline">{t('search.clear')}</button>
                <button type="button" onClick={() => setPanel(checkIn && !checkOut ? 'dates' : 'guests')} className="h-11 rounded-xl bg-white px-6 text-sm font-bold text-black">{t('search.done')}</button>
              </div>
            </>
          )}
          {panel === 'guests' && (
            <>
              <Counter label={t('search.adults')} hint={t('search.adultsHint')} value={adults} min={0} onChange={setAdults} />
              <Counter label={t('search.children')} hint={t('search.childrenHint')} value={children} min={0} onChange={(n) => { setChildren(n); if (n > 0 && adults === 0) setAdults(1); }} />
              <button type="button" onClick={() => submit()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-black"><Search className="size-4" aria-hidden="true" />{t('search.submit')}</button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

export { addDaysKey };
