// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Arcade rules, as pure functions so they're tested once for every app.
// Principles: short rounds, rewards that help in the real app, and no punishment. Scores
// never go below zero, nothing is taken away for not playing, and there are no lives.
import type { ArcadeCatalog, GameMeta } from './types';

/** Seeded PRNG (mulberry32): rounds can be replayed and tested. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const r = rng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// ---------- rewards ----------

/** Most currency one app hands out from games in a day, so it stays a bonus, not a grind. */
export const DAILY_REWARD_CAP = 120;

/**
 * Currency for a finished round: 1 for playing, plus 1 per 10 points, capped per round.
 * The daily challenge pays double. Never negative.
 */
export function rewardFor(score: number, opts: { daily: boolean; earnedToday: number }): number {
  const base = 1 + Math.floor(Math.max(0, score) / 10);
  const round = Math.min(base, 30) * (opts.daily ? 2 : 1);
  return Math.max(0, Math.min(round, DAILY_REWARD_CAP - opts.earnedToday));
}

/** Points for an answer: right answers score, quick streaks score a little more, wrong ones cost nothing. */
export function answerPoints(correct: boolean, streak: number): number {
  if (!correct) return 0;
  return 10 + Math.min(streak, 5) * 2;
}

/** Closeness scoring for guessing games: 50 for spot on, falling to 0 at 50% out. */
export function guessPoints(guess: number, answer: number): number {
  if (answer === 0) return guess === 0 ? 50 : 0;
  const off = Math.abs(guess - answer) / Math.abs(answer);
  return Math.max(0, Math.round(50 * (1 - off * 2)));
}

/** Stack: how much of the moving block lands on the tower (0 = missed, ends the round). */
export function overlap(towerLeft: number, towerWidth: number, blockLeft: number, blockWidth: number): { left: number; width: number } {
  const left = Math.max(towerLeft, blockLeft);
  const right = Math.min(towerLeft + towerWidth, blockLeft + blockWidth);
  return { left, width: Math.max(0, right - left) };
}

// ---------- daily challenge ----------

/** One playable game per day per app, the same all day, from the games this person can play. */
export function dailyGame(catalog: ArcadeCatalog, day: string, playable: (g: GameMeta) => boolean): GameMeta | null {
  const pool = catalog.games.filter((g) => playable(g) && g.mechanic !== 'route' && g.mechanic !== 'spinner');
  if (!pool.length) return null;
  return pool[hashString(`${catalog.app}:${day}`) % pool.length];
}

// ---------- catalog checks (used by tests and the build script) ----------

export const MIN_GAMES_PER_APP = 8;

export function catalogProblems(c: ArcadeCatalog): string[] {
  const out: string[] = [];
  if (c.games.length < MIN_GAMES_PER_APP) out.push(`${c.app}: only ${c.games.length} games (minimum ${MIN_GAMES_PER_APP})`);
  if (c.games.filter((g) => g.flagship).length !== 1) out.push(`${c.app}: needs exactly one flagship game`);
  if (!c.games.some((g) => g.tier === 'free')) out.push(`${c.app}: needs at least one free game`);
  const ids = new Set<string>();
  for (const g of c.games) {
    if (ids.has(g.id)) out.push(`${c.app}: duplicate game id ${g.id}`);
    ids.add(g.id);
    if (g.seconds < 20 || g.seconds > 90) out.push(`${c.app}/${g.id}: round length ${g.seconds}s is outside 20–90s`);
    if (g.mechanic === 'route' ? !g.route : !g.pack) out.push(`${c.app}/${g.id}: no content pack`);
  }
  return out;
}
