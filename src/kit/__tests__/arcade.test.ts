// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { answerPoints, catalogProblems, dailyGame, guessPoints, overlap, rewardFor, shuffled, DAILY_REWARD_CAP } from '../arcade/engine';
import { scoreGuess } from '../arcade/mechanics';
import { loadPack, packState } from '../arcade/packs';
import { sha256 } from '../arcade/sha256';
import type { ArcadeCatalog, GameMeta } from '../arcade/types';
import { walletStore } from '../arcade/wallet';

jest.mock('../storage', () => {
  const m = new Map<string, string>();
  return { kv: { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => m.set(k, v), remove: (k: string) => m.delete(k), keys: () => [...m.keys()] } };
});
jest.mock('../haptics', () => ({ tap: () => {}, success: () => {}, warn: () => {} }));

describe('sha256 matches Python hashlib (packs are fingerprinted at build time)', () => {
  test.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['Hi 🪙 £ “quotes” 🧑‍🔧', '8113aa9b3d3c2cee46b4a30c68df83b66a11f7d767995eac0b11900d7d1d74c9'],
    ['x'.repeat(1000), '44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f'],
  ])('%#', (input, hex) => expect(sha256(input)).toBe(hex));
});

describe('arcade rules', () => {
  test('rewards: playing always earns something, the daily doubles, a daily cap stops grinding', () => {
    expect(rewardFor(0, { daily: false, earnedToday: 0 })).toBe(1);
    expect(rewardFor(95, { daily: false, earnedToday: 0 })).toBe(10);
    expect(rewardFor(95, { daily: true, earnedToday: 0 })).toBe(20);
    expect(rewardFor(10_000, { daily: false, earnedToday: 0 })).toBe(30);
    expect(rewardFor(95, { daily: false, earnedToday: DAILY_REWARD_CAP - 3 })).toBe(3);
    expect(rewardFor(95, { daily: false, earnedToday: DAILY_REWARD_CAP })).toBe(0);
    expect(rewardFor(-50, { daily: false, earnedToday: 0 })).toBe(1);
  });
  test('no punishment: wrong answers score zero, never negative', () => {
    expect(answerPoints(false, 9)).toBe(0);
    expect(answerPoints(true, 0)).toBe(10);
    expect(answerPoints(true, 99)).toBe(20);
  });
  test('guess scoring rewards closeness', () => {
    expect(guessPoints(260, 260)).toBe(50);
    expect(guessPoints(286, 260)).toBe(40);
    expect(guessPoints(1000, 260)).toBe(0);
  });
  test('stack overlap', () => {
    expect(overlap(70, 140, 90, 140)).toEqual({ left: 90, width: 120 });
    expect(overlap(70, 140, 300, 140)).toEqual({ left: 300, width: 0 });
  });
  test('word scoring handles repeated letters', () => {
    expect(scoreGuess('PENNY', 'PENNY')).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(scoreGuess('NNNNN', 'PENNY')).toEqual(['miss', 'miss', 'hit', 'hit', 'miss']);
    expect(scoreGuess('YEPNN', 'PENNY')).toEqual(['near', 'hit', 'near', 'hit', 'near']);
  });
  test('shuffles are seeded and keep every item', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffled(xs, 7)).toEqual(shuffled(xs, 7));
    expect([...shuffled(xs, 7)].sort()).toEqual(xs);
  });
});

const game = (over: Partial<GameMeta>): GameMeta => ({ id: 'g', name: 'G', how: '', teaches: '', mechanic: 'quiz', tier: 'free', emoji: '🎮', seconds: 45, pack: { file: 'x/g.json', sha256: 'a'.repeat(64), bytes: 10 }, ...over });
const catalog = (games: GameMeta[]): ArcadeCatalog => ({ app: 'test', title: 'Test Arcade', emoji: '🎮', currency: { name: 'Coins', one: 'coin', emoji: '🪙' }, unlocks: '', games });

describe('daily challenge', () => {
  const games = Array.from({ length: 8 }, (_, i) => game({ id: `g${i}`, tier: i < 3 ? 'free' : 'arcade', flagship: i === 0 }));
  test('same game all day, only from games this person can play', () => {
    const c = catalog(games);
    const a = dailyGame(c, '2026-11-24', (g) => g.tier === 'free');
    expect(a).toEqual(dailyGame(c, '2026-11-24', (g) => g.tier === 'free'));
    expect(a!.tier).toBe('free');
    const days = Array.from({ length: 20 }, (_, i) => dailyGame(c, `2026-12-${String(i + 1).padStart(2, '0')}`, () => true)!.id);
    expect(new Set(days).size).toBeGreaterThan(3);
  });
  test('route and spinner games are never the daily', () => {
    expect(dailyGame(catalog([game({ mechanic: 'route', route: '/x', pack: null }), game({ id: 's', mechanic: 'spinner' })]), '2026-11-24', () => true)).toBeNull();
  });
});

describe('wallet', () => {
  test('earns, records bests, pays the daily once, never goes negative', () => {
    const w = walletStore('wtest').getState;
    expect(w().finish('g1', 50, true)).toEqual({ earned: 12, best: true });
    expect(w().finish('g1', 20, true)).toEqual({ earned: 3, best: false });
    expect(w().balance).toBe(15);
    expect(w().best.g1).toBe(50);
    expect(w().spend(100)).toBe(false);
    expect(w().spend(10)).toBe(true);
    expect(w().balance).toBe(5);
    expect(w().finish('g2', 0, false)).toEqual({ earned: 1, best: false });
  });
});

describe('on-demand packs', () => {
  const content = '{"items":[{"q":"2+2?","options":["4","5"],"answer":0}]}';
  const g = game({ id: 'remote', pack: { file: 'test/remote.json', sha256: sha256(content), bytes: content.length } });
  test('downloads once, verifies, then works offline from the cache', async () => {
    let calls = 0;
    const fetcher = async (url: string) => {
      calls++;
      expect(url).toBe('https://kaoticchainz.com/arcade/test/remote.json');
      return { ok: true, text: async () => content };
    };
    expect(packState('t1', g, {})).toBe('remote');
    expect(await loadPack('t1', g, {}, fetcher)).toEqual(JSON.parse(content));
    expect(packState('t1', g, {})).toBe('cached');
    await loadPack('t1', g, {}, async () => Promise.reject(new Error('offline')));
    expect(calls).toBe(1);
  });
  test('a tampered or corrupted pack is rejected and not cached', async () => {
    await expect(loadPack('t2', g, {}, async () => ({ ok: true, text: async () => content.replace('4', '5') }))).rejects.toThrow(/didn't download properly/);
    expect(packState('t2', g, {})).toBe('remote');
  });
  test('offline with no cache gives a friendly error', async () => {
    await expect(loadPack('t3', g, {}, async () => Promise.reject(new Error('x')))).rejects.toThrow(/connection/);
  });
  test('bundled flagship packs never touch the network', async () => {
    expect(await loadPack('t4', g, { remote: { items: [] } }, async () => Promise.reject(new Error('no')))).toEqual({ items: [] });
  });
});

describe("this app's arcade catalog", () => {
  let real: ArcadeCatalog | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    real = require('../../arcade/catalog.json') as ArcadeCatalog;
  } catch {
    real = null;
  }
  (real ? test : test.skip)('has at least 8 games, one flagship, a free game and a pack for each', () => {
    expect(catalogProblems(real!)).toEqual([]);
  });
});
