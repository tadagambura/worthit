// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The shared billing service. Apps never talk to RevenueCat directly: they use <PremiumProvider>
// (premium.tsx), which uses a Billing instance from here. The SDK lives behind BillingClient so
// the rules can be tested without a store, and so web and dev builds get an honest test client.
import { EMPTY_SNAPSHOT, type EntitlementRecord, type Snapshot } from './entitlements';
import { ENT, PRICES, fallbackPrice, type BillingPeriod, type ProductLine } from './plans';
import { kv } from './storage';

export type BillingMode = 'live' | 'test' | 'unavailable';

/** A purchasable thing, as the store describes it. Never built from hardcoded product IDs. */
export type Product = {
  line: ProductLine;
  period: BillingPeriod;
  /** Localised price exactly as the store will charge it, e.g. "£3.49". */
  priceString: string;
  /** Price in pence (or the local minor unit), for "save x%" maths. Null if the store didn't say. */
  priceMinor: number | null;
  currency: string;
  title: string;
  offeringId: string;
  packageId: string;
  /** The SDK's own package object; only the client that produced it reads this. */
  raw?: unknown;
};

export type PurchaseStatus = 'success' | 'cancelled' | 'pending' | 'already_owned' | 'busy' | 'network' | 'not_allowed' | 'error' | 'unavailable';

export type PurchaseResult = { status: PurchaseStatus; message: string; snapshot?: Snapshot };

export interface BillingClient {
  mode: BillingMode;
  init(): Promise<void>;
  snapshot(): Promise<Snapshot>;
  products(app: string): Promise<Product[]>;
  /** `replacing` is the store product ID of a subscription this purchase upgrades (Android proration). */
  purchase(p: Product, opts: { replacing?: string }): Promise<Snapshot>;
  restore(): Promise<Snapshot>;
  logIn(appUserId: string): Promise<Snapshot>;
  logOut(): Promise<Snapshot>;
  /** Called whenever the SDK learns something new (renewal, expiry, a purchase on another device). */
  subscribe(cb: (s: Snapshot) => void): () => void;
}

// ---------- error handling ----------

/** RevenueCat PURCHASES_ERROR_CODE values we treat specially (the SDK sends them as strings). */
const RC = {
  cancelled: '1',
  storeProblem: '2',
  notAllowed: '3',
  notAvailable: '5',
  alreadyPurchased: '6',
  receiptInUse: '7',
  network: '10',
  otherSubscriber: '13',
  inProgress: '15',
  pending: '20',
  config: '23',
  timedOut: '32',
  offline: '35',
  otherUser: '40',
} as const;

export function classifyError(e: unknown): PurchaseResult {
  const err = (e ?? {}) as { code?: string | number; userCancelled?: boolean | null; message?: string };
  const code = err.code == null ? '' : String(err.code);
  if (err.userCancelled || code === RC.cancelled) return { status: 'cancelled', message: 'No worries, nothing was charged.' };
  switch (code) {
    case RC.pending:
      return { status: 'pending', message: "Your payment is waiting for approval. We'll unlock everything as soon as the store confirms it." };
    case RC.alreadyPurchased:
    case RC.receiptInUse:
      return { status: 'already_owned', message: 'This store account already owns that. Tap Restore purchases to bring it back.' };
    case RC.otherSubscriber:
    case RC.otherUser:
      return { status: 'already_owned', message: 'That purchase belongs to a different Kaotic Chainz account. Sign in to that account, or contact us and we will sort it.' };
    case RC.inProgress:
      return { status: 'busy', message: 'A purchase is already in progress. Give it a moment.' };
    case RC.network:
    case RC.offline:
    case RC.timedOut:
      return { status: 'network', message: "Couldn't reach the store. Check your connection and try again. You haven't been charged." };
    case RC.notAllowed:
      return { status: 'not_allowed', message: "Purchases aren't allowed on this device (parental controls or payment settings)." };
    case RC.notAvailable:
    case RC.storeProblem:
    case RC.config:
      return { status: 'error', message: "The store couldn't complete that right now. You haven't been charged. Please try again later." };
    default:
      return { status: 'error', message: "Something went wrong and the purchase didn't go through. You haven't been charged." };
  }
}

// ---------- the service ----------

/**
 * Wraps a client with the behaviour every app needs: one purchase at a time (no duplicate
 * processing from double taps), friendly results instead of exceptions, and a safe fallback
 * to the SDK's last known state when the network or RevenueCat is down.
 */
export class Billing {
  private inFlight: Promise<PurchaseResult> | null = null;
  private last: Snapshot = EMPTY_SNAPSHOT;
  private ready: Promise<void> | null = null;

  constructor(readonly client: BillingClient) {}

  get mode(): BillingMode {
    return this.client.mode;
  }

  init(): Promise<void> {
    if (!this.ready) this.ready = this.client.init().catch(() => undefined);
    return this.ready;
  }

  lastKnown(): Snapshot {
    return this.last;
  }

  async getCustomerInfo(): Promise<Snapshot> {
    await this.init();
    try {
      this.last = await this.client.snapshot();
    } catch {
      // RevenueCat or the network is down: keep the last state rather than locking people out.
    }
    return this.last;
  }

  async getProducts(app: string): Promise<Product[]> {
    await this.init();
    return this.client.products(app);
  }

  purchase(p: Product, opts: { replacing?: string } = {}): Promise<PurchaseResult> {
    if (this.client.mode === 'unavailable') {
      return Promise.resolve({ status: 'unavailable', message: "Purchases aren't available in this build yet. Everything free keeps working." });
    }
    if (this.inFlight) return Promise.resolve({ status: 'busy', message: 'A purchase is already in progress. Give it a moment.' });
    this.inFlight = (async () => {
      try {
        await this.init();
        this.last = await this.client.purchase(p, opts);
        return { status: 'success' as const, message: successMessage(p), snapshot: this.last };
      } catch (e) {
        return classifyError(e);
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  get busy(): boolean {
    return this.inFlight != null;
  }

  async restorePurchases(): Promise<PurchaseResult> {
    if (this.client.mode === 'unavailable') return { status: 'unavailable', message: 'Nothing to restore in this build.' };
    try {
      await this.init();
      this.last = await this.client.restore();
      const any = Object.values(this.last.entitlements).some((e) => e.isActive);
      return any
        ? { status: 'success', message: 'Purchases restored. Welcome back!', snapshot: this.last }
        : { status: 'success', message: 'No active purchases found for this store account.', snapshot: this.last };
    } catch (e) {
      const r = classifyError(e);
      return r.status === 'cancelled' ? { status: 'cancelled', message: 'Restore cancelled.' } : r;
    }
  }

  async logIn(appUserId: string): Promise<Snapshot> {
    await this.init();
    this.last = await this.client.logIn(appUserId);
    return this.last;
  }

  async logOut(): Promise<Snapshot> {
    await this.init();
    try {
      this.last = await this.client.logOut();
    } catch {
      // Logging out an anonymous user is a no-op.
    }
    return this.last;
  }

  subscribe(cb: (s: Snapshot) => void): () => void {
    return this.client.subscribe((s) => {
      this.last = s;
      cb(s);
    });
  }
}

function successMessage(p: Product): string {
  if (p.line === 'arcade') return 'KC Arcade is yours, forever. Have fun!';
  if (p.line === 'all_access') return 'KC All Access is on. Every app, every game. Thank you!';
  return 'Premium is on. Thank you for supporting a small independent studio!';
}

// ---------- the test client (dev builds and web) ----------

const DAY = 86_400_000;

/**
 * A pretend store for development builds, the web build and automated tests. It behaves like
 * RevenueCat (entitlements with expiry dates, renewals, cancellations) and is clearly labelled
 * as test mode in the UI. Release builds without store keys get `mode: 'unavailable'` instead.
 */
export function testClient(app: string, enabled: boolean, now: () => number = Date.now): BillingClient & { controls: TestControls } {
  const key = 'kc.billing.test';
  const listeners = new Set<(s: Snapshot) => void>();
  const read = (): Record<string, EntitlementRecord> => {
    try {
      return JSON.parse(kv.get(key) ?? '{}');
    } catch {
      return {};
    }
  };
  const write = (ents: Record<string, EntitlementRecord>) => {
    kv.set(key, JSON.stringify(ents));
    const s = snap();
    listeners.forEach((l) => l(s));
  };
  const snap = (): Snapshot => {
    const ents = read();
    const t = now();
    for (const e of Object.values(ents)) e.isActive = !e.expiresAt || new Date(e.expiresAt).getTime() > t;
    return { entitlements: ents, source: 'test', fetchedAt: new Date(t).toISOString(), managementUrl: null, appUserId: 'test-user', isAnonymous: true };
  };
  let nextFailure: string | null = null;

  const grant = (ids: string[], period: BillingPeriod, productId: string) => {
    const ents = read();
    const expiresAt = period === 'lifetime' ? null : new Date(now() + (period === 'monthly' ? 30 : 365) * DAY).toISOString();
    for (const id of ids) {
      ents[id] = { id, isActive: true, willRenew: period !== 'lifetime', expiresAt, billingIssueAt: null, unsubscribeAt: null, productId, store: 'TEST_STORE', isSandbox: true, verification: 'not_requested' };
    }
    write(ents);
  };

  const controls: TestControls = {
    failNext: (code) => {
      nextFailure = code;
    },
    expireAll: () => {
      const ents = read();
      for (const e of Object.values(ents)) if (e.expiresAt) e.expiresAt = new Date(now() - 1000).toISOString();
      write(ents);
    },
    billingIssue: () => {
      const ents = read();
      for (const e of Object.values(ents)) if (e.expiresAt) e.billingIssueAt = new Date(now()).toISOString();
      write(ents);
    },
    cancelRenewals: () => {
      const ents = read();
      for (const e of Object.values(ents)) if (e.expiresAt) {
        e.willRenew = false;
        e.unsubscribeAt = new Date(now()).toISOString();
      }
      write(ents);
    },
    reset: () => write({}),
    grant: (entitlement, period) => grant([entitlement], period, `test.${entitlement}`),
  };

  const products = (a: string): Product[] => {
    const lines: [ProductLine, BillingPeriod][] = [
      ['app_premium', 'monthly'],
      ['app_premium', 'annual'],
      ['all_access', 'monthly'],
      ['all_access', 'annual'],
      ['arcade', 'lifetime'],
    ];
    return lines.map(([line, period]) => ({
      line,
      period,
      priceString: fallbackPrice(line, period)!,
      priceMinor: PRICES[line][period]!,
      currency: 'GBP',
      title: `${line} ${period}`,
      offeringId: line === 'app_premium' ? `${a}_premium` : line === 'all_access' ? 'kc_all_access' : 'kc_arcade',
      packageId: `$rc_${period}`,
      raw: { productId: `test.${a}.${line}.${period}` },
    }));
  };

  return {
    mode: enabled ? 'test' : 'unavailable',
    controls,
    init: async () => undefined,
    snapshot: async () => (enabled ? snap() : EMPTY_SNAPSHOT),
    products: async (a) => (enabled ? products(a) : []),
    purchase: async (p) => {
      if (!enabled) throw { code: RC.config, message: 'unavailable' };
      if (nextFailure) {
        const code = nextFailure;
        nextFailure = null;
        throw { code, message: 'simulated', userCancelled: code === RC.cancelled };
      }
      const productId = (p.raw as { productId?: string } | undefined)?.productId ?? 'test';
      const ids = p.line === 'app_premium' ? [ENT.appPremium(app)] : p.line === 'all_access' ? [ENT.allAccess, ENT.arcadeSubscription] : [ENT.arcadePermanent];
      grant(ids, p.period, productId);
      if (p.line === 'all_access') {
        // Like the real stores: the app's own Premium is replaced by the upgrade, not billed alongside it.
        const ents = read();
        const own = ents[ENT.appPremium(app)];
        if (own) {
          own.expiresAt = new Date(now() - 1000).toISOString();
          own.willRenew = false;
          write(ents);
        }
      }
      return snap();
    },
    restore: async () => (enabled ? snap() : EMPTY_SNAPSHOT),
    logIn: async () => snap(),
    logOut: async () => snap(),
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

export type TestControls = {
  /** Make the next purchase fail with a RevenueCat error code ('1' cancelled, '20' pending, '10' network…). */
  failNext: (code: string) => void;
  expireAll: () => void;
  billingIssue: () => void;
  cancelRenewals: () => void;
  reset: () => void;
  grant: (entitlement: string, period: BillingPeriod) => void;
};
