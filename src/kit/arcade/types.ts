// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Arcade types. A game = a mechanic (code, shipped in the app) + a content pack (data,
// downloaded when someone first plays it). Catalogs are generated from app-portfolio/arcade
// by scripts/build_arcade.py; never edit an app's copy.
import type { Tier } from '../entitlements';

export type Mechanic = 'quiz' | 'sort' | 'catch' | 'stack' | 'memory' | 'sequence' | 'spinner' | 'guess' | 'order' | 'word' | 'route';

export type PackRef = { file: string; sha256: string; bytes: number };

export type GameMeta = {
  id: string;
  name: string;
  /** One line: how to play. */
  how: string;
  /** One line: what it teaches. Every KC game teaches something useful. */
  teaches: string;
  mechanic: Mechanic;
  tier: Tier;
  emoji: string;
  flagship?: boolean;
  /** Round length. Games are short: 30 to 60 seconds. */
  seconds: number;
  /** Content pack, downloaded on first play. Null for bundled or app-route games. */
  pack: PackRef | null;
  /** For mechanic 'route': an existing screen in the app (e.g. AfterHours tic-tac-toe). */
  route?: string;
};

export type Currency = { name: string; one: string; emoji: string };

export type ArcadeCatalog = {
  app: string;
  /** "Money Arcade", "Detective Arcade"… */
  title: string;
  emoji: string;
  currency: Currency;
  /** What the currency will buy in the app, as a noun phrase ("savings-vault decorations"). */
  unlocks: string;
  games: GameMeta[];
};

// ---------- content packs, one shape per mechanic ----------

export type QuizPack = { items: { q: string; options: string[]; answer: number; why?: string }[] };
export type SortPack = { bins: { id: string; label: string; emoji?: string }[]; items: { text: string; bin: string; why?: string }[] };
export type CatchPack = { catcher: string; good: { e: string; label: string }[]; bad: { e: string; label: string }[]; tip: string };
export type StackPack = { block: string; label: string; tip: string };
export type MemoryPack = { pairs: [string, string][]; tip?: string };
export type SequencePack = { symbols: string[]; tip: string };
export type SpinnerPack = { prompts: { text: string; tag?: string }[]; done: string; note?: string };
export type GuessPack = { items: { q: string; answer: number; unit: string; min: number; max: number; step: number; why?: string }[] };
export type OrderPack = { rounds: { title: string; steps: string[]; why?: string }[] };
export type WordPack = { words: { word: string; clue: string }[] };

export type Pack = QuizPack | SortPack | CatchPack | StackPack | MemoryPack | SequencePack | SpinnerPack | GuessPack | OrderPack | WordPack;

/** What a finished round reports back to the shell. */
export type RoundResult = { score: number; correct?: number; total?: number; learned?: string[] };
