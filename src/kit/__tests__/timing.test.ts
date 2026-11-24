// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { advise, ANNOYED, EXIT_AFTER_AD_MS, GAP_ARMS, gate, newModel, onBackground, onBreak, onBreakResult, parseModel, pickArm, sessionReward, startSession, type TimingModel } from '../ads/timing';
import type { BlockReason, Decision } from '../ads/types';

const T = 1_800_000_000_000;
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

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
    let m = newModel();
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
});
