// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The entitlement resolver. Pure functions, no SDK: it takes a snapshot of what RevenueCat
// says the customer owns and answers "what can this person use in this app right now?".
// Every app and every gate goes through here, so access rules live in exactly one place.
import { ENT, isAllAccessEligible, KC_APPS, type ProductLine } from './plans';

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
  allAccess: boolean;
  /** Owns KC Arcade forever (one-off purchase). Survives any subscription ending. */
  arcadePermanent: boolean;
  /** Arcade through a subscription (All Access). Ends when the subscription ends. */
  arcadeSubscription: boolean;
  /** Any Arcade access at all. */
  arcade: boolean;
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
  const arcadePermanent = has(ENT.arcadePermanent);
  const arcadeSubscription = has(ENT.arcadeSubscription) || allAccess;

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
    premium: viaAll || appPremium,
    premiumSource: viaAll ? 'all_access' : appPremium ? 'app_premium' : null,
    appPremium,
    allAccess,
    arcadePermanent,
    arcadeSubscription,
    arcade: arcadePermanent || arcadeSubscription,
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
 * - all_access: All Access only (portfolio perks).
 * - arcade: included KC Arcade games (permanent purchase or All Access).
 * - arcade_subscription: subscriber-only games (All Access).
 */
export type Tier = 'free' | 'premium' | 'all_access' | 'arcade' | 'arcade_subscription';

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
    case 'arcade_subscription':
      return access.arcadeSubscription;
  }
}

/** Declare an app's features once: `export const FEATURES = defineFeatures({ whiteboard: 'premium' })`. */
export function defineFeatures<T extends Record<string, Tier>>(map: T): T {
  return map;
}

/** Which product line unlocks a tier, so a gate can open the right paywall tab. */
export function lineForTier(tier: Tier): ProductLine {
  if (tier === 'arcade') return 'arcade';
  if (tier === 'premium') return 'app_premium';
  return 'all_access';
}

// ---------- purchase guards (no double charging) ----------

export type PurchaseCheck =
  | { ok: true; note?: string }
  | { ok: false; reason: 'owned' | 'included'; message: string };

export function checkPurchase(access: Access, line: ProductLine, appName: string): PurchaseCheck {
  if (line === 'app_premium') {
    if (access.allAccess && isAllAccessEligible(access.app)) {
      return { ok: false, reason: 'included', message: `${appName} Premium is already included in your KC All Access.` };
    }
    if (access.appPremium) return { ok: false, reason: 'owned', message: `You already have ${appName} Premium.` };
    return { ok: true };
  }
  if (line === 'all_access') {
    if (access.allAccess) return { ok: false, reason: 'owned', message: 'You already have KC All Access.' };
    if (access.appPremium) {
      return { ok: true, note: `Your ${appName} Premium is switched to All Access, and the store credits the unused time.` };
    }
    return { ok: true };
  }
  if (access.arcadePermanent) return { ok: false, reason: 'owned', message: 'You already own KC Arcade.' };
  if (access.arcadeSubscription) {
    return { ok: true, note: 'All Access already includes the Arcade while you subscribe. Buying it keeps the included games forever.' };
  }
  return { ok: true };
}

/** "stackup_premium" -> "stackup". */
export function appOfEntitlement(id: string): string | null {
  return id.endsWith('_premium') ? id.slice(0, -'_premium'.length) : null;
}
