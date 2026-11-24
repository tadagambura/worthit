// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The entitlement resolver. Pure functions, no SDK: it takes a snapshot of what RevenueCat
// says the customer owns and answers "what can this person use in this app right now?".
// Every app and every gate goes through here, so access rules live in exactly one place.
import { andList, appName, ENT, gameKey, gameOfEntitlement, isAllAccessEligible, KC_APPS, type ProductLine } from './plans';

export type Verification = 'verified' | 'verified_on_device' | 'not_requested' | 'failed';

/** One entitlement as RevenueCat reports it, reduced to what the rules need. */
export type EntitlementRecord = {
  id: string;
  isActive: boolean;
  willRenew: boolean;
  /** ISO date, or null for lifetime purchases. */
  expiresAt: string | null;
  /** Set when the store reports a failed renewal (grace period or billing retry). */
  billingIssueAt: string | null;
  /** Set when the person has turned off auto-renew. */
  unsubscribeAt: string | null;
  productId: string;
  store: string;
  isSandbox: boolean;
  verification: Verification;
};

export type Snapshot = {
  entitlements: Record<string, EntitlementRecord>;
  /** Where this came from. 'cache' means RevenueCat's signed on-device cache (offline). */
  source: 'network' | 'cache' | 'test' | 'none';
  fetchedAt: string;
  managementUrl: string | null;
  appUserId: string | null;
  /** True until the person signs in to a Kaotic Chainz account (RevenueCat logIn). */
  isAnonymous: boolean;
};

export const EMPTY_SNAPSHOT: Snapshot = {
  entitlements: {},
  source: 'none',
  fetchedAt: new Date(0).toISOString(),
  managementUrl: null,
  appUserId: null,
  isAnonymous: true,
};

export type Access = {
  app: string;
  /** Premium features of this app are unlocked (by its own Premium or by All Access). */
  premium: boolean;
  premiumSource: 'all_access' | 'app_premium' | null;
  /** This app's own Premium subscription is active (even if All Access also covers it). */
  appPremium: boolean;
  /** The KC All Access subscription (Premium in every app) is active. */
  allAccess: boolean;
  /** Owns the £25 part of All Access: every game in every app, forever. Survives any cancellation. */
  arcadePermanent: boolean;
  /** Every Arcade game in this app is playable (Premium here, All Access, or the £25 pass). */
  arcade: boolean;
  /** Games of this app bought one by one (game keys, see plans.gameKey). Kept forever. */
  games: string[];
  /** Signed in to a KC account, so purchases follow the person across KC apps. */
  signedIn: boolean;
  /** Other KC apps where this person has an active Premium (needs a KC account to be seen). */
  otherPremiums: string[];
  /** A paid subscription is active but the last renewal failed (store grace period). */
  billingIssue: { entitlement: string; since: string } | null;
  /** Subscriptions that were bought before and are no longer active (for "welcome back" UX). */
  expired: string[];
  /**
   * Individual Premium subscriptions that are still set to renew while All Access already
   * covers them: the person would be paying twice. The paywall and Settings warn about these.
   */
  overlapping: string[];
};

function live(e: EntitlementRecord | undefined, now: Date): boolean {
  if (!e || !e.isActive) return false;
  if (e.verification === 'failed') return false;
  // Don't trust a cached "active" flag past its own expiry date.
  if (e.expiresAt && new Date(e.expiresAt).getTime() <= now.getTime()) return false;
  return true;
}

export function resolveAccess(snap: Snapshot, app: string, now: Date = new Date()): Access {
  const ents = snap.entitlements;
  const has = (id: string) => live(ents[id], now);

  const allAccess = has(ENT.allAccess);
  const appPremium = has(ENT.appPremium(app));
  const viaAll = allAccess && isAllAccessEligible(app);
  const premium = viaAll || appPremium;
  const arcadePermanent = has(ENT.arcadePermanent);

  const games = Object.values(ents)
    .filter((e) => live(e, now))
    .map((e) => gameOfEntitlement(app, e.id))
    .filter((k): k is string => k != null)
    .sort();

  const otherPremiums = KC_APPS.filter((a) => a !== app && has(ENT.appPremium(a)));

  const billing = Object.values(ents)
    .filter((e) => live(e, now) && e.billingIssueAt && e.expiresAt)
    .map((e) => ({ entitlement: e.id, since: e.billingIssueAt! }));

  const expired = Object.values(ents)
    .filter((e) => e.expiresAt && !live(e, now))
    .map((e) => e.id);

  const overlapping = allAccess
    ? KC_APPS.map((a) => ENT.appPremium(a)).filter((id) => {
        const e = ents[id];
        return live(e, now) && e!.willRenew && isAllAccessEligible(id.replace(/_premium$/, ''));
      })
    : [];

  return {
    app,
    premium,
    premiumSource: viaAll ? 'all_access' : appPremium ? 'app_premium' : null,
    appPremium,
    allAccess,
    arcadePermanent,
    arcade: premium || arcadePermanent,
    games,
    signedIn: !snap.isAnonymous,
    otherPremiums,
    billingIssue: billing[0] ?? null,
    expired,
    overlapping,
  };
}

// ---------- feature gates ----------

/**
 * What a feature needs. Apps label features with these; they never check entitlements directly.
 * - free: everyone.
 * - premium: this app's Premium, or All Access.
 * - all_access: the All Access subscription only (portfolio perks).
 * - arcade: an Arcade game. Bought on its own for £0.99, or included with this app's Premium,
 *   All Access, or the £25 every-game pass. For whole-bundle checks `can('arcade')` means
 *   "every game in this app"; for one game use `canPlayGame()`.
 */
export type Tier = 'free' | 'premium' | 'all_access' | 'arcade';

export function canUse(access: Access, tier: Tier): boolean {
  switch (tier) {
    case 'free':
      return true;
    case 'premium':
      return access.premium;
    case 'all_access':
      return access.allAccess;
    case 'arcade':
      return access.arcade;
  }
}

/** One game: its own £0.99 purchase counts, as well as everything that unlocks the whole Arcade. */
export function canPlayGame(access: Access, game: { id: string; tier: Tier }): boolean {
  if (game.tier !== 'arcade') return canUse(access, game.tier);
  return access.arcade || access.games.includes(gameKey(game.id));
}

/** Declare an app's features once: `export const FEATURES = defineFeatures({ whiteboard: 'premium' })`. */
export function defineFeatures<T extends Record<string, Tier>>(map: T): T {
  return map;
}

/** Which product line unlocks a tier, so a gate can open the right paywall tab. */
export function lineForTier(tier: Tier): ProductLine {
  // App Premium is the cheapest way to every game in this app; single games have their own sheet.
  if (tier === 'premium' || tier === 'arcade') return 'app_premium';
  return 'all_access';
}

// ---------- purchase guards (no double charging) ----------

export type PurchaseCheck =
  | { ok: true; note?: string }
  | { ok: false; reason: 'owned' | 'included' | 'sign_in'; message: string };

const SIGN_IN =
  'KC All Access needs a free Kaotic Chainz account, so it works in every app and you never pay twice. App Premium and single games work without one.';

export function checkPurchase(access: Access, line: ProductLine, appName_: string, gameId?: string): PurchaseCheck {
  if (line === 'app_premium') {
    if (access.allAccess && isAllAccessEligible(access.app)) {
      return { ok: false, reason: 'included', message: `${appName_} Premium is already included in your KC All Access.` };
    }
    if (access.appPremium) return { ok: false, reason: 'owned', message: `You already have ${appName_} Premium.` };
    if (access.games.length) {
      const n = access.games.length;
      return { ok: true, note: `The ${n === 1 ? 'game' : `${n} games`} you bought stay${n === 1 ? 's' : ''} yours forever, even if Premium ends.` };
    }
    return { ok: true };
  }
  if (line === 'all_access') {
    if (access.allAccess) return { ok: false, reason: 'owned', message: 'You already have KC All Access.' };
    if (!access.signedIn) return { ok: false, reason: 'sign_in', message: SIGN_IN };
    const notes: string[] = [];
    if (access.arcadePermanent) notes.push('You already own every game, so this is just the subscription.');
    if (access.appPremium) notes.push(`Your ${appName_} Premium is switched to All Access, and the store credits the unused time.`);
    const others = access.otherPremiums.filter((a) => a !== access.app);
    if (others.length) {
      notes.push(`Cancel your ${andList(others.map(appName))} Premium in your store subscriptions after this, so you don't pay twice. All Access covers ${others.length === 1 ? 'it' : 'them'}.`);
    }
    return notes.length ? { ok: true, note: notes.join(' ') } : { ok: true };
  }
  if (line === 'arcade') {
    if (access.arcadePermanent) return { ok: false, reason: 'owned', message: 'Every game in every KC app is already yours, forever.' };
    if (!access.signedIn) return { ok: false, reason: 'sign_in', message: SIGN_IN };
    return { ok: true };
  }
  // A single game.
  if (gameId && access.games.includes(gameKey(gameId))) return { ok: false, reason: 'owned', message: 'You already own this game.' };
  if (access.arcadePermanent) return { ok: false, reason: 'included', message: 'Every game is already yours with KC All Access.' };
  if (access.premium) {
    const via = access.premiumSource === 'all_access' ? 'KC All Access' : `${appName_} Premium`;
    return { ok: false, reason: 'included', message: `This game is included in your ${via}.` };
  }
  return { ok: true };
}

/** "stackup_premium" -> "stackup". */
export function appOfEntitlement(id: string): string | null {
  return id.endsWith('_premium') ? id.slice(0, -'_premium'.length) : null;
}

/**
 * Should this app suggest KC All Access to someone who already pays for Premium in another KC
 * app? Only when we can actually see that (signed in), only if All Access isn't already on,
 * and never more often than every `everyDays` (no nagging).
 */
export function crossAppOffer(access: Access, lastShownAt: number | null, now: number, everyDays = 30): boolean {
  if (!access.signedIn || access.allAccess || !access.otherPremiums.length) return false;
  if (!isAllAccessEligible(access.app)) return false;
  return lastShownAt == null || now - lastShownAt >= everyDays * 86_400_000;
}
