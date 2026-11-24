// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { allAccessSteps, Billing, classifyError, testClient, type BillingClient, type Product } from '../billing';
import { canPlayGame, canUse, checkPurchase, crossAppOffer, EMPTY_SNAPSHOT, lineForTier, resolveAccess, type EntitlementRecord, type Snapshot } from '../entitlements';
import {
  andList,
  annualSavingPercent,
  appName,
  ENT,
  entitlementsForLine,
  fallbackPrice,
  gameKey,
  gameOfPackage,
  gamePackage,
  gamesValue,
  monthlyEquivalent,
  OFFERING,
  PRICES,
  storeCatalog,
  storeProductId,
} from '../plans';
import { effectiveTheme, freeThemes, THEMES, themeIsFree, currentThemeId } from '../themes';

jest.mock('../storage', () => {
  const m = new Map<string, string>();
  return { kv: { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => m.set(k, v), remove: (k: string) => m.delete(k) } };
});

const NOW = new Date('2026-11-23T12:00:00Z');
const future = '2026-12-23T12:00:00Z';
const past = '2026-11-01T12:00:00Z';
const DAY = 86_400_000;

function ent(id: string, over: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return { id, isActive: true, willRenew: true, expiresAt: future, billingIssueAt: null, unsubscribeAt: null, productId: `p.${id}`, store: 'APP_STORE', isSandbox: true, verification: 'verified', ...over };
}
const forever = (id: string) => ent(id, { expiresAt: null, willRenew: false });

function snap(...ents: EntitlementRecord[]): Snapshot {
  return { ...EMPTY_SNAPSHOT, source: 'network', entitlements: Object.fromEntries(ents.map((e) => [e.id, e])) };
}
const signedIn = (s: Snapshot): Snapshot => ({ ...s, isAnonymous: false, appUserId: 'kc_123' });

const paidGame = { id: 'money-word', tier: 'arcade' as const };
const otherPaidGame = { id: 'budget-blitz', tier: 'arcade' as const };

describe('pricing config', () => {
  test('prices match the owner structure (24 Nov 2026)', () => {
    expect(fallbackPrice('game', 'lifetime')).toBe('£0.99');
    expect(fallbackPrice('app_premium', 'monthly')).toBe('£3.49');
    expect(fallbackPrice('app_premium', 'annual')).toBe('£34.99');
    expect(fallbackPrice('arcade', 'lifetime')).toBe('£25.00');
    expect(fallbackPrice('all_access', 'monthly')).toBe('£7.99');
    expect(fallbackPrice('all_access', 'annual')).toBe('£79.99');
    expect(fallbackPrice('arcade', 'monthly')).toBeNull();
    expect(fallbackPrice('game', 'monthly')).toBeNull();
  });
  test('annual maths is honest', () => {
    expect(monthlyEquivalent(PRICES.app_premium.annual!)).toBe('£2.91');
    expect(annualSavingPercent(349, 3499)).toBe(16);
    expect(annualSavingPercent(799, 7999)).toBe(16);
  });
  test('games one by one versus Premium: the owner example and real app sizes', () => {
    expect(gamesValue(8).total).toBe('£7.92');
    expect(gamesValue(5).total).toBe('£4.95');
    expect(gamesValue(0)).toEqual({ count: 0, totalPence: 0, total: '£0.00' });
    expect(gamesValue(-2).count).toBe(0);
    expect(gamesValue(3, 129).total).toBe('£3.87'); // a store price that isn't £0.99
  });
  test('naming conventions', () => {
    expect(ENT.appPremium('shiftledger')).toBe('shiftledger_premium');
    expect(ENT.game('stackup', 'money-word')).toBe('stackup_game_money_word');
    expect(gameKey('Deep-Talk Roulette')).toBe('deep_talk_roulette');
    expect(OFFERING.appPremium('loopday')).toBe('loopday_premium');
    expect(OFFERING.games('loopday')).toBe('loopday_games');
    expect(gamePackage('money-word')).toBe('game_money_word');
    expect(gameOfPackage('game_money_word')).toBe('money_word');
    expect(gameOfPackage('$rc_monthly')).toBeNull();
    expect(storeProductId('stackup', 'all_access', 'annual')).toBe('kc.stackup.allaccess.annual');
    expect(storeProductId('stackup', 'arcade', 'lifetime')).toBe('kc.stackup.arcade.lifetime');
    expect(storeProductId('stackup', 'game', 'lifetime', 'money-word')).toBe('kc.stackup.game.money_word');
    expect(() => storeProductId('stackup', 'game', 'lifetime')).toThrow();
  });
  test('store product IDs only use characters both stores accept', () => {
    for (const p of storeCatalog('afterhours', ['deep-talk-roulette', 'truth-or-dare', 'x--y'])) expect(p.productId).toMatch(/^[a-z0-9][a-z0-9._]*$/);
  });
  test('each product unlocks exactly one entitlement; All Access no longer carries an Arcade entitlement', () => {
    expect(entitlementsForLine('stackup', 'app_premium')).toEqual(['stackup_premium']);
    expect(entitlementsForLine('stackup', 'all_access')).toEqual(['kc_all_access']);
    expect(entitlementsForLine('stackup', 'arcade')).toEqual(['kc_arcade_permanent']);
    expect(entitlementsForLine('stackup', 'game', 'money-word')).toEqual(['stackup_game_money_word']);
  });
  test('the store catalog lists every product once, with its price and offering', () => {
    const cat = storeCatalog('stackup', ['money-word', 'budget-blitz']);
    expect(cat.map((p) => `${p.productId} ${p.pence} ${p.offering}/${p.package}`)).toEqual([
      'kc.stackup.premium.monthly 349 stackup_premium/$rc_monthly',
      'kc.stackup.premium.annual 3499 stackup_premium/$rc_annual',
      'kc.stackup.allaccess.monthly 799 kc_all_access/$rc_monthly',
      'kc.stackup.allaccess.annual 7999 kc_all_access/$rc_annual',
      'kc.stackup.arcade.lifetime 2500 kc_arcade/$rc_lifetime',
      'kc.stackup.game.money_word 99 stackup_games/game_money_word',
      'kc.stackup.game.budget_blitz 99 stackup_games/game_budget_blitz',
    ]);
    expect(new Set(cat.map((p) => p.productId)).size).toBe(cat.length);
  });
  test('display names for cross-app copy', () => {
    expect(appName('worthit')).toBe('WorthIt?');
    expect(appName('grannysvault')).toBe("Granny's Vault");
    expect(appName('newthing')).toBe('Newthing');
    expect(andList(['StackUp'])).toBe('StackUp');
    expect(andList(['StackUp', 'LoopDay'])).toBe('StackUp and LoopDay');
    expect(andList(['StackUp', 'LoopDay', 'Reset'])).toBe('StackUp, LoopDay and Reset');
  });
});

describe('entitlement resolver', () => {
  test('free by default', () => {
    const a = resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW);
    expect(a.premium).toBe(false);
    expect(a.arcade).toBe(false);
    expect(a.games).toEqual([]);
    expect(a.signedIn).toBe(false);
    expect(canUse(a, 'free')).toBe(true);
    expect(canUse(a, 'premium')).toBe(false);
    expect(canPlayGame(a, { id: 'coin-stack', tier: 'free' })).toBe(true);
    expect(canPlayGame(a, paidGame)).toBe(false);
  });
  test('a single £0.99 game unlocks that game only, in its own app only, forever', () => {
    const s = snap(forever('stackup_game_money_word'));
    const a = resolveAccess(s, 'stackup', NOW);
    expect(a.games).toEqual(['money_word']);
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(canPlayGame(a, otherPaidGame)).toBe(false);
    expect(a.premium).toBe(false);
    expect(a.arcade).toBe(false);
    expect(resolveAccess(s, 'loopday', NOW).games).toEqual([]);
    expect(resolveAccess(s, 'stackup', new Date('2030-01-01')).games).toEqual(['money_word']);
  });
  test('app Premium unlocks its own app and every game in it, nothing elsewhere', () => {
    const s = snap(ent('stackup_premium'));
    const a = resolveAccess(s, 'stackup', NOW);
    expect(a.premium).toBe(true);
    expect(a.premiumSource).toBe('app_premium');
    expect(a.arcade).toBe(true);
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(canPlayGame(a, otherPaidGame)).toBe(true);
    const elsewhere = resolveAccess(s, 'loopday', NOW);
    expect(elsewhere.premium).toBe(false);
    expect(canPlayGame(elsewhere, paidGame)).toBe(false);
    expect(elsewhere.otherPremiums).toEqual(['stackup']);
  });
  test('the All Access subscription unlocks Premium and every game in every app, including ones added later', () => {
    const s = snap(ent('kc_all_access'));
    for (const app of ['stackup', 'afterhours', 'some_future_app']) {
      const a = resolveAccess(s, app, NOW);
      expect(a.premium).toBe(true);
      expect(a.premiumSource).toBe('all_access');
      expect(canPlayGame(a, paidGame)).toBe(true);
      expect(canUse(a, 'all_access')).toBe(true);
    }
  });
  test('the £25 part keeps every game in every app after the subscription ends, but not Premium', () => {
    const s = snap(ent('kc_all_access', { expiresAt: past, isActive: false }), forever('kc_arcade_permanent'));
    const a = resolveAccess(s, 'thirsty', NOW);
    expect(a.allAccess).toBe(false);
    expect(a.premium).toBe(false);
    expect(a.arcadePermanent).toBe(true);
    expect(a.arcade).toBe(true);
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(canUse(a, 'premium')).toBe(false);
    expect(a.expired).toEqual(['kc_all_access']);
  });
  test('games bought one by one survive Premium ending', () => {
    const s = snap(ent('stackup_premium', { expiresAt: past, isActive: false }), forever('stackup_game_money_word'));
    const a = resolveAccess(s, 'stackup', NOW);
    expect(a.premium).toBe(false);
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(canPlayGame(a, otherPaidGame)).toBe(false);
  });
  test('All Access supersedes app Premium without hiding the underlying record', () => {
    const a = resolveAccess(snap(ent('kc_all_access'), ent('stackup_premium')), 'stackup', NOW);
    expect(a.premiumSource).toBe('all_access');
    expect(a.appPremium).toBe(true);
  });
  test('the retired KC Arcade subscription entitlement grants nothing on its own', () => {
    const a = resolveAccess(snap(ent('kc_arcade_subscription')), 'stackup', NOW);
    expect(a.arcade).toBe(false);
    expect(canPlayGame(a, paidGame)).toBe(false);
  });
  test('signed-in people see their Premium in other KC apps', () => {
    const a = resolveAccess(signedIn(snap(ent('stackup_premium'), ent('loopday_premium'), ent('thirsty_premium', { expiresAt: past }))), 'reset', NOW);
    expect(a.signedIn).toBe(true);
    expect(a.otherPremiums).toEqual(['stackup', 'loopday']);
  });
  test('a stale cached "active" past its expiry date is not trusted', () => {
    expect(resolveAccess(snap(ent('stackup_premium', { isActive: true, expiresAt: past })), 'stackup', NOW).premium).toBe(false);
  });
  test('failed signature verification is not trusted, for games too', () => {
    expect(resolveAccess(snap(ent('stackup_premium', { verification: 'failed' })), 'stackup', NOW).premium).toBe(false);
    expect(resolveAccess(snap(forever('stackup_game_money_word'), ent('x', {})), 'stackup', NOW).games).toEqual(['money_word']);
    expect(resolveAccess(snap({ ...forever('stackup_game_money_word'), verification: 'failed' }), 'stackup', NOW).games).toEqual([]);
  });
  test('grace period keeps access and flags the billing issue', () => {
    const a = resolveAccess(snap(ent('stackup_premium', { billingIssueAt: '2026-11-20T00:00:00Z' })), 'stackup', NOW);
    expect(a.premium).toBe(true);
    expect(a.billingIssue).toEqual({ entitlement: 'stackup_premium', since: '2026-11-20T00:00:00Z' });
  });
  test('flags individual Premiums still renewing under All Access (paying twice)', () => {
    const a = resolveAccess(snap(ent('kc_all_access'), ent('stackup_premium'), ent('loopday_premium', { willRenew: false })), 'thirsty', NOW);
    expect(a.overlapping).toEqual(['stackup_premium']);
  });
  test('gates for paid features open the Premium tab (the cheapest bundle that includes them)', () => {
    expect(lineForTier('arcade')).toBe('app_premium');
    expect(lineForTier('premium')).toBe('app_premium');
    expect(lineForTier('all_access')).toBe('all_access');
  });
});

describe('purchase guards (no double charging)', () => {
  const none = resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW);
  const noneIn = resolveAccess(signedIn(EMPTY_SNAPSHOT), 'stackup', NOW);
  const all = resolveAccess(signedIn(snap(ent('kc_all_access'))), 'stackup', NOW);
  const own = resolveAccess(signedIn(snap(ent('stackup_premium'))), 'stackup', NOW);
  const pass = resolveAccess(signedIn(snap(forever('kc_arcade_permanent'))), 'stackup', NOW);
  const oneGame = resolveAccess(snap(forever('stackup_game_money_word')), 'stackup', NOW);
  test('app Premium is blocked under All Access, and when already owned', () => {
    expect(checkPurchase(all, 'app_premium', 'StackUp')).toMatchObject({ ok: false, reason: 'included' });
    expect(checkPurchase(own, 'app_premium', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
  });
  test('a game can not be bought twice, or while Premium, All Access or the £25 pass includes it', () => {
    expect(checkPurchase(oneGame, 'game', 'StackUp', 'money-word')).toMatchObject({ ok: false, reason: 'owned' });
    expect(checkPurchase(oneGame, 'game', 'StackUp', 'budget-blitz').ok).toBe(true);
    expect(checkPurchase(own, 'game', 'StackUp', 'money-word')).toMatchObject({ ok: false, reason: 'included', message: expect.stringContaining('StackUp Premium') });
    expect(checkPurchase(all, 'game', 'StackUp', 'money-word')).toMatchObject({ ok: false, reason: 'included', message: expect.stringContaining('All Access') });
    expect(checkPurchase(pass, 'game', 'StackUp', 'money-word')).toMatchObject({ ok: false, reason: 'included' });
  });
  test('buying Premium after single games says the games stay', () => {
    const r = checkPurchase(oneGame, 'app_premium', 'StackUp');
    expect(r.ok && r.note).toMatch(/game you bought stays yours/);
  });
  test('All Access and the £25 part need a KC account, so nobody pays twice across apps', () => {
    expect(checkPurchase(none, 'all_access', 'StackUp')).toMatchObject({ ok: false, reason: 'sign_in' });
    expect(checkPurchase(none, 'arcade', 'StackUp')).toMatchObject({ ok: false, reason: 'sign_in' });
    expect(checkPurchase(noneIn, 'all_access', 'StackUp').ok).toBe(true);
  });
  test('owned All Access parts can not be bought twice', () => {
    expect(checkPurchase(all, 'all_access', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
    expect(checkPurchase(pass, 'arcade', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
    const r = checkPurchase(pass, 'all_access', 'StackUp');
    expect(r.ok && r.note).toMatch(/just the subscription/);
  });
  test('upgrading from app Premium to All Access is allowed and explained', () => {
    const r = checkPurchase(own, 'all_access', 'StackUp');
    expect(r.ok && r.note).toMatch(/credits/);
  });
  test('Premium in other apps: All Access says which ones to cancel', () => {
    const a = resolveAccess(signedIn(snap(ent('loopday_premium'), ent('worthit_premium'))), 'stackup', NOW);
    const r = checkPurchase(a, 'all_access', 'StackUp');
    expect(r.ok && r.note).toMatch(/Cancel your WorthIt\? and LoopDay Premium/);
  });
  test('free users can buy Premium and single games without an account', () => {
    expect(checkPurchase(none, 'app_premium', 'StackUp').ok).toBe(true);
    expect(checkPurchase(none, 'game', 'StackUp', 'money-word').ok).toBe(true);
  });
});

describe('KC All Access purchase plan', () => {
  const p = (line: Product['line'], period: Product['period']): Product => ({ line, period, priceString: '', priceMinor: null, currency: 'GBP', title: '', offeringId: '', packageId: '' });
  const items = [p('app_premium', 'monthly'), p('all_access', 'monthly'), p('all_access', 'annual'), p('arcade', 'lifetime')];
  test('£25 first, then the subscription', () => {
    const steps = allAccessSteps(resolveAccess(signedIn(EMPTY_SNAPSHOT), 'stackup', NOW), items, 'annual');
    expect(steps.map((s) => `${s.line}/${s.period}`)).toEqual(['arcade/lifetime', 'all_access/annual']);
  });
  test('someone who already owns the £25 part (say, after cancelling) only pays the subscription', () => {
    const steps = allAccessSteps(resolveAccess(snap(forever('kc_arcade_permanent')), 'stackup', NOW), items, 'monthly');
    expect(steps.map((s) => s.line)).toEqual(['all_access']);
  });
  test('nothing to buy when All Access is on, or when the store returned no products', () => {
    expect(allAccessSteps(resolveAccess(snap(ent('kc_all_access')), 'stackup', NOW), items, 'monthly')).toEqual([]);
    expect(allAccessSteps(resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW), [], 'monthly')).toEqual([]);
    expect(allAccessSteps(resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW), [p('all_access', 'monthly')], 'monthly')).toEqual([]);
  });
});

describe('cross-app All Access offer', () => {
  const t = NOW.getTime();
  const elsewhere = resolveAccess(signedIn(snap(ent('stackup_premium'))), 'loopday', NOW);
  test('shown to a signed-in Premium subscriber of another KC app', () => {
    expect(crossAppOffer(elsewhere, null, t)).toBe(true);
  });
  test('at most once every 30 days', () => {
    expect(crossAppOffer(elsewhere, t - 3 * DAY, t)).toBe(false);
    expect(crossAppOffer(elsewhere, t - 31 * DAY, t)).toBe(true);
  });
  test('never without an account, without another Premium, or with All Access already on', () => {
    expect(crossAppOffer(resolveAccess(snap(ent('stackup_premium')), 'loopday', NOW), null, t)).toBe(false);
    expect(crossAppOffer(resolveAccess(signedIn(EMPTY_SNAPSHOT), 'loopday', NOW), null, t)).toBe(false);
    expect(crossAppOffer(resolveAccess(signedIn(snap(ent('kc_all_access'), ent('stackup_premium'))), 'loopday', NOW), null, t)).toBe(false);
  });
});

describe('error classification', () => {
  test.each([
    [{ code: '1', userCancelled: true }, 'cancelled'],
    [{ code: '20' }, 'pending'],
    [{ code: '6' }, 'already_owned'],
    [{ code: '15' }, 'busy'],
    [{ code: '10' }, 'network'],
    [{ code: '35' }, 'network'],
    [{ code: '3' }, 'not_allowed'],
    [{ code: '23' }, 'error'],
    [new Error('boom'), 'error'],
    [undefined, 'error'],
  ])('%o -> %s', (e, status) => {
    expect(classifyError(e).status).toBe(status);
  });
});

describe('billing service with the test store', () => {
  const clock = { t: NOW.getTime() };
  const GAMES = ['money-word', 'budget-blitz'];
  const make = () => {
    const client = testClient('stackup', true, () => clock.t);
    client.controls.reset();
    return { client, billing: new Billing(client) };
  };
  const pick = async (b: Billing, line: Product['line'], period: Product['period'], gameId?: string) =>
    (await b.getProducts('stackup', GAMES)).find((p) => p.line === line && p.period === period && (!gameId || p.gameId === gameKey(gameId)))!;
  const at = () => new Date(clock.t);
  afterEach(() => {
    clock.t = NOW.getTime();
  });

  test('products come from offerings with the configured prices, one package per paid game', async () => {
    const { billing } = make();
    const ps = await billing.getProducts('stackup', GAMES);
    expect(ps.map((p) => `${p.offeringId}/${p.packageId}/${p.priceString}`)).toEqual([
      'stackup_premium/$rc_monthly/£3.49',
      'stackup_premium/$rc_annual/£34.99',
      'kc_all_access/$rc_monthly/£7.99',
      'kc_all_access/$rc_annual/£79.99',
      'kc_arcade/$rc_lifetime/£25.00',
      'stackup_games/game_money_word/£0.99',
      'stackup_games/game_budget_blitz/£0.99',
    ]);
  });
  test('buying one game unlocks only that game, and it never expires', async () => {
    const { billing } = make();
    const r = await billing.purchase(await pick(billing, 'game', 'lifetime', 'money-word'));
    expect(r.status).toBe('success');
    clock.t += 400 * DAY;
    const a = resolveAccess(await billing.getCustomerInfo(), 'stackup', at());
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(canPlayGame(a, otherPaidGame)).toBe(false);
  });
  test('All Access: the £25 part, then the subscription; after the subscription lapses the games stay', async () => {
    const { client, billing } = make();
    client.controls.signIn();
    await billing.purchase(await pick(billing, 'arcade', 'lifetime'));
    const r = await billing.purchase(await pick(billing, 'all_access', 'monthly'));
    expect(r.status).toBe('success');
    const on = resolveAccess(r.snapshot!, 'stackup', at());
    expect(on.premium && on.arcadePermanent && on.signedIn).toBe(true);
    clock.t += 40 * DAY; // past the monthly renewal date, never renewed
    const a = resolveAccess(await billing.getCustomerInfo(), 'stackup', at());
    expect(a.premium).toBe(false);
    expect(canPlayGame(a, paidGame)).toBe(true);
    expect(allAccessSteps(a, await billing.getProducts('stackup', GAMES), 'monthly').map((p) => p.line)).toEqual(['all_access']);
  });
  test('upgrading to All Access replaces the app Premium instead of billing both', async () => {
    const { billing } = make();
    await billing.purchase(await pick(billing, 'app_premium', 'monthly'));
    const r = await billing.purchase(await pick(billing, 'all_access', 'annual'));
    const a = resolveAccess(r.snapshot!, 'stackup', at());
    expect(a.allAccess).toBe(true);
    expect(a.appPremium).toBe(false);
    expect(a.overlapping).toEqual([]);
  });
  test('signing in and out of a KC account is reflected in the snapshot', async () => {
    const { billing } = make();
    expect((await billing.getCustomerInfo()).isAnonymous).toBe(true);
    expect((await billing.logIn('kc_abc')).isAnonymous).toBe(false);
    expect((await billing.logOut()).isAnonymous).toBe(true);
  });
  test('double taps are processed once', async () => {
    const { billing } = make();
    const p = await pick(billing, 'game', 'lifetime', 'money-word');
    const [a, b] = await Promise.all([billing.purchase(p), billing.purchase(p)]);
    expect([a.status, b.status].sort()).toEqual(['busy', 'success']);
  });
  test('cancelled and pending purchases unlock nothing', async () => {
    const { client, billing } = make();
    const p = await pick(billing, 'app_premium', 'monthly');
    client.controls.failNext('1');
    expect((await billing.purchase(p)).status).toBe('cancelled');
    client.controls.failNext('20');
    expect((await billing.purchase(p)).status).toBe('pending');
    expect(resolveAccess(await billing.getCustomerInfo(), 'stackup').premium).toBe(false);
  });
  test('restore brings purchases back and reports nothing found honestly', async () => {
    const { billing } = make();
    expect((await billing.restorePurchases()).message).toMatch(/No active purchases/);
    await billing.purchase(await pick(billing, 'game', 'lifetime', 'budget-blitz'));
    expect((await billing.restorePurchases()).message).toMatch(/restored/);
  });
  test('an outage keeps the last known state instead of locking people out', async () => {
    let fail = false;
    const base = testClient('stackup', true, () => clock.t);
    base.controls.reset();
    const flaky: BillingClient = { ...base, snapshot: async () => (fail ? Promise.reject(new Error('offline')) : base.snapshot()) };
    const billing = new Billing(flaky);
    await billing.purchase((await billing.getProducts('stackup'))[0]);
    await billing.getCustomerInfo();
    fail = true;
    expect(resolveAccess(await billing.getCustomerInfo(), 'stackup').premium).toBe(true);
  });
  test('release builds without keys never pretend to charge', async () => {
    const billing = new Billing(testClient('stackup', false));
    expect(billing.mode).toBe('unavailable');
    expect((await billing.getProducts('stackup', GAMES)).length).toBe(0);
    expect((await billing.purchase({} as Product)).status).toBe('unavailable');
  });
});

describe('theme tiers', () => {
  test('exactly six themes are free, always including the app default', () => {
    for (const d of THEMES.map((t) => t.id)) {
      const free = freeThemes(d);
      expect(free).toHaveLength(6);
      expect(free[0]).toBe(d);
      expect(new Set(free).size).toBe(6);
    }
    expect(THEMES.filter((t) => themeIsFree(t.id, 'pink'))).toHaveLength(6);
  });
  test('a premium theme falls back to the default without Premium, and returns with it', () => {
    expect(effectiveTheme('gold', 'green', false)).toBe('green');
    expect(effectiveTheme('gold', 'green', true)).toBe('gold');
    expect(effectiveTheme('black', 'green', false)).toBe('black');
    expect(effectiveTheme(undefined, 'pink', false)).toBe('pink');
    expect(effectiveTheme('nonsense', 'pink', true)).toBe('pink');
  });
  test('old theme ids still resolve', () => {
    expect(currentThemeId('sunset')).toBe('orange');
    expect(effectiveTheme('teal', 'turquoise', false)).toBe('turquoise');
  });
  test('the owner-requested colours are all there', () => {
    const ids = THEMES.map((t) => t.id);
    for (const id of ['turquoise', 'green', 'pink', 'purple', 'orange', 'brown', 'black', 'white', 'gold', 'gray', 'navy', 'burgundy']) expect(ids).toContain(id);
  });
});

import { ageOn, clearExpiredLock, decideAge, EMPTY_AGE, recordDob, recordProvider, validDob } from '../age';

describe('age assurance', () => {
  const now = new Date('2026-11-23T12:00:00');
  const policy = { requireProvider: false };
  test('age maths, including the day before an 18th birthday and leap days', () => {
    expect(ageOn({ y: 2008, m: 11, d: 23 }, now)).toBe(18);
    expect(ageOn({ y: 2008, m: 11, d: 24 }, now)).toBe(17);
    expect(ageOn({ y: 2008, m: 2, d: 29 }, new Date('2026-02-28T12:00:00'))).toBe(17);
    expect(ageOn({ y: 2008, m: 2, d: 29 }, new Date('2026-03-01T12:00:00'))).toBe(18);
  });
  test('rejects impossible dates', () => {
    expect(validDob({ y: 2001, m: 2, d: 30 }, now)).toBe(false);
    expect(validDob({ y: 2030, m: 1, d: 1 }, now)).toBe(false);
    expect(validDob({ y: 1850, m: 1, d: 1 }, now)).toBe(false);
    expect(validDob({ y: 2000, m: 2, d: 29 }, now)).toBe(true);
  });
  test('an adult date of birth unlocks; the date itself is not kept', () => {
    const r = recordDob({ y: 1995, m: 6, d: 1 }, now);
    expect(r).toEqual({ status: 'adult', method: 'self_declared', checkedAt: now.toISOString(), lockedUntil: null });
    expect(JSON.stringify(r)).not.toContain('1995');
    expect(decideAge(r, 'unknown', policy, now).allowed).toBe(true);
  });
  test('an under-18 answer locks retries for a day, then can be cleared', () => {
    const r = recordDob({ y: 2010, m: 1, d: 1 }, now);
    expect(decideAge(r, 'unknown', policy, now).reason).toBe('locked');
    const later = new Date(now.getTime() + 25 * 3600_000);
    expect(clearExpiredLock(r, later)).toEqual(EMPTY_AGE);
  });
  test('the store saying "under 18" always wins', () => {
    const r = recordDob({ y: 1990, m: 1, d: 1 }, now);
    expect(decideAge(r, 'minor', policy, now)).toEqual({ allowed: false, reason: 'store_minor' });
    expect(decideAge(EMPTY_AGE, 'adult', policy, now).allowed).toBe(true);
  });
  test('a year-old confirmation is asked again', () => {
    const r = recordDob({ y: 1990, m: 1, d: 1 }, new Date('2025-11-01T12:00:00'));
    expect(decideAge(r, 'unknown', policy, now).reason).toBe('needs_check');
  });
  test('when a provider is required, a typed date of birth is not enough (fail closed)', () => {
    const strict = { requireProvider: true };
    expect(decideAge(recordDob({ y: 1990, m: 1, d: 1 }, now), 'unknown', strict, now).reason).toBe('needs_provider');
    expect(decideAge(recordProvider('adult', now), 'unknown', strict, now).allowed).toBe(true);
    expect(recordProvider('unknown', now)).toEqual(EMPTY_AGE);
  });
});
