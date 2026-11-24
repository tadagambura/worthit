// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The ad-timing model: picks the best moment for a full-screen ad, per person, on the phone.
// Owner, 24 Nov 2026: "use the algorithm to also predict the best time to put an ad".
//
// What it learns (never leaves the phone, no personal data):
//   - how many breaks (finished games, decks, quizzes) this person usually has in a session;
//   - how often they carry on after an ad, against how often they carry on anyway;
//   - which gap between ads earns most for them, with a small epsilon-greedy bandit.
// How it decides, at a break the policy has ALREADY allowed:
//   - likely to leave soon (near their usual session length): show now, while they're here;
//   - ads clearly drive this person away: hold, and only show every 3rd break;
//   - otherwise: show once their learned gap has passed.
//
// Safety (AdMob policy and our own caps):
//   - It is only ever asked at a break between rounds (manager.atBreak). Exits, back presses
//     and backgrounding only update what it has learned; they can never trigger an ad.
//   - gate() can only turn an allowed ad into a hold. It can never allow anything the policy
//     (caps, gaps, new users, premium, consent) refused.

import type { Decision } from './types';

export const GAP_ARMS = [90, 120, 180, 240] as const;
const ALPHA = 0.2;
const EPSILON = 0.1;
/** Leaving within this long of an ad counts as "the ad drove them off". */
export const EXIT_AFTER_AD_MS = 15_000;
/** Carrying on after an ad this much less often than without one = ads annoy this person. */
export const ANNOYED = 0.3;

export type TimingModel = {
  v: 1;
  sessions: number;
  /** Typical breaks per session (EMA). */
  avgBreaks: number;
  /** P(another break follows a break with an ad), EMA. */
  stayAfterAd: number;
  /** P(another break follows a break without an ad), EMA. */
  stayNoAd: number;
  /** Bandit over the minimum gap between full-screen ads: reward totals per arm. */
  arms: Record<string, { n: number; total: number }>;
  /** Current session's gap arm (seconds). */
  arm: number;
  cur: { breaks: number; ads: number; lastAdAt: number; pending: 'ad' | 'none' | null; exits: number };
};

export function newModel(): TimingModel {
  return {
    v: 1,
    sessions: 0,
    avgBreaks: 4,
    stayAfterAd: 0.8,
    stayNoAd: 0.85,
    arms: Object.fromEntries(GAP_ARMS.map((g) => [String(g), { n: 0, total: 0 }])),
    arm: GAP_ARMS[0],
    cur: { breaks: 0, ads: 0, lastAdAt: 0, pending: null, exits: 0 },
  };
}

const ema = (old: number, x: number) => old + ALPHA * (x - old);

/** Loads a saved model, falling back to a fresh one if it's missing or from another version. */
export function parseModel(raw: string | null): TimingModel {
  try {
    const m = raw ? (JSON.parse(raw) as TimingModel) : null;
    return m && m.v === 1 && m.cur && m.arms ? m : newModel();
  } catch {
    return newModel();
  }
}

/** Per-session reward for the gap arm: ads shown, minus a heavy penalty for each ad that drove someone away. */
export function sessionReward(cur: TimingModel['cur']): number {
  return cur.ads - 2 * cur.exits;
}

/** Picks the gap arm for the next session: untried arms first, then epsilon-greedy on mean reward. */
export function pickArm(m: TimingModel, rng: () => number): number {
  const untried = GAP_ARMS.filter((g) => m.arms[String(g)].n === 0);
  if (untried.length) return untried[0];
  if (rng() < EPSILON) return GAP_ARMS[Math.floor(rng() * GAP_ARMS.length) % GAP_ARMS.length];
  let best: number = GAP_ARMS[0];
  let bestMean = -Infinity;
  for (const g of GAP_ARMS) {
    const a = m.arms[String(g)];
    const mean = a.total / a.n;
    if (mean > bestMean) {
      bestMean = mean;
      best = g;
    }
  }
  return best;
}

/** A new session begins: learn from the one that ended, choose this session's gap. */
export function startSession(m: TimingModel, rng: () => number): TimingModel {
  const next: TimingModel = JSON.parse(JSON.stringify(m));
  if (m.cur.breaks > 0 || m.cur.ads > 0) {
    next.sessions += 1;
    next.avgBreaks = ema(m.avgBreaks, m.cur.breaks);
    const arm = next.arms[String(m.arm)] ?? { n: 0, total: 0 };
    next.arms[String(m.arm)] = { n: arm.n + 1, total: arm.total + sessionReward(m.cur) };
  }
  next.arm = pickArm(next, rng);
  next.cur = { breaks: 0, ads: 0, lastAdAt: 0, pending: null, exits: 0 };
  return next;
}

/** A break happened (before deciding on an ad): the previous break was followed by more play. */
export function onBreak(m: TimingModel): TimingModel {
  const next = { ...m, cur: { ...m.cur, breaks: m.cur.breaks + 1, pending: null } };
  if (m.cur.pending === 'ad') next.stayAfterAd = ema(m.stayAfterAd, 1);
  if (m.cur.pending === 'none') next.stayNoAd = ema(m.stayNoAd, 1);
  return next;
}

/** After deciding at a break: whether an interstitial actually showed. */
export function onBreakResult(m: TimingModel, shown: boolean, now: number): TimingModel {
  return { ...m, cur: { ...m.cur, pending: shown ? 'ad' : 'none', ads: m.cur.ads + (shown ? 1 : 0), lastAdAt: shown ? now : m.cur.lastAdAt } };
}

/** The app went to the background. Only updates what the model knows; never shows anything. */
export function onBackground(m: TimingModel, now: number): TimingModel {
  const next = { ...m, cur: { ...m.cur, pending: null } };
  if (m.cur.pending === 'ad') {
    next.stayAfterAd = ema(m.stayAfterAd, 0);
    if (now - m.cur.lastAdAt < EXIT_AFTER_AD_MS) next.cur.exits = m.cur.exits + 1;
  }
  if (m.cur.pending === 'none') next.stayNoAd = ema(m.stayNoAd, 0);
  return next;
}

export type TimingAdvice = { show: true; why: 'leaving_soon' | 'gap_passed' } | { show: false; why: 'learned_gap' | 'annoyed' };

/**
 * At a break the policy has already allowed: show now, or hold for a better moment?
 * `lastFullscreenAt` includes app-open ads.
 */
export function advise(m: TimingModel, now: number, lastFullscreenAt: number): TimingAdvice {
  const left = m.avgBreaks - m.cur.breaks;
  const annoyance = m.stayNoAd - m.stayAfterAd;
  if (annoyance > ANNOYED && m.cur.breaks % 3 !== 0) return { show: false, why: 'annoyed' };
  if (left <= 1) return { show: true, why: 'leaving_soon' };
  if (lastFullscreenAt && now - lastFullscreenAt < m.arm * 1000) return { show: false, why: 'learned_gap' };
  return { show: true, why: 'gap_passed' };
}

/** Combines the policy's decision with the model's advice. The model can only hold, never allow. */
export function gate(policy: Decision, m: TimingModel | null, now: number, lastFullscreenAt: number): Decision {
  if (!policy.ok || !m) return policy;
  return advise(m, now, lastFullscreenAt).show ? policy : { ok: false, reason: 'smart_hold' };
}
