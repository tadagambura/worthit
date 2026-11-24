// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The arcade wallet: each app's currency (coins, gems, ice cubes…), best scores and the
// daily challenge. Spending happens in the app (vault decorations, streak shields…) through
// spend(). Nothing here ever decreases because someone didn't play.
import { todayKey } from '../dates';
import { persisted } from '../store';
import { rewardFor } from './engine';

type WalletState = {
  balance: number;
  lifetime: number;
  day: string;
  earnedToday: number;
  dailyDone: string | null;
  best: Record<string, number>;
  plays: Record<string, number>;
  /** Records a finished round and returns what it earned. */
  finish: (gameId: string, score: number, daily: boolean) => { earned: number; best: boolean };
  /** Spend currency in the app. Returns false (and changes nothing) if there isn't enough. */
  spend: (amount: number) => boolean;
  /** Extra currency from an opt-in rewarded ad (double a round, daily bonus). Outside the daily game cap. */
  bonus: (amount: number) => void;
  /** Day the rewarded daily bonus was last claimed. */
  bonusDay: string | null;
  claimDailyBonus: (amount: number) => boolean;
};

/** Most a single rewarded bonus can add. */
export const BONUS_MAX = 60;
/** What the once-a-day rewarded bonus pays. */
export const DAILY_BONUS = 15;

const stores = new Map<string, ReturnType<typeof make>>();

function make(app: string) {
  return persisted<WalletState>(`${app}.arcade.wallet`, 1, (set, get) => ({
    balance: 0,
    lifetime: 0,
    day: todayKey(),
    earnedToday: 0,
    dailyDone: null,
    best: {},
    plays: {},
    finish: (gameId, score, daily) => {
      const s = get();
      const today = todayKey();
      const earnedToday = s.day === today ? s.earnedToday : 0;
      const isDaily = daily && s.dailyDone !== today;
      const earned = rewardFor(score, { daily: isDaily, earnedToday });
      const best = score > 0 && score > (s.best[gameId] ?? 0);
      set({
        balance: s.balance + earned,
        lifetime: s.lifetime + earned,
        day: today,
        earnedToday: earnedToday + earned,
        dailyDone: isDaily ? today : s.dailyDone,
        best: best ? { ...s.best, [gameId]: score } : s.best,
        plays: { ...s.plays, [gameId]: (s.plays[gameId] ?? 0) + 1 },
      });
      return { earned, best };
    },
    spend: (amount) => {
      const s = get();
      if (amount <= 0 || s.balance < amount) return false;
      set({ balance: s.balance - amount });
      return true;
    },
    bonus: (amount) => {
      const n = Math.max(0, Math.min(Math.round(amount), BONUS_MAX));
      if (!n) return;
      const s = get();
      set({ balance: s.balance + n, lifetime: s.lifetime + n });
    },
    bonusDay: null,
    claimDailyBonus: (amount) => {
      const today = todayKey();
      if (get().bonusDay === today) return false;
      get().bonus(amount);
      set({ bonusDay: today });
      return true;
    },
  }));
}

export function walletStore(app: string) {
  let s = stores.get(app);
  if (!s) {
    s = make(app);
    stores.set(app, s);
  }
  return s;
}
