// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The live BillingClient: RevenueCat (react-native-purchases). RevenueCat is the source of truth
// for purchases and entitlements; this file only translates between its types and ours.
// Nothing here knows store product IDs: products come from offerings (see plans.ts OFFERING).
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import type { BillingClient, Product } from './billing';
import type { EntitlementRecord, Snapshot, Verification } from './entitlements';
import { gameOfPackage, OFFERING, PACKAGE, type BillingPeriod, type ProductLine } from './plans';

function verification(v: string | undefined): Verification {
  if (v === 'VERIFIED') return 'verified';
  if (v === 'VERIFIED_ON_DEVICE') return 'verified_on_device';
  if (v === 'FAILED') return 'failed';
  return 'not_requested';
}

function record(e: PurchasesEntitlementInfo): EntitlementRecord {
  return {
    id: e.identifier,
    isActive: e.isActive,
    willRenew: e.willRenew,
    expiresAt: e.expirationDate,
    billingIssueAt: e.billingIssueDetectedAt,
    unsubscribeAt: e.unsubscribeDetectedAt,
    productId: e.productIdentifier,
    store: String(e.store),
    isSandbox: e.isSandbox,
    verification: verification((e as { verification?: string }).verification),
  };
}

export function toSnapshot(info: CustomerInfo, source: Snapshot['source'], isAnonymous: boolean): Snapshot {
  const entitlements: Record<string, EntitlementRecord> = {};
  for (const [id, e] of Object.entries(info.entitlements.all)) entitlements[id] = record(e);
  return {
    entitlements,
    source,
    fetchedAt: info.requestDate ?? new Date().toISOString(),
    managementUrl: info.managementURL,
    appUserId: info.originalAppUserId,
    isAnonymous,
  };
}

const PERIOD_BY_PACKAGE: Record<string, BillingPeriod> = {
  [PACKAGE.monthly]: 'monthly',
  [PACKAGE.annual]: 'annual',
  [PACKAGE.lifetime]: 'lifetime',
};

function productsFrom(offering: PurchasesOffering | undefined, line: ProductLine): Product[] {
  if (!offering) return [];
  return offering.availablePackages
    .map((pkg: PurchasesPackage): Product | null => {
      // Games are custom packages named game_<key>, one per game, all bought once.
      const gameId = line === 'game' ? gameOfPackage(pkg.identifier) : null;
      const period = line === 'game' ? (gameId ? 'lifetime' : undefined) : PERIOD_BY_PACKAGE[pkg.identifier];
      if (!period) return null;
      return {
        line,
        period,
        ...(gameId ? { gameId } : {}),
        priceString: pkg.product.priceString,
        priceMinor: Number.isFinite(pkg.product.price) ? Math.round(pkg.product.price * 100) : null,
        currency: pkg.product.currencyCode,
        title: pkg.product.title,
        offeringId: offering.identifier,
        packageId: pkg.identifier,
        raw: pkg,
      };
    })
    .filter((p): p is Product => p != null);
}

export type RevenueCatKeys = { ios?: string; android?: string };

/** The public SDK key for this platform, or null if this build has none. */
export function revenueCatKey(keys: RevenueCatKeys, isDev: boolean): string | null {
  const key = Platform.OS === 'ios' ? keys.ios : Platform.OS === 'android' ? keys.android : undefined;
  if (!key) return null;
  // RevenueCat Test Store keys crash release builds: only ever use them in development.
  if (key.startsWith('test_') && !isDev) return null;
  return key;
}

export function revenueCatClient(apiKey: string, isDev: boolean): BillingClient {
  let anonymous = true;
  const listeners = new Set<(s: Snapshot) => void>();

  return {
    mode: 'live',
    init: async () => {
      if (isDev) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({
        apiKey,
        // Signed responses, so a tampered cache or a man-in-the-middle can't fake Premium.
        entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
      });
      Purchases.addCustomerInfoUpdateListener((info) => {
        const s = toSnapshot(info, 'network', anonymous);
        listeners.forEach((l) => l(s));
      });
      anonymous = await Purchases.isAnonymous().catch(() => true);
    },
    snapshot: async () => {
      // The SDK returns its cached copy instantly when offline and refreshes in the background.
      const info = await Purchases.getCustomerInfo();
      return toSnapshot(info, 'network', anonymous);
    },
    products: async (app) => {
      const all = (await Purchases.getOfferings()).all;
      return [
        ...productsFrom(all[OFFERING.appPremium(app)], 'app_premium'),
        ...productsFrom(all[OFFERING.allAccess], 'all_access'),
        ...productsFrom(all[OFFERING.arcade], 'arcade'),
        ...productsFrom(all[OFFERING.games(app)], 'game'),
      ];
    },
    purchase: async (p, opts) => {
      const pkg = p.raw as PurchasesPackage;
      // Android needs to be told an upgrade replaces the old plan, or both would bill.
      // On iOS, Premium and All Access sit in one subscription group, so StoreKit swaps them itself.
      const change =
        Platform.OS === 'android' && opts.replacing
          ? { oldProductIdentifier: opts.replacing.split(':')[0], prorationMode: Purchases.PRORATION_MODE.IMMEDIATE_WITH_TIME_PRORATION }
          : null;
      const { customerInfo } = await Purchases.purchasePackage(pkg, null, change);
      return toSnapshot(customerInfo, 'network', anonymous);
    },
    restore: async () => toSnapshot(await Purchases.restorePurchases(), 'network', anonymous),
    logIn: async (id) => {
      const { customerInfo } = await Purchases.logIn(id);
      anonymous = false;
      return toSnapshot(customerInfo, 'network', false);
    },
    logOut: async () => {
      const info = await Purchases.logOut();
      anonymous = true;
      return toSnapshot(info, 'network', true);
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
