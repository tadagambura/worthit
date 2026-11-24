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
import { paidGameIds } from './arcade/registry';
import { allAccessSteps, Billing, type BillingMode, type Product, type PurchaseResult, type TestControls } from './billing';
import { canPlayGame, canUse, checkPurchase, EMPTY_SNAPSHOT, resolveAccess, type Access, type Snapshot, type Tier } from './entitlements';
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
  /** One Arcade game: its own £0.99 purchase, Premium, All Access or the £25 pass. */
  canPlay: (game: { id: string; tier: Tier }) => boolean;
  products: ProductsState;
  loadProducts: () => Promise<void>;
  purchase: (p: Product) => Promise<PurchaseResult>;
  /** KC All Access: the £25 every-game pass (if not owned yet), then the subscription. */
  purchaseAllAccess: (period: 'monthly' | 'annual') => Promise<PurchaseResult>;
  /** Opens KC sign-in, when this build has accounts. Null until KC accounts exist. */
  signIn: (() => void) | null;
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
  onSignIn,
  children,
}: {
  app: string;
  appName: string;
  billing: Billing;
  test?: TestControls | null;
  /** Shows KC account sign-in. Leave out until accounts exist: All Access then says "coming soon". */
  onSignIn?: () => void;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(billing.lastKnown());
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [products, setProducts] = useState<ProductsState>({ status: 'idle', items: [] });
  const productsRef = useRef(products);
  productsRef.current = products;
  // How many games the last product load knew about: the arcade can register after a first load.
  const loadedGames = useRef(-1);

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
    const games = paidGameIds();
    const st = productsRef.current.status;
    if (st === 'loading' || (st === 'ready' && loadedGames.current === games.length)) return;
    setProducts({ status: 'loading', items: [] });
    loadedGames.current = games.length;
    try {
      const items = await billing.getProducts(app, games);
      setProducts({ status: items.length ? 'ready' : 'error', items });
    } catch {
      setProducts({ status: 'error', items: [] });
    }
  }, [billing, app]);

  // Checks against the snapshot it is given, so a two-step purchase checks step two against step one's result.
  const buy = useCallback(
    async (p: Product, snap: Snapshot): Promise<PurchaseResult> => {
      const acc = resolveAccess(snap, app);
      const check = checkPurchase(acc, p.line, appName, p.gameId);
      if (!check.ok) return { status: 'already_owned', message: check.message };
      track('core_action_started', { action: 'purchase', line: p.line, period: p.period, mode: billing.mode });
      const replacing = p.line === 'all_access' && acc.appPremium ? snap.entitlements[ENT.appPremium(app)]?.productId : undefined;
      const r = await billing.purchase(p, { replacing });
      if (r.snapshot) setSnapshot(r.snapshot);
      setPending(r.status === 'pending');
      if (r.status === 'success') track(p.line === 'game' || p.line === 'arcade' ? 'core_action_completed' : 'subscription_started', { action: 'purchase', line: p.line, period: p.period, mode: billing.mode });
      else track('purchase_failed', { line: p.line, status: r.status, mode: billing.mode });
      return r;
    },
    [appName, billing, app],
  );

  const purchase = useCallback((p: Product) => buy(p, snapshot), [buy, snapshot]);

  const purchaseAllAccess = useCallback(
    async (period: 'monthly' | 'annual'): Promise<PurchaseResult> => {
      const check = checkPurchase(access, 'all_access', appName);
      if (!check.ok) return { status: 'already_owned', message: check.message };
      const steps = allAccessSteps(access, productsRef.current.items, period);
      if (!steps.length) return { status: 'error', message: "Couldn't load All Access from the store. Check your connection and try again. You haven't been charged." };
      let snap = snapshot;
      let last: PurchaseResult = { status: 'error', message: '' };
      for (const [i, step] of steps.entries()) {
        last = await buy(step, snap);
        if (last.status !== 'success') {
          // Stopped after the pass: they keep every game, and the button now offers just the subscription.
          if (i > 0) return { ...last, message: `Every game is now yours, forever. The All Access subscription didn't start: ${last.message}` };
          return last;
        }
        snap = last.snapshot ?? snap;
      }
      return { ...last, message: 'KC All Access is on: Premium in every app, and every game is yours. Thank you!' };
    },
    [access, appName, buy, snapshot],
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
      canPlay: (game) => canPlayGame(access, game),
      products,
      loadProducts,
      purchase,
      purchaseAllAccess,
      signIn: onSignIn ?? null,
      restore,
      refresh,
      manageSubscriptions,
      identify,
      signOut,
      pending,
      test: billing.mode === 'test' ? (test ?? null) : null,
    }),
    [billing.mode, ready, access, snapshot, products, loadProducts, purchase, purchaseAllAccess, onSignIn, restore, refresh, manageSubscriptions, identify, signOut, pending, test],
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
