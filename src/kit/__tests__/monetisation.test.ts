// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { Billing, classifyError, testClient, type BillingClient, type Product } from '../billing';
import { canUse, checkPurchase, EMPTY_SNAPSHOT, resolveAccess, type EntitlementRecord, type Snapshot } from '../entitlements';
import { annualSavingPercent, ENT, entitlementsForLine, fallbackPrice, monthlyEquivalent, OFFERING, PRICES, storeProductId } from '../plans';
import { effectiveTheme, freeThemes, THEMES, themeIsFree, currentThemeId } from '../themes';

jest.mock('../storage', () => {
  const m = new Map<string, string>();
  return { kv: { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => m.set(k, v), remove: (k: string) => m.delete(k) } };
});

const NOW = new Date('2026-11-23T12:00:00Z');
const future = '2026-12-23T12:00:00Z';
const past = '2026-11-01T12:00:00Z';

function ent(id: string, over: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return { id, isActive: true, willRenew: true, expiresAt: future, billingIssueAt: null, unsubscribeAt: null, productId: `p.${id}`, store: 'APP_STORE', isSandbox: true, verification: 'verified', ...over };
}

function snap(...ents: EntitlementRecord[]): Snapshot {
  return { ...EMPTY_SNAPSHOT, source: 'network', entitlements: Object.fromEntries(ents.map((e) => [e.id, e])) };
}

describe('pricing config', () => {
  test('prices match the agreed tiers', () => {
    expect(fallbackPrice('app_premium', 'monthly')).toBe('£3.49');
    expect(fallbackPrice('app_premium', 'annual')).toBe('£34.99');
    expect(fallbackPrice('all_access', 'monthly')).toBe('£7.99');
    expect(fallbackPrice('all_access', 'annual')).toBe('£79.99');
    expect(fallbackPrice('arcade', 'lifetime')).toBe('£14.99');
    expect(fallbackPrice('arcade', 'monthly')).toBeNull();
  });
  test('annual maths is honest', () => {
    expect(monthlyEquivalent(PRICES.app_premium.annual!)).toBe('£2.91');
    expect(annualSavingPercent(349, 3499)).toBe(16);
    expect(annualSavingPercent(799, 7999)).toBe(16);
  });
  test('naming conventions', () => {
    expect(ENT.appPremium('shiftledger')).toBe('shiftledger_premium');
    expect(OFFERING.appPremium('loopday')).toBe('loopday_premium');
    expect(storeProductId('stackup', 'all_access', 'annual')).toBe('kc.stackup.allaccess.annual');
    expect(entitlementsForLine('stackup', 'all_access')).toEqual(['kc_all_access', 'kc_arcade_subscription']);
    expect(entitlementsForLine('stackup', 'arcade')).toEqual(['kc_arcade_permanent']);
  });
});

describe('entitlement resolver', () => {
  test('free by default', () => {
    const a = resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW);
    expect(a.premium).toBe(false);
    expect(a.arcade).toBe(false);
    expect(canUse(a, 'free')).toBe(true);
    expect(canUse(a, 'premium')).toBe(false);
  });
  test('app Premium unlocks its own app only', () => {
    const s = snap(ent('stackup_premium'));
    expect(resolveAccess(s, 'stackup', NOW).premium).toBe(true);
    expect(resolveAccess(s, 'stackup', NOW).premiumSource).toBe('app_premium');
    expect(resolveAccess(s, 'loopday', NOW).premium).toBe(false);
    expect(resolveAccess(s, 'stackup', NOW).arcade).toBe(false);
  });
  test('All Access unlocks every app, including ones added later, and the subscription Arcade', () => {
    const s = snap(ent('kc_all_access'), ent('kc_arcade_subscription'));
    for (const app of ['stackup', 'afterhours', 'some_future_app']) {
      const a = resolveAccess(s, app, NOW);
      expect(a.premium).toBe(true);
      expect(a.premiumSource).toBe('all_access');
    }
    const a = resolveAccess(s, 'stackup', NOW);
    expect(canUse(a, 'arcade')).toBe(true);
    expect(canUse(a, 'arcade_subscription')).toBe(true);
    expect(canUse(a, 'all_access')).toBe(true);
    expect(a.arcadePermanent).toBe(false);
  });
  test('All Access alone still grants subscription Arcade even if the dashboard forgot the second entitlement', () => {
    expect(resolveAccess(snap(ent('kc_all_access')), 'stackup', NOW).arcadeSubscription).toBe(true);
  });
  test('All Access supersedes app Premium without hiding the underlying record', () => {
    const a = resolveAccess(snap(ent('kc_all_access'), ent('stackup_premium')), 'stackup', NOW);
    expect(a.premiumSource).toBe('all_access');
    expect(a.appPremium).toBe(true);
  });
  test('permanent Arcade survives All Access expiring', () => {
    const s = snap(ent('kc_all_access', { expiresAt: past, isActive: false }), ent('kc_arcade_permanent', { expiresAt: null, willRenew: false }));
    const a = resolveAccess(s, 'stackup', NOW);
    expect(a.allAccess).toBe(false);
    expect(a.premium).toBe(false);
    expect(a.arcadePermanent).toBe(true);
    expect(canUse(a, 'arcade')).toBe(true);
    expect(canUse(a, 'arcade_subscription')).toBe(false);
    expect(a.expired).toEqual(['kc_all_access']);
  });
  test('Arcade permanent never unlocks app Premium', () => {
    const a = resolveAccess(snap(ent('kc_arcade_permanent', { expiresAt: null })), 'thirsty', NOW);
    expect(a.premium).toBe(false);
    expect(a.arcade).toBe(true);
  });
  test('a stale cached "active" past its expiry date is not trusted', () => {
    expect(resolveAccess(snap(ent('stackup_premium', { isActive: true, expiresAt: past })), 'stackup', NOW).premium).toBe(false);
  });
  test('failed signature verification is not trusted', () => {
    expect(resolveAccess(snap(ent('stackup_premium', { verification: 'failed' })), 'stackup', NOW).premium).toBe(false);
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
});

describe('purchase guards', () => {
  const none = resolveAccess(EMPTY_SNAPSHOT, 'stackup', NOW);
  const all = resolveAccess(snap(ent('kc_all_access')), 'stackup', NOW);
  const own = resolveAccess(snap(ent('stackup_premium')), 'stackup', NOW);
  const arcade = resolveAccess(snap(ent('kc_arcade_permanent', { expiresAt: null })), 'stackup', NOW);
  test('no double charge: app Premium is blocked under All Access', () => {
    expect(checkPurchase(all, 'app_premium', 'StackUp')).toMatchObject({ ok: false, reason: 'included' });
  });
  test('owned things cannot be bought twice', () => {
    expect(checkPurchase(own, 'app_premium', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
    expect(checkPurchase(all, 'all_access', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
    expect(checkPurchase(arcade, 'arcade', 'StackUp')).toMatchObject({ ok: false, reason: 'owned' });
  });
  test('upgrading from app Premium to All Access is allowed and explained', () => {
    const r = checkPurchase(own, 'all_access', 'StackUp');
    expect(r.ok).toBe(true);
    expect(r.ok && r.note).toMatch(/credits/);
  });
  test('Arcade can be bought to keep while All Access covers it', () => {
    const r = checkPurchase(all, 'arcade', 'StackUp');
    expect(r.ok).toBe(true);
    expect(r.ok && r.note).toMatch(/forever/);
  });
  test('free users can buy anything', () => {
    for (const l of ['app_premium', 'all_access', 'arcade'] as const) expect(checkPurchase(none, l, 'StackUp').ok).toBe(true);
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
  const make = () => {
    const client = testClient('stackup', true, () => clock.t);
    client.controls.reset();
    return { client, billing: new Billing(client) };
  };
  const pick = async (b: Billing, line: Product['line'], period: Product['period']) => (await b.getProducts('stackup')).find((p) => p.line === line && p.period === period)!;

  test('products come from offerings with the configured prices', async () => {
    const { billing } = make();
    const ps = await billing.getProducts('stackup');
    expect(ps.map((p) => `${p.offeringId}/${p.packageId}/${p.priceString}`)).toEqual([
      'stackup_premium/$rc_monthly/£3.49',
      'stackup_premium/$rc_annual/£34.99',
      'kc_all_access/$rc_monthly/£7.99',
      'kc_all_access/$rc_annual/£79.99',
      'kc_arcade/$rc_lifetime/£14.99',
    ]);
  });
  test('buy, expire, keep the Arcade', async () => {
    const { billing } = make();
    await billing.purchase(await pick(billing, 'arcade', 'lifetime'));
    const r = await billing.purchase(await pick(billing, 'all_access', 'monthly'));
    expect(r.status).toBe('success');
    expect(resolveAccess(r.snapshot!, 'stackup').premium).toBe(true);
    clock.t += 40 * 86_400_000; // past the monthly renewal date, never renewed
    const later = await billing.getCustomerInfo();
    const a = resolveAccess(later, 'stackup', new Date(clock.t));
    expect(a.premium).toBe(false);
    expect(a.arcadePermanent).toBe(true);
    clock.t = NOW.getTime();
  });
  test('upgrading to All Access replaces the app Premium instead of billing both', async () => {
    const { billing } = make();
    await billing.purchase(await pick(billing, 'app_premium', 'monthly'));
    const r = await billing.purchase(await pick(billing, 'all_access', 'annual'));
    const a = resolveAccess(r.snapshot!, 'stackup', new Date(clock.t));
    expect(a.allAccess).toBe(true);
    expect(a.appPremium).toBe(false);
    expect(a.overlapping).toEqual([]);
  });
  test('double taps are processed once', async () => {
    const { billing } = make();
    const p = await pick(billing, 'app_premium', 'monthly');
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
    await billing.purchase(await pick(billing, 'app_premium', 'annual'));
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
    expect((await billing.getProducts('stackup')).length).toBe(0);
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
