// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Money is always integer pence. Floats never touch stored amounts.

export type Pence = number;

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const gbpWhole = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** 123456 → "£1,234.56". `whole` drops pence when they're zero. */
export function formatGBP(p: Pence, opts: { whole?: boolean; sign?: boolean } = {}): string {
  const v = p / 100;
  const s = opts.whole && p % 100 === 0 ? gbpWhole.format(Math.abs(v)) : gbp.format(Math.abs(v));
  if (p < 0) return '−' + s;
  return opts.sign && p > 0 ? '+' + s : s;
}

/**
 * Parse what a person types into pence. Accepts "12", "12.5", "£12.50", "1,200", " 3.99 ".
 * Returns null for anything that isn't a clear amount (including more than 2 decimals).
 */
export function parseGBP(input: string): Pence | null {
  const s = input.trim().replace(/^£/, '').replace(/,/g, '').trim();
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

/** Pence → the string to prefill an input with ("12.50", or "12" for whole pounds). */
export function toInput(p: Pence): string {
  if (p % 100 === 0) return String(p / 100);
  return (p / 100).toFixed(2);
}

/** Split pence across n parts as evenly as possible (remainder goes to the first parts). */
export function splitEvenly(total: Pence, n: number): Pence[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
