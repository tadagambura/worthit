// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { claimsLeft, gemsStore, GEMS, reviveOptions } from '../arcade/gems';
import { walletStore } from '../arcade/wallet';

jest.mock('../storage', () => {
  const m = new Map<string, string>();
  return { kv: { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => m.set(k, v), remove: (k: string) => m.delete(k), keys: () => [...m.keys()] } };
});

describe('gems', () => {
  test('welcome gift is given once', () => {
    const g = gemsStore('g1').getState;
    expect(g().welcome()).toBe(GEMS.welcome);
    expect(g().welcome()).toBe(0);
    expect(g().gems).toBe(GEMS.welcome);
  });
  test('rewarded claims pay a fixed amount, up to the daily limit', () => {
    const g = gemsStore('g2').getState;
    const paid = Array.from({ length: GEMS.rewardsPerDay + 2 }, () => g().claim());
    expect(paid.filter((n) => n === GEMS.perReward)).toHaveLength(GEMS.rewardsPerDay);
    expect(paid.slice(-2)).toEqual([0, 0]);
    expect(g().gems).toBe(GEMS.perReward * GEMS.rewardsPerDay);
    expect(claimsLeft(g())).toBe(0);
    expect(claimsLeft({ day: '2000-01-01', claimsToday: 5 })).toBe(GEMS.rewardsPerDay);
  });
  test('spending never goes negative and rejects odd amounts', () => {
    const g = gemsStore('g3').getState;
    g().welcome();
    expect(g().spend(GEMS.welcome + 1)).toBe(false);
    expect(g().spend(-3)).toBe(false);
    expect(g().spend(2.5)).toBe(false);
    expect(g().spend(4)).toBe(true);
    expect(g().gems).toBe(GEMS.welcome - 4);
  });
  test('gems swap into the app currency at the fixed rate', () => {
    const g = gemsStore('g4').getState;
    g().welcome();
    expect(g().exchange(3)).toBe(true);
    expect(walletStore('g4').getState().balance).toBe(3 * GEMS.exchangeRate);
    expect(g().gems).toBe(GEMS.welcome - 3);
    expect(g().exchange(999)).toBe(false);
    expect(walletStore('g4').getState().balance).toBe(3 * GEMS.exchangeRate);
  });
});

describe('revives', () => {
  test('one per round, however it is paid for', () => {
    expect(reviveOptions({ gems: 100, premium: false, adReady: true, revivesUsed: 1 })).toEqual({ free: false, gems: false, ad: false });
  });
  test('subscribers revive free, with no ads', () => {
    expect(reviveOptions({ gems: 0, premium: true, adReady: true, revivesUsed: 0 })).toEqual({ free: true, gems: false, ad: false });
  });
  test('everyone else can pay gems if they have enough, or watch an ad if one is ready', () => {
    expect(reviveOptions({ gems: GEMS.reviveCost, premium: false, adReady: false, revivesUsed: 0 })).toEqual({ free: false, gems: true, ad: false });
    expect(reviveOptions({ gems: 0, premium: false, adReady: true, revivesUsed: 0 })).toEqual({ free: false, gems: false, ad: true });
    expect(reviveOptions({ gems: 0, premium: false, adReady: false, revivesUsed: 0 })).toEqual({ free: false, gems: false, ad: false });
  });
});
