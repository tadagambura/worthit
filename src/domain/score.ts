// WorthIt?: a private, qualitative way to think about a situationship.
// It rates behaviours and how you feel, never the person's worth as a human. Nothing leaves the phone.

export type Dim = 'communication' | 'consistency' | 'effort' | 'respect' | 'feel' | 'future';

export const DIMS: { key: Dim; label: string; low: string; high: string; weight: number; question: string }[] = [
  { key: 'communication', label: 'Communication', low: 'Hard to read', high: 'Clear and kind', weight: 1, question: 'Can you talk about what you both want, out loud?' },
  { key: 'consistency', label: 'Consistency', low: 'Hot and cold', high: 'Steady', weight: 1.2, question: 'What would make plans feel reliable to you?' },
  { key: 'effort', label: 'Effort', low: 'All on me', high: 'Equal', weight: 1, question: 'Who usually reaches out first, and how does that feel?' },
  { key: 'respect', label: 'Respect', low: 'Dismissive', high: 'Respectful', weight: 1.5, question: 'Do they respect your time, boundaries and friends?' },
  { key: 'feel', label: 'How you feel', low: 'Anxious', high: 'Happy and safe', weight: 1.3, question: 'How do you feel the day after you see them?' },
  { key: 'future', label: 'Signs of a future', low: 'None', high: 'Plenty', weight: 0.8, question: 'Have you talked about what this is, and where it might go?' },
];

export const GREEN_FLAGS = ['Keeps their word', 'Asks about my day', 'Introduced me to friends', 'Apologises properly', 'Makes plans ahead', 'Supports my goals'];
export const RED_FLAGS = ['Only texts late at night', 'Cancels last minute', 'Hides me from friends', 'Love-bombs then goes cold', 'Ignores my boundaries', 'I feel unsafe'];
/** Flags that cap the score, whatever else is going on. */
export const DEALBREAKERS = ['Ignores my boundaries', 'I feel unsafe'];

export type CheckIn = { day: string; ratings: Record<Dim, number>; green: string[]; red: string[] };

export function score(c: Pick<CheckIn, 'ratings' | 'green' | 'red'>): number {
  let w = 0;
  let total = 0;
  for (const d of DIMS) {
    const v = Math.max(1, Math.min(5, c.ratings[d.key] ?? 3));
    total += ((v - 1) / 4) * d.weight;
    w += d.weight;
  }
  let s = (total / w) * 100;
  s += Math.min(10, c.green.length * 3);
  s -= Math.min(30, c.red.length * 6);
  if (c.red.some((r) => DEALBREAKERS.includes(r))) s = Math.min(s, 25);
  return Math.round(Math.max(0, Math.min(100, s)));
}

export function verdict(s: number): { label: string; emoji: string; tone: 'great' | 'good' | 'mixed' | 'low' } {
  if (s >= 75) return { label: 'Worth it', emoji: '💍', tone: 'great' };
  if (s >= 50) return { label: 'Promising', emoji: '🌱', tone: 'good' };
  if (s >= 30) return { label: 'Mixed signals', emoji: '🚦', tone: 'mixed' };
  return { label: 'Not worth it', emoji: '🚩', tone: 'low' };
}

export type Take = { strengths: string[]; concerns: string[]; questions: string[]; safety: boolean };

/** A balanced view worked out from your own answers (no AI): what's going well, what isn't, what to ask. */
export function balancedTake(c: CheckIn): Take {
  const strengths = DIMS.filter((d) => c.ratings[d.key] >= 4).map((d) => `${d.label}: ${d.high.toLowerCase()}`);
  strengths.push(...c.green);
  const concerns = DIMS.filter((d) => c.ratings[d.key] <= 2).map((d) => `${d.label}: ${d.low.toLowerCase()}`);
  concerns.push(...c.red);
  const questions = DIMS.filter((d) => c.ratings[d.key] <= 3)
    .sort((a, b) => c.ratings[a.key] - c.ratings[b.key] || b.weight - a.weight)
    .slice(0, 3)
    .map((d) => d.question);
  return { strengths: strengths.slice(0, 6), concerns: concerns.slice(0, 6), questions, safety: c.red.includes('I feel unsafe') };
}

/** Change in score since the previous check-in, or null for the first one. */
export function trend(checkIns: CheckIn[]): number | null {
  if (checkIns.length < 2) return null;
  return score(checkIns[checkIns.length - 1]) - score(checkIns[checkIns.length - 2]);
}

export const neutral = (): Record<Dim, number> => ({ communication: 3, consistency: 3, effort: 3, respect: 3, feel: 3, future: 3 });
