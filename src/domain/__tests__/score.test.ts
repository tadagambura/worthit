import { balancedTake, neutral, score, trend, verdict, type CheckIn } from '../score';

const ci = (ratings: Partial<ReturnType<typeof neutral>>, green: string[] = [], red: string[] = []): CheckIn => ({ day: '2026-11-23', ratings: { ...neutral(), ...ratings }, green, red });

test('all middling = 50, all great = 100, all poor = 0', () => {
  expect(score(ci({}))).toBe(50);
  expect(score(ci({ communication: 5, consistency: 5, effort: 5, respect: 5, feel: 5, future: 5 }))).toBe(100);
  expect(score(ci({ communication: 1, consistency: 1, effort: 1, respect: 1, feel: 1, future: 1 }))).toBe(0);
});

test('flags move the score, capped', () => {
  expect(score(ci({}, ['Keeps their word']))).toBe(53);
  expect(score(ci({}, ['a', 'b', 'c', 'd', 'e']))).toBe(60); // green capped at +10
  expect(score(ci({}, [], ['Cancels last minute']))).toBe(44);
});

test('dealbreakers cap the score at 25 however good the rest is', () => {
  const s = score(ci({ communication: 5, consistency: 5, effort: 5, respect: 5, feel: 5, future: 5 }, [], ['I feel unsafe']));
  expect(s).toBe(25);
  expect(verdict(s).label).toBe('Not worth it');
});

test('respect and feelings weigh more than signs of a future', () => {
  expect(score(ci({ respect: 5 }))).toBeGreaterThan(score(ci({ future: 5 })));
});

test('balanced take lists strengths, concerns and the questions that matter most', () => {
  const t = balancedTake(ci({ respect: 5, consistency: 1, effort: 2 }, ['Asks about my day'], ['Only texts late at night']));
  expect(t.strengths).toEqual(['Respect: respectful', 'Asks about my day']);
  expect(t.concerns).toEqual(['Consistency: hot and cold', 'Effort: all on me', 'Only texts late at night']);
  expect(t.questions[0]).toMatch(/reliable/);
  expect(t.safety).toBe(false);
  expect(balancedTake(ci({}, [], ['I feel unsafe'])).safety).toBe(true);
});

test('trend compares the last two check-ins', () => {
  expect(trend([ci({})])).toBeNull();
  expect(trend([ci({}), ci({ respect: 5 })])).toBeGreaterThan(0);
});
