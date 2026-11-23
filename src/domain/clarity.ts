// WorthIt?: relationship clarity, not a score on a human being.
// "Get out of your head. Look at the pattern." Everything here describes behaviours and your own
// feelings over time, privately, and never claims to measure anyone's worth.

export const GREEN_FLAGS = ['Keeps their word', 'Asks about my day', 'Makes plans ahead', 'Introduced me to friends', 'Apologises properly', 'Supports my goals', 'Consistent texting'];
export const YELLOW_FLAGS = ['Slow to reply', 'Vague about plans', 'Only meets on their terms', 'Still talks about their ex', 'Hot and cold', "Won't define what this is"];
export const RED_FLAGS = ['Only texts late at night', 'Cancels last minute, often', 'Hides me from friends', 'Love-bombs then goes cold', 'Ignores my boundaries', 'I feel unsafe'];
export const SAFETY_FLAG = 'I feel unsafe';

export type WordsActions = { said: string; did: string; matched: boolean };

export type CheckIn = {
  day: string;
  before: number; // how I felt before seeing or talking to them, 1 (anxious) – 5 (calm, happy)
  after: number; // and after
  green: string[];
  yellow: string[];
  red: string[];
  words?: WordsActions | null;
  boundaries: Record<string, 'kept' | 'crossed'>; // boundary text → this time
  note?: string;
};

export type Pattern = {
  checkIns: number;
  flags: { green: number; yellow: number; red: number };
  feelShift: number | null; // average (after − before); positive = you usually feel better after
  wordsMatch: number | null; // share of times words matched actions
  boundariesKept: number | null; // share of boundary checks that were kept
  read: 'not-enough' | 'green' | 'mixed' | 'red';
  safety: boolean;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** The pattern across the most recent check-ins (default: last 6). */
export function pattern(all: CheckIn[], window = 6): Pattern {
  const cs = all.slice(-window);
  const flags = { green: 0, yellow: 0, red: 0 };
  for (const c of cs) {
    flags.green += c.green.length;
    flags.yellow += c.yellow.length;
    flags.red += c.red.length;
  }
  const feelShift = avg(cs.map((c) => c.after - c.before));
  const words = cs.map((c) => c.words).filter((w): w is WordsActions => !!w);
  const wordsMatch = words.length ? words.filter((w) => w.matched).length / words.length : null;
  const bchecks = cs.flatMap((c) => Object.values(c.boundaries));
  const boundariesKept = bchecks.length ? bchecks.filter((b) => b === 'kept').length / bchecks.length : null;
  const safety = cs.some((c) => c.red.includes(SAFETY_FLAG));

  let read: Pattern['read'];
  if (safety) read = 'red';
  else if (cs.length < 2) read = 'not-enough';
  else {
    let points = 0;
    points += flags.green - flags.yellow - 2.5 * flags.red;
    if (feelShift != null) points += feelShift * 2;
    if (wordsMatch != null) points += (wordsMatch - 0.5) * 4;
    if (boundariesKept != null) points += (boundariesKept - 0.7) * 6;
    read = points >= 3 ? 'green' : points <= -3 ? 'red' : 'mixed';
  }
  return { checkIns: cs.length, flags, feelShift, wordsMatch, boundariesKept, read, safety };
}

/** Straight-talking, funny-but-kind headline for the pattern. About the situation, never the person. */
export function headline(p: Pattern, nickname: string): { emoji: string; text: string } {
  if (p.safety) return { emoji: '🛑', text: 'Your safety comes first. Please read the note below.' };
  switch (p.read) {
    case 'not-enough':
      return { emoji: '🕵️', text: `Early days with ${nickname}. A couple more check-ins and the pattern shows up.` };
    case 'green':
      return { emoji: '💚', text: `Mostly green with ${nickname}. Enjoy it, and keep your eyes open.` };
    case 'mixed':
      return { emoji: '🚦', text: `Mixed signals. Look at what ${nickname} does, not just what they say.` };
    case 'red':
      return { emoji: '🚩', text: 'The pattern says: protect your peace.' };
  }
}

export function feelLine(shift: number | null): string | null {
  if (shift == null) return null;
  if (shift >= 0.75) return 'You usually feel better after time with them.';
  if (shift <= -0.75) return 'You usually feel worse after time with them. That matters.';
  return 'You feel about the same before and after.';
}

/** Questions to ask, chosen from what the pattern is unclear about. */
export function questions(p: Pattern): string[] {
  const q: string[] = [];
  if (p.flags.yellow > 0) q.push('What would make plans feel reliable to you, and have you said so?');
  if (p.wordsMatch != null && p.wordsMatch < 0.7) q.push('Which promise did they last keep? Which did they skip?');
  if (p.boundariesKept != null && p.boundariesKept < 1) q.push('What happens when you restate a boundary calmly?');
  if (p.feelShift != null && p.feelShift < 0) q.push('What exactly changes in how you feel after seeing them?');
  if (!q.length) q.push('Have you talked about what this is, and where it might go?');
  return q.slice(0, 3);
}

/** WorthIt? → AfterHours nudge: a clearly good pattern after a few check-ins. */
export function suggestAfterHours(p: Pattern): boolean {
  return p.read === 'green' && p.checkIns >= 3 && (p.feelShift ?? 0) > 0 && p.flags.red === 0;
}

export const blank = (): Omit<CheckIn, 'day'> => ({ before: 3, after: 3, green: [], yellow: [], red: [], words: null, boundaries: {}, note: '' });
