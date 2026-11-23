// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The forgiving streak engine (The Progression Loop). Pure and deterministic: the streak is
// recomputed from history every time, so there's no hidden counter to corrupt.
//
// - Unscheduled days and planned rest days are neutral: they never break or count.
// - Freezes are earned (one per `freezeEvery` kept days, up to `maxFreezes`) and auto-apply
//   to a missed day.
// - With no freeze left, a miss starts repair mode instead of a reset. Keep `repairWindow`
//   scheduled days in a row and the old streak comes back. Gaps longer than `maxRepairGap`
//   can't be repaired, and the streak starts fresh, without any shaming.
// - Today is never a miss: it's "pending" until the day is over.

import { addDays, diffDays, type DayKey } from './dates';

export type StreakRules = {
  freezeEvery: number;
  maxFreezes: number;
  repairWindow: number;
  maxRepairGap: number;
};

export const DEFAULT_RULES: StreakRules = { freezeEvery: 7, maxFreezes: 2, repairWindow: 3, maxRepairGap: 2 };

export type StreakInput = {
  done: Iterable<DayKey>;
  rest?: Iterable<DayKey>;
  start: DayKey;
  today: DayKey;
  isScheduled?: (k: DayKey) => boolean;
  rules?: Partial<StreakRules>;
};

export type StreakStatus = 'done' | 'pending' | 'rest' | 'repairing' | 'fresh';

export type StreakResult = {
  current: number;
  best: number;
  doneToday: boolean;
  freezes: number;
  frozenDays: DayKey[];
  repairedDays: DayKey[];
  status: StreakStatus;
  repair: { remaining: number; restores: number } | null;
  totalDone: number;
};

export function computeStreak(input: StreakInput): StreakResult {
  const r = { ...DEFAULT_RULES, ...input.rules };
  const done = new Set(input.done);
  const rest = new Set(input.rest ?? []);
  const scheduled = input.isScheduled ?? (() => true);
  const { today } = input;

  let chain = 0;
  let best = 0;
  let freezes = 0;
  let keptSinceFreeze = 0;
  let totalDone = 0;
  const frozenDays: DayKey[] = [];
  const repairedDays: DayKey[] = [];
  // Repair mode state
  let repairing = false;
  let saved = 0;
  let gap: DayKey[] = [];
  let newRun = 0;

  const span = diffDays(input.start, today);
  for (let i = 0; i <= span; i++) {
    const k = addDays(input.start, i);
    const isToday = k === today;
    if (!scheduled(k) || rest.has(k)) continue;

    if (done.has(k)) {
      totalDone++;
      keptSinceFreeze++;
      if (keptSinceFreeze >= r.freezeEvery) {
        freezes = Math.min(r.maxFreezes, freezes + 1);
        keptSinceFreeze = 0;
      }
      if (repairing) {
        newRun++;
        if (newRun >= r.repairWindow) {
          chain = saved + newRun;
          repairedDays.push(...gap);
          repairing = false;
          saved = 0;
          gap = [];
          newRun = 0;
        }
      } else {
        chain++;
      }
      best = Math.max(best, repairing ? newRun : chain);
      continue;
    }

    if (isToday) break; // not missed yet

    // A missed scheduled day.
    if (freezes > 0 && !repairing) {
      freezes--;
      frozenDays.push(k);
      continue;
    }
    if (repairing) {
      if (newRun === 0) {
        gap.push(k);
        if (gap.length > r.maxRepairGap) {
          repairing = false;
          saved = 0;
          gap = [];
          chain = 0;
        }
      } else {
        // Missed again mid-repair: the old streak is gone; the new run becomes the one to save.
        saved = newRun;
        gap = [k];
        newRun = 0;
      }
      continue;
    }
    if (chain > 0) {
      repairing = true;
      saved = chain;
      gap = [k];
      newRun = 0;
      chain = 0;
    }
  }

  const doneToday = done.has(today);
  const todayScheduled = scheduled(today) && !rest.has(today);
  let status: StreakStatus;
  if (repairing) status = 'repairing';
  else if (doneToday) status = 'done';
  else if (!todayScheduled) status = 'rest';
  else if (chain === 0) status = 'fresh';
  else status = 'pending';

  return {
    current: repairing ? newRun : chain,
    best,
    doneToday,
    freezes,
    frozenDays,
    repairedDays,
    status,
    repair: repairing ? { remaining: r.repairWindow - newRun, restores: saved } : null,
    totalDone,
  };
}

/** Kind words for each state. Never guilt. */
export function streakMessage(s: StreakResult, unit = 'day'): string {
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  const adj = (n: number) => `${n}-${unit}`;
  switch (s.status) {
    case 'done':
      return s.current > 1 ? `${plural(s.current)} in a row. Nice.` : 'Done for today. Nice.';
    case 'pending':
      return `${plural(s.current)} so far. Today's still open.`;
    case 'rest':
      return s.current > 0 ? `Rest day. Your ${adj(s.current)} streak is safe.` : 'Rest day.';
    case 'repairing':
      return `Repair mode: ${plural(s.repair!.remaining)} more to bring back your ${adj(s.repair!.restores)} streak.`;
    case 'fresh':
      return s.best > 0 ? `Fresh start. Your best is ${plural(s.best)}.` : 'Day one starts whenever you like.';
  }
}
