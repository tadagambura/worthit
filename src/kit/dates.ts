// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Calendar days as local 'YYYY-MM-DD' keys. All arithmetic goes through UTC components so
// daylight-saving changes (BST) never add or lose a day.

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayKey = () => dayKey(new Date());

export function isDayKey(s: unknown): s is DayKey {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s));
}

function toUTC(k: DayKey): number {
  const [y, m, d] = k.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return NaN;
  return t;
}

function fromUTC(t: number): DayKey {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DAY = 86_400_000;

export function addDays(k: DayKey, n: number): DayKey {
  return fromUTC(toUTC(k) + n * DAY);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(k: DayKey): number {
  return new Date(toUTC(k)).getUTCDay();
}

/** Monday-start week by default, as in the UK. */
export function startOfWeek(k: DayKey, weekStartsOn = 1): DayKey {
  const back = (weekday(k) - weekStartsOn + 7) % 7;
  return addDays(k, -back);
}

export function addMonths(k: DayKey, n: number, clampDay?: number): DayKey {
  const [y, m, d] = k.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(clampDay ?? d, last);
  return fromUTC(Date.UTC(ty, tm, day));
}

export function daysInMonth(k: DayKey): number {
  const [y, m] = k.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthKey(k: DayKey): string {
  return k.slice(0, 7);
}

export function range(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; diffDays(k, to) >= 0; k = addDays(k, 1)) out.push(k);
  return out;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const id = JSON.stringify(opts);
  let f = fmtCache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' });
    fmtCache.set(id, f);
  }
  return f;
}

/** e.g. "Mon 24 Nov" */
export function formatDay(k: DayKey, style: 'short' | 'long' | 'weekday' | 'month' = 'short'): string {
  const t = toUTC(k);
  if (style === 'long') return fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(t);
  if (style === 'weekday') return fmt({ weekday: 'short' }).format(t);
  if (style === 'month') return fmt({ month: 'long', year: 'numeric' }).format(t);
  return fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(t);
}

/** "today", "tomorrow", "in 3 days", "2 days ago" */
export function relativeDay(k: DayKey, today: DayKey = todayKey()): string {
  const n = diffDays(today, k);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
