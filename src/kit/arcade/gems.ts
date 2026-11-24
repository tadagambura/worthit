// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Gems 💎: the one currency people see across every KC arcade.
// Rules (owner, 24 Nov 2026):
//   - Ads only ever pay gems. Never app currency or items directly.
//   - The single exception is a revive in a game, which an ad can grant directly.
//   - Gems are what's spent: swap them into the app's own currency (coins, ice cubes…) or
//     spend them on a revive, so people can always see exactly what they have.
// Fairness: rewards are fixed and shown up front, revives are one per round and never
// change the difficulty, and subscribers get the same gems without ads ("Claim").
// Until KC accounts exist, gems live on the device, per app.
import { todayKey } from '../dates';
import { persisted } from '../store';
import { walletStore } from './wallet';

export const GEMS = {
  /** A one-off welcome gift, so revives are discoverable from the first game. */
  welcome: 10,
  /** Gems for one rewarded ad (or one subscriber claim). Shown on the button before watching. */
  perReward: 5,
  /** Rewarded gem claims a day, ads or subscriber claims. */
  rewardsPerDay: 5,
  /** Cost of a revive in gems. */
  reviveCost: 5,
  /** Revives allowed per round, however they're paid for. */
  revivesPerRound: 1,
  /** 1 gem swaps into this much of the app's own currency. */
  exchangeRate: 10,
} as const;

export type GemState = {
  gems: number;
  lifetime: number;
  welcomed: boolean;
  day: string;
  claimsToday: number;
  /** Adds the welcome gift once. Returns how many gems were added. */
  welcome: () => number;
  /** A rewarded claim (after an ad finished, or a subscriber's tap). Returns gems added; 0 once today's limit is reached. */
  claim: () => number;
  /** Spend gems. False, and nothing changes, if there aren't enough. */
  spend: (n: number) => boolean;
  /** Swap gems into the app's own arcade currency. False if there aren't enough gems. */
  exchange: (gems: number) => boolean;
};

export function claimsLeft(s: Pick<GemState, 'day' | 'claimsToday'>, today: string = todayKey()): number {
  return Math.max(0, GEMS.rewardsPerDay - (s.day === today ? s.claimsToday : 0));
}

export type ReviveOptions = {
  /** Subscribers revive free (they never see ads). */
  free: boolean;
  /** Pay with gems. */
  gems: boolean;
  /** Watch a rewarded ad to revive (the only thing an ad gives directly). */
  ad: boolean;
};

/** Which revive buttons to show. Nothing at all once this round's revive is used. */
export function reviveOptions(o: { gems: number; premium: boolean; adReady: boolean; revivesUsed: number }): ReviveOptions {
  if (o.revivesUsed >= GEMS.revivesPerRound) return { free: false, gems: false, ad: false };
  if (o.premium) return { free: true, gems: false, ad: false };
  return { free: false, gems: o.gems >= GEMS.reviveCost, ad: o.adReady };
}

const stores = new Map<string, ReturnType<typeof make>>();

function make(app: string) {
  return persisted<GemState>(`${app}.arcade.gems`, 1, (set, get) => ({
    gems: 0,
    lifetime: 0,
    welcomed: false,
    day: todayKey(),
    claimsToday: 0,
    welcome: () => {
      if (get().welcomed) return 0;
      set((s) => ({ welcomed: true, gems: s.gems + GEMS.welcome, lifetime: s.lifetime + GEMS.welcome }));
      return GEMS.welcome;
    },
    claim: () => {
      const s = get();
      const today = todayKey();
      if (claimsLeft(s, today) <= 0) return 0;
      set({ gems: s.gems + GEMS.perReward, lifetime: s.lifetime + GEMS.perReward, day: today, claimsToday: (s.day === today ? s.claimsToday : 0) + 1 });
      return GEMS.perReward;
    },
    spend: (n) => {
      const s = get();
      if (n <= 0 || !Number.isInteger(n) || s.gems < n) return false;
      set({ gems: s.gems - n });
      return true;
    },
    exchange: (n) => {
      if (!get().spend(n)) return false;
      walletStore(app).setState((w) => ({ balance: w.balance + n * GEMS.exchangeRate }));
      return true;
    },
  }));
}

export function gemsStore(app: string) {
  let s = stores.get(app);
  if (!s) {
    s = make(app);
    stores.set(app, s);
  }
  return s;
}
