// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { advise, ANNOYED, EXIT_AFTER_AD_MS, GAP_ARMS, gate, nearEnd, newModel, onBackground, onBreak, onBreakResult, parseModel, pickArm, sessionReward, startSession, type TimingModel } from '../ads/timing';
import type { BlockReason, Decision } from '../ads/types';

const T = 1_800_000_000_000;
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};
/** Deterministic pseudo-random numbers in [0, 1). */
const lcg = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

/**
 * Plays `sessions` sessions of up to `rounds` rounds, `roundMs` apart, through the model and a
 * simple stand-in for the policy (30 s grace, 90 s gap, 5 a session). After an ad, the person
 * leaves with probability `leaveAfterAd`. Returns the model, ads per session, and the share of
 * breaks (after a warm-up) where the model had marked them as annoyed.
 */
function play(opts: { sessions: number; rounds: number; roundMs: number; leaveAfterAd: number }) {
  const rng = lcg(7);
  let m = newModel();
  let t = T;
  let lastAd = 0;
  let ads = 0;
  let annoyed = 0;
  let checked = 0;
  for (let s = 0; s < opts.sessions; s++) {
    m = startSession(m, rng);
    const start = t;
    let inSession = 0;
    for (let b = 1; b <= opts.rounds; b++) {
      t += opts.roundMs;
      m = onBreak(m);
      if (s >= opts.sessions / 4) {
        checked++;
        if (m.stayNoAd - m.stayAfterAd > ANNOYED) annoyed++;
      }
      const allowed = t - start >= 30_000 && (!lastAd || t - lastAd >= 90_000) && inSession < 5;
      const shown = gate(allowed ? { ok: true } : { ok: false, reason: 'too_soon' }, m, t, lastAd).ok;
      if (shown) {
        t += 15_000; // the ad plays; the model hears about it when it closes
        lastAd = t;
        inSession++;
        ads++;
      }
      m = onBreakResult(m, shown, t);
      if (shown && rng() < opts.leaveAfterAd) break;
    }
    t += 3_000;
    m = onBackground(m, t);
    t += 3_600_000;
  }
  return { m, adsPerSession: ads / opts.sessions, annoyedShare: annoyed / checked };
}

describe('ad timing model: safety', () => {
  const blocked: BlockReason[] = ['premium', 'no_consent', 'new_user', 'lapsed_user', 'session_grace', 'too_soon', 'rewarded_cooldown', 'session_cap', 'daily_cap', 'after_failure', 'disabled'];
  test('can never allow an ad the policy refused (caps, gaps, new users, premium, consent)', () => {
    const eager: TimingModel = { ...newModel(), avgBreaks: 1, cur: { ...newModel().cur, breaks: 5 } };
    expect(advise(eager, T, 0).show).toBe(true);
    for (const reason of blocked) {
      const policy: Decision = { ok: false, reason };
      expect(gate(policy, eager, T, 0)).toEqual(policy);
      expect(gate(policy, newModel(), T, 0)).toEqual(policy);
    }
  });
  test('when the policy allows, the model can only allow or hold', () => {
    for (const m of [newModel(), { ...newModel(), stayAfterAd: 0.1 }, { ...newModel(), avgBreaks: 20 }]) {
      const r = gate({ ok: true }, m, T, T - 30_000);
      expect(r.ok || (!r.ok && r.reason === 'smart_hold')).toBe(true);
    }
  });
  test('no model (holdout) means the plain policy', () => {
    expect(gate({ ok: true }, null, T, T)).toEqual({ ok: true });
  });
  test('leaving the app only teaches the model; nothing in its API can show an ad on exit', () => {
    const m = onBreakResult(onBreak(newModel()), true, T);
    const after = onBackground(m, T + 2_000);
    expect(after.cur.exits).toBe(1);
    expect(after.stayAfterAd).toBeLessThan(m.stayAfterAd);
    // onBackground returns a model, not a decision.
    expect('ok' in after).toBe(false);
  });
});

describe('ad timing model: learning', () => {
  test('learns the usual session length', () => {
    let m = newModel();
    for (let s = 0; s < 20; s++) {
      m = startSession(m, seq(0.5));
      for (let b = 0; b < 10; b++) m = onBreakResult(onBreak(m), false, T);
    }
    expect(m.avgBreaks).toBeGreaterThan(9);
  });
  test('shows when the person is likely about to leave', () => {
    const m: TimingModel = { ...newModel(), avgBreaks: 3, arm: 240, cur: { ...newModel().cur, breaks: 2 } };
    // Even inside the learned gap: they're near the end of their usual session.
    expect(advise(m, T, T - 100_000)).toEqual({ show: true, why: 'leaving_soon' });
  });
  test('waits for the learned gap mid-session', () => {
    const m: TimingModel = { ...newModel(), avgBreaks: 10, arm: 180, cur: { ...newModel().cur, breaks: 2 } };
    expect(advise(m, T, T - 100_000)).toEqual({ show: false, why: 'learned_gap' });
    expect(advise(m, T, T - 200_000)).toEqual({ show: true, why: 'gap_passed' });
  });
  test('backs off for people whom ads drive away', () => {
    // A long usual session, so none of these breaks are near its end.
    let m: TimingModel = { ...newModel(), avgBreaks: 100 };
    // Ads repeatedly followed by leaving; breaks without ads followed by more play.
    for (let i = 0; i < 12; i++) {
      m = onBackground(onBreakResult(onBreak(m), true, T), T + 1_000);
      m = onBreakResult(onBreak(m), false, T);
      m = onBreak(m);
    }
    expect(m.stayNoAd - m.stayAfterAd).toBeGreaterThan(ANNOYED);
    const mid = { ...m, avgBreaks: 20, cur: { ...m.cur, breaks: 4 } };
    expect(advise(mid, T, 0)).toEqual({ show: false, why: 'annoyed' });
    expect(advise({ ...mid, cur: { ...mid.cur, breaks: 6 } }, T, 0).show).toBe(true);
  });
  test("people who don't mind ads are never marked annoyed, even with short sessions", () => {
    // Review of #64: 'leaving_soon' put the ad on the last round and the exit was then blamed on
    // it, so a 3-round player was marked annoyed and got ~1 ad a session instead of ~3.
    for (const [rounds, roundMs] of [[3, 180_000], [4, 120_000], [6, 60_000], [10, 30_000]]) {
      const r = play({ sessions: 200, rounds, roundMs, leaveAfterAd: 0 });
      expect(r.annoyedShare).toBe(0);
    }
    expect(play({ sessions: 200, rounds: 3, roundMs: 180_000, leaveAfterAd: 0 }).adsPerSession).toBeGreaterThan(2.5);
  });
  test('people whom ads really drive away are still marked annoyed', () => {
    expect(play({ sessions: 200, rounds: 6, roundMs: 60_000, leaveAfterAd: 1 }).annoyedShare).toBeGreaterThan(0.9);
    expect(play({ sessions: 200, rounds: 10, roundMs: 30_000, leaveAfterAd: 0.5 }).annoyedShare).toBeGreaterThan(0.8);
  });
  test('a break near the end of the usual session teaches nothing, so leaving after its ad is not blamed', () => {
    const m: TimingModel = { ...newModel(), avgBreaks: 3, cur: { ...newModel().cur, breaks: 1 } };
    const atEnd = onBreak(m); // break 2 of a usual 3
    expect(nearEnd(atEnd)).toBe(true);
    expect(advise(atEnd, T, 0)).toEqual({ show: true, why: 'leaving_soon' });
    const left = onBackground(onBreakResult(atEnd, true, T), T + 1_000);
    expect(left.cur.exits).toBe(0);
    expect(left.stayAfterAd).toBe(m.stayAfterAd);
    expect(left.cur.ads).toBe(1);
    // Mid-session, the same exit does count.
    const mid = onBackground(onBreakResult(onBreak({ ...m, avgBreaks: 10 }), true, T), T + 1_000);
    expect(mid.cur.exits).toBe(1);
    expect(mid.stayAfterAd).toBeLessThan(m.stayAfterAd);
  });
  test('an exit long after an ad is not blamed on it', () => {
    const m = onBreakResult(onBreak(newModel()), true, T);
    expect(onBackground(m, T + EXIT_AFTER_AD_MS + 1).cur.exits).toBe(0);
  });
  test('bandit tries every gap, then mostly exploits the best (deterministic with an injected RNG)', () => {
    let m = newModel();
    const tried: number[] = [];
    for (const g of GAP_ARMS) {
      m = { ...m, arm: pickArm(m, seq(0.99)) };
      tried.push(m.arm);
      m.arms[String(m.arm)] = { n: 1, total: g === 180 ? 5 : 1 };
    }
    expect(tried).toEqual([...GAP_ARMS]);
    expect(pickArm(m, seq(0.99))).toBe(180);
    expect(GAP_ARMS).toContain(pickArm(m, seq(0.01, 0.6)));
    expect(sessionReward({ breaks: 6, ads: 3, lastAdAt: 0, pending: null, exits: 1 })).toBe(1);
  });
  test('session rollover records the reward for the arm that ran', () => {
    let m = { ...newModel(), arm: 120 };
    m = onBreakResult(onBreak(m), true, T);
    m = onBreakResult(onBreak(m), true, T + 200_000);
    const n = startSession(m, seq(0.99));
    expect(n.arms['120']).toEqual({ n: 1, total: 2 });
    expect(n.cur.breaks).toBe(0);
    expect(n.sessions).toBe(1);
  });
  test('a corrupt saved model falls back to a fresh one', () => {
    expect(parseModel('{oops')).toEqual(newModel());
    expect(parseModel(JSON.stringify({ v: 9 }))).toEqual(newModel());
    expect(parseModel(JSON.stringify(newModel()))).toEqual(newModel());
  });
  test('a partly broken saved model keeps what it can and never crashes the bandit', () => {
    const m = parseModel(JSON.stringify({ v: 1, cur: {}, arms: { '120': { n: 3, total: 9 } }, avgBreaks: 'x', stayAfterAd: 0.5, arm: 999 }));
    expect(Object.keys(m.arms).sort()).toEqual(GAP_ARMS.map(String).sort());
    expect(m.arms['120']).toEqual({ n: 3, total: 9 });
    expect(m.avgBreaks).toBe(newModel().avgBreaks);
    expect(m.stayAfterAd).toBe(0.5);
    expect(m.arm).toBe(GAP_ARMS[0]);
    expect(m.cur).toEqual(newModel().cur);
    expect(() => startSession(m, seq(0.99))).not.toThrow();
  });
});
