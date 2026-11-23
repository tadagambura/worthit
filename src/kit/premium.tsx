// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// <PremiumProvider> and the hooks apps use for everything paid:
//   const { isPremium, can, purchase, restore } = usePremium();
//   <Gate tier="premium" reason="…">…</Gate>
// Access always comes from RevenueCat's customer info through the shared resolver
// (entitlements.ts). There is no local "isPremium" flag to tamper with or to go stale.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { track } from './analytics';
import { Billing, type BillingMode, type Product, type PurchaseResult, type TestControls } from './billing';
import { canUse, checkPurchase, EMPTY_SNAPSHOT, resolveAccess, type Access, type Snapshot, type Tier } from './entitlements';
import { ENT, type ProductLine } from './plans';

/** Kept for older call sites: the mode the paywall shows. */
export type PremiumMode = BillingMode;

type ProductsState = { status: 'idle' | 'loading' | 'ready' | 'error'; items: Product[] };

export type PremiumValue = {
  mode: BillingMode;
  /** False until the first customer info arrives (gates show their free state meanwhile). */
  ready: boolean;
  access: Access;
  snapshot: Snapshot;
  /** This app's Premium features are unlocked (own Premium or All Access). */
  isPremium: boolean;
  can: (tier: Tier) => boolean;
  products: ProductsState;
  loadProducts: () => Promise<void>;
  purchase: (p: Product) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  refresh: () => Promise<void>;
  /** Opens the store's subscription management page. */
  manageSubscriptions: () => Promise<void>;
  /** Link purchases to a Kaotic Chainz account (call after sign-in), and back to anonymous. */
  identify: (kcUserId: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** A purchase is waiting for approval (Ask to Buy, slow card checks). */
  pending: boolean;
  /** Only in test mode: simulate expiry, billing failures, cancellations. */
  test: TestControls | null;
};

const Ctx = createContext<PremiumValue | null>(null);

const STORE_MANAGE = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};

export function PremiumProvider({
  app,
  appName,
  billing,
  test,
  children,
}: {
  app: string;
  appName: string;
  billing: Billing;
  test?: TestControls | null;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(billing.lastKnown());
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [products, setProducts] = useState<ProductsState>({ status: 'idle', items: [] });
  const productsRef = useRef(products);
  productsRef.current = products;

  const refresh = useCallback(async () => {
    setSnapshot(await billing.getCustomerInfo());
    setReady(true);
  }, [billing]);

  useEffect(() => {
    let alive = true;
    billing.getCustomerInfo().then((s) => {
      if (!alive) return;
      setSnapshot(s);
      setReady(true);
    });
    // Renewals, expiries, refunds and purchases made on another device arrive here.
    const off = billing.subscribe((s) => {
      setSnapshot(s);
      setPending(false);
    });
    // Coming back to the app is when cross-device changes most often land.
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') billing.getCustomerInfo().then((s) => alive && setSnapshot(s));
    });
    return () => {
      alive = false;
      off();
      sub.remove();
    };
  }, [billing]);

  const access = useMemo(() => resolveAccess(snapshot, app), [snapshot, app]);

  const loadProducts = useCallback(async () => {
    if (productsRef.current.status === 'loading' || productsRef.current.status === 'ready') return;
    setProducts({ status: 'loading', items: [] });
    try {
      const items = await billing.getProducts(app);
      setProducts({ status: items.length ? 'ready' : 'error', items });
    } catch {
      setProducts({ status: 'error', items: [] });
    }
  }, [billing, app]);

  const purchase = useCallback(
    async (p: Product): Promise<PurchaseResult> => {
      const check = checkPurchase(access, p.line, appName);
      if (!check.ok) return { status: 'already_owned', message: check.message };
      track('core_action_started', { action: 'purchase', line: p.line, period: p.period, mode: billing.mode });
      const replacing = p.line === 'all_access' && access.appPremium ? snapshot.entitlements[ENT.appPremium(app)]?.productId : undefined;
      const r = await billing.purchase(p, { replacing });
      if (r.snapshot) setSnapshot(r.snapshot);
      setPending(r.status === 'pending');
      if (r.status === 'success') track('subscription_started', { line: p.line, period: p.period, mode: billing.mode });
      else track('purchase_failed', { line: p.line, status: r.status, mode: billing.mode });
      return r;
    },
    [access, appName, billing, snapshot, app],
  );

  const restore = useCallback(async () => {
    const r = await billing.restorePurchases();
    if (r.snapshot) setSnapshot(r.snapshot);
    if (r.status === 'success') track('purchase_restored', { mode: billing.mode });
    return r;
  }, [billing]);

  const manageSubscriptions = useCallback(async () => {
    const url = snapshot.managementUrl ?? (Platform.OS === 'android' ? STORE_MANAGE.android : STORE_MANAGE.ios);
    await Linking.openURL(url).catch(() => undefined);
  }, [snapshot.managementUrl]);

  const identify = useCallback(async (id: string) => setSnapshot(await billing.logIn(id)), [billing]);
  const signOut = useCallback(async () => setSnapshot(await billing.logOut()), [billing]);

  const value = useMemo<PremiumValue>(
    () => ({
      mode: billing.mode,
      ready,
      access,
      snapshot,
      isPremium: access.premium,
      can: (tier) => canUse(access, tier),
      products,
      loadProducts,
      purchase,
      restore,
      refresh,
      manageSubscriptions,
      identify,
      signOut,
      pending,
      test: billing.mode === 'test' ? (test ?? null) : null,
    }),
    [billing.mode, ready, access, snapshot, products, loadProducts, purchase, restore, refresh, manageSubscriptions, identify, signOut, pending, test],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePremium(): PremiumValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePremium must be used inside <PremiumProvider>');
  return v;
}

/** For kit code that may run outside the provider (the theme). */
export function usePremiumOptional(): PremiumValue | null {
  return useContext(Ctx);
}

/** True if this person can use a feature of the given tier. */
export function useCan(tier: Tier): boolean {
  return usePremium().can(tier);
}

export { EMPTY_SNAPSHOT };
export type { Access, ProductLine, Tier };
