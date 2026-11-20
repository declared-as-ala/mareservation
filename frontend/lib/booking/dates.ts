/** Date helpers for the booking UI. Dates travel as YYYY-MM-DD strings (no time zones involved). */
export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
}

export function addDaysKey(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  const dt = new Date(Date.UTC(y, m, d + n));
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export function nightsBetweenKeys(a: string, b: string): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.y, pb.m, pb.d) - Date.UTC(pa.y, pa.m, pa.d)) / 86400000);
}

/** First day of a month as YYYY-MM-01, shifted by `delta` months. */
export function monthStartKey(key: string, delta = 0): string {
  const { y, m } = parseKey(key);
  const dt = new Date(Date.UTC(y, m + delta, 1));
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth(), 1);
}

export function monthEndKey(key: string): string {
  const { y, m } = parseKey(key);
  const dt = new Date(Date.UTC(y, m + 1, 0));
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

/** Weeks (Monday first) of the month containing `key`; null = padding cell. */
export function monthWeeks(key: string): (string | null)[][] {
  const { y, m } = parseKey(key);
  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toKey(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function formatLong(key: string): string {
  const { y, m, d } = parseKey(key);
  const wd = new Date(Date.UTC(y, m, d)).getUTCDay();
  const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return `${names[wd]} ${d} ${MONTHS_FR[m]} ${y}`;
}

export function formatShort(key: string): string {
  const { m, d } = parseKey(key);
  return `${d} ${MONTHS_FR[m].slice(0, 4)}${MONTHS_FR[m].length > 4 ? '.' : ''}`;
}

export const formatMoney = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('fr-TN')} TND`);
