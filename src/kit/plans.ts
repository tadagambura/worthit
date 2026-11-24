// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The one place that knows Kaotic Chainz prices, entitlement names and product naming.
// Prices here are DISPLAY FALLBACKS only (test mode, and before the store answers). In live
// mode the paywall shows the store's localised price string from RevenueCat, which is what
// the person is actually charged.
//
// The structure (owner decision, 24 Nov 2026):
//   game         £0.99 once, per Arcade game, in the app it belongs to.
//   app_premium  £3.49 a month (or £34.99 a year): this app's Premium features, cards and
//                extras, plus every Arcade game in this app while subscribed.
//   all_access   KC All Access, sold as two store purchases (the stores can't add a one-off
//                fee to a subscription):
//                  arcade      £25 once: every Arcade game in every KC app, kept forever,
//                  all_access  £7.99 a month (or £79.99 a year): Premium in every KC app.
//                Needs a KC account, so it works in every app and nobody pays twice.

export type BillingPeriod = 'monthly' | 'annual' | 'lifetime';
/** `arcade` is the £25 one-time part of KC All Access. `game` is one £0.99 Arcade game. */
export type ProductLine = 'app_premium' | 'all_access' | 'arcade' | 'game';

/** Edit prices here and nowhere else. Pence, so maths never rounds badly. */
export const PRICES: Record<ProductLine, Partial<Record<BillingPeriod, number>>> = {
  app_premium: { monthly: 349, annual: 3499 },
  all_access: { monthly: 799, annual: 7999 },
  arcade: { lifetime: 2500 },
  game: { lifetime: 99 },
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

/** Display names, for copy that mentions another app ("You have Premium in StackUp"). */
export const KC_APP_NAMES: Record<string, string> = {
  stackup: 'StackUp',
  worthit: 'WorthIt?',
  afterhours: 'AfterHours',
  thirsty: 'Thirsty',
  loopday: 'LoopDay',
  kidquest: 'KidQuest',
  flipped: 'Flipped',
  shiftledger: 'ShiftLedger',
  reset: 'Reset',
  grannysvault: "Granny's Vault",
  braindump: 'Brain Dump',
  plateweek: 'PlateWeek',
  daymark: 'Daymark',
  keepit: 'KeepIt',
  studysprint: 'StudySprint',
  pawplan: 'PawPlan',
  tripsplit: 'TripSplit',
};

export function appName(slug: string): string {
  return KC_APP_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** "StackUp", "StackUp and LoopDay", "StackUp, LoopDay and Reset". */
export function andList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Apps whose Premium is included in KC All Access. Every app is eligible by default; list a
 * slug here only to exclude it (for example an app with very high running costs).
 */
export const ALL_ACCESS_EXCLUDED: readonly string[] = [];

export function isAllAccessEligible(app: string): boolean {
  return !ALL_ACCESS_EXCLUDED.includes(app);
}

// ---------- entitlement identifiers (must match the RevenueCat dashboard exactly) ----------

/** Game ids use hyphens; store product IDs and entitlements can't, so they use this key. */
export function gameKey(gameId: string): string {
  return gameId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export const ENT = {
  allAccess: 'kc_all_access',
  /** The £25 part of All Access: every Arcade game in every app, forever. */
  arcadePermanent: 'kc_arcade_permanent',
  appPremium: (app: string) => `${app}_premium`,
  game: (app: string, gameId: string) => `${app}_game_${gameKey(gameId)}`,
} as const;

/** "stackup_game_money_word" -> "money_word" when it belongs to `app`. */
export function gameOfEntitlement(app: string, id: string): string | null {
  const prefix = `${app}_game_`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : null;
}

// ---------- offerings (what each paywall asks RevenueCat for) ----------

/**
 * Offering identifiers. Each app has an offering for its Premium and one for its games, plus
 * the two shared offerings. Subscription and £25 packages use the standard identifiers
 * ($rc_monthly, $rc_annual, $rc_lifetime); each game is a custom package named `game_<key>`.
 * The app never needs to know a store product ID.
 */
export const OFFERING = {
  appPremium: (app: string) => `${app}_premium`,
  games: (app: string) => `${app}_games`,
  allAccess: 'kc_all_access',
  arcade: 'kc_arcade',
} as const;

export const PACKAGE: Record<BillingPeriod, string> = {
  monthly: '$rc_monthly',
  annual: '$rc_annual',
  lifetime: '$rc_lifetime',
};

export function gamePackage(gameId: string): string {
  return `game_${gameKey(gameId)}`;
}

/** "game_money_word" -> "money_word". */
export function gameOfPackage(packageId: string): string | null {
  return packageId.startsWith('game_') ? packageId.slice('game_'.length) : null;
}

/**
 * Store product IDs, documented for setting up App Store Connect and Google Play. Apple product
 * IDs are unique across the whole developer account, so every app gets its own copy of the
 * All Access products; RevenueCat maps them all to the same entitlements.
 * The app code never uses these: it reads products from offerings.
 */
export function storeProductId(app: string, line: ProductLine, period: BillingPeriod, gameId?: string): string {
  if (line === 'game') {
    if (!gameId) throw new Error('storeProductId: a game product needs its game id');
    return `kc.${app}.game.${gameKey(gameId)}`;
  }
  const name = line === 'app_premium' ? 'premium' : line === 'all_access' ? 'allaccess' : 'arcade';
  return `kc.${app}.${name}.${period}`;
}

/** Entitlements a product must be attached to in RevenueCat. */
export function entitlementsForLine(app: string, line: ProductLine, gameId?: string): string[] {
  if (line === 'app_premium') return [ENT.appPremium(app)];
  if (line === 'all_access') return [ENT.allAccess];
  if (line === 'arcade') return [ENT.arcadePermanent];
  if (!gameId) throw new Error('entitlementsForLine: a game product needs its game id');
  return [ENT.game(app, gameId)];
}

export type StoreProduct = {
  line: ProductLine;
  period: BillingPeriod;
  /** App Store Connect product ID; on Google Play, the subscription ID plus base plan (see storeSetup docs). */
  productId: string;
  kind: 'subscription' | 'non_consumable';
  pence: number;
  entitlements: string[];
  offering: string;
  package: string;
  gameId?: string;
};

/** Everything one app sells, for the store and RevenueCat setup sheet (scripts/store_products.ts). */
export function storeCatalog(app: string, paidGameIds: readonly string[]): StoreProduct[] {
  const subs: [ProductLine, BillingPeriod, string][] = [
    ['app_premium', 'monthly', OFFERING.appPremium(app)],
    ['app_premium', 'annual', OFFERING.appPremium(app)],
    ['all_access', 'monthly', OFFERING.allAccess],
    ['all_access', 'annual', OFFERING.allAccess],
  ];
  return [
    ...subs.map(([line, period, offering]): StoreProduct => ({
      line,
      period,
      productId: storeProductId(app, line, period),
      kind: 'subscription',
      pence: PRICES[line][period]!,
      entitlements: entitlementsForLine(app, line),
      offering,
      package: PACKAGE[period],
    })),
    {
      line: 'arcade',
      period: 'lifetime',
      productId: storeProductId(app, 'arcade', 'lifetime'),
      kind: 'non_consumable',
      pence: PRICES.arcade.lifetime!,
      entitlements: entitlementsForLine(app, 'arcade'),
      offering: OFFERING.arcade,
      package: PACKAGE.lifetime,
    },
    ...paidGameIds.map((id): StoreProduct => ({
      line: 'game',
      period: 'lifetime',
      productId: storeProductId(app, 'game', 'lifetime', id),
      kind: 'non_consumable',
      pence: PRICES.game.lifetime!,
      entitlements: entitlementsForLine(app, 'game', id),
      offering: OFFERING.games(app),
      package: gamePackage(id),
      gameId: gameKey(id),
    })),
  ];
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

/**
 * The "buy them one by one, or subscribe" comparison the paywall shows. Honest by construction:
 * it only counts games the person hasn't got yet, and says once vs monthly in plain words.
 */
export function gamesValue(lockedGames: number, gamePence: number = PRICES.game.lifetime!): { count: number; totalPence: number; total: string } {
  const totalPence = Math.max(0, lockedGames) * gamePence;
  return { count: Math.max(0, lockedGames), totalPence, total: formatPence(totalPence) };
}

export const LINE_COPY: Record<ProductLine, { title: string; blurb: (appName: string) => string }> = {
  app_premium: { title: 'Premium', blurb: (n) => `Everything in ${n} unlocked, including every Arcade game in ${n}. This app only.` },
  all_access: {
    title: 'KC All Access',
    blurb: () => 'Premium in every Kaotic Chainz app, and every Arcade game in every app, yours forever.',
  },
  arcade: {
    title: 'Every game, forever',
    blurb: () => 'The one-off part of KC All Access: every Arcade game in every Kaotic Chainz app, yours to keep.',
  },
  game: { title: 'This game', blurb: () => 'Buy this one game and keep it forever. No subscription.' },
};
