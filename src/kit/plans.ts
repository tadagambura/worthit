// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The one place that knows Kaotic Chainz prices, entitlement names and product naming.
// Prices here are DISPLAY FALLBACKS only (test mode, and before the store answers). In live
// mode the paywall shows the store's localised price string from RevenueCat, which is what
// the person is actually charged.

export type BillingPeriod = 'monthly' | 'annual' | 'lifetime';
export type ProductLine = 'app_premium' | 'all_access' | 'arcade';

/** Edit prices here and nowhere else. Pence, so maths never rounds badly. */
export const PRICES: Record<ProductLine, Partial<Record<BillingPeriod, number>>> = {
  app_premium: { monthly: 349, annual: 3499 },
  all_access: { monthly: 799, annual: 7999 },
  arcade: { lifetime: 1499 },
};

export const CURRENCY = 'GBP';

/** Apps in the portfolio. Add a slug here when a new app joins; nothing else needs to change. */
export const KC_APPS = [
  'stackup',
  'worthit',
  'afterhours',
  'thirsty',
  'loopday',
  'kidquest',
  'flipped',
  'shiftledger',
  'reset',
  'grannysvault',
  'braindump',
  'plateweek',
  'daymark',
  'keepit',
  'studysprint',
  'pawplan',
  'tripsplit',
  'screentime',
] as const;

/**
 * Apps whose Premium is included in KC All Access. Every app is eligible by default; list a
 * slug here only to exclude it (for example an app with very high running costs).
 */
export const ALL_ACCESS_EXCLUDED: readonly string[] = [];

// ---------- entitlement identifiers (must match the RevenueCat dashboard exactly) ----------

export const ENT = {
  allAccess: 'kc_all_access',
  arcadePermanent: 'kc_arcade_permanent',
  arcadeSubscription: 'kc_arcade_subscription',
  appPremium: (app: string) => `${app}_premium`,
} as const;

export function isAllAccessEligible(app: string): boolean {
  return !ALL_ACCESS_EXCLUDED.includes(app);
}

// ---------- offerings (what each paywall asks RevenueCat for) ----------

/**
 * Offering identifiers. Each app has its own offering for its Premium, plus the two shared
 * offerings. RevenueCat packages inside them use the standard identifiers ($rc_monthly,
 * $rc_annual, $rc_lifetime), so the app never needs to know a store product ID.
 */
export const OFFERING = {
  appPremium: (app: string) => `${app}_premium`,
  allAccess: 'kc_all_access',
  arcade: 'kc_arcade',
} as const;

export const PACKAGE: Record<BillingPeriod, string> = {
  monthly: '$rc_monthly',
  annual: '$rc_annual',
  lifetime: '$rc_lifetime',
};

/**
 * Store product IDs, documented for setting up App Store Connect and Google Play. Apple product
 * IDs are unique across the whole developer account, so every app gets its own copy of the
 * All Access and Arcade products; RevenueCat maps them all to the same entitlements.
 * The app code never uses these: it reads products from offerings.
 */
export function storeProductId(app: string, line: ProductLine, period: BillingPeriod): string {
  const name = line === 'app_premium' ? 'premium' : line === 'all_access' ? 'allaccess' : 'arcade';
  return `kc.${app}.${name}.${period}`;
}

/** Entitlements a product must be attached to in RevenueCat. */
export function entitlementsForLine(app: string, line: ProductLine): string[] {
  if (line === 'app_premium') return [ENT.appPremium(app)];
  if (line === 'all_access') return [ENT.allAccess, ENT.arcadeSubscription];
  return [ENT.arcadePermanent];
}

// ---------- display ----------

export function formatPence(p: number): string {
  return `£${(p / 100).toFixed(2)}`;
}

export function fallbackPrice(line: ProductLine, period: BillingPeriod): string | null {
  const p = PRICES[line][period];
  return p == null ? null : formatPence(p);
}

export function periodLabel(period: BillingPeriod): string {
  return period === 'monthly' ? 'a month' : period === 'annual' ? 'a year' : 'once';
}

/** "Works out at £2.92 a month", for annual plans, from the store's own numbers. */
export function monthlyEquivalent(annualPence: number): string {
  return formatPence(Math.floor(annualPence / 12));
}

/** Whole-number saving of annual against twelve monthly payments. */
export function annualSavingPercent(monthlyPence: number, annualPence: number): number {
  const full = monthlyPence * 12;
  if (full <= 0) return 0;
  return Math.max(0, Math.floor(((full - annualPence) / full) * 100));
}

export const LINE_COPY: Record<ProductLine, { title: string; blurb: (appName: string) => string }> = {
  app_premium: { title: 'Premium', blurb: (n) => `Everything in ${n}, unlocked. This app only.` },
  all_access: {
    title: 'KC All Access',
    blurb: () => 'Premium in every Kaotic Chainz app, the whole KC Arcade, and subscriber-only games.',
  },
  arcade: {
    title: 'KC Arcade',
    blurb: () => "Every included Arcade game, yours to keep. One payment, no subscription. Doesn't include app Premium.",
  },
};
