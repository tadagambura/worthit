import { blank, feelLine, headline, pattern, questions, suggestAfterHours, type CheckIn } from '../clarity';

const ci = (o: Partial<CheckIn> = {}): CheckIn => ({ day: '2026-11-23', ...blank(), ...o });

test('one check-in is not enough to call a pattern', () => {
  const p = pattern([ci({ green: ['Keeps their word'] })]);
  expect(p.read).toBe('not-enough');
  expect(headline(p, 'Gym guy').text).toMatch(/Early days with Gym guy/);
});

test('green pattern: green flags, feeling better after, words matching actions, boundaries kept', () => {
  const good = ci({ before: 3, after: 5, green: ['Keeps their word', 'Makes plans ahead'], words: { said: 'See you Friday', did: 'Turned up', matched: true }, boundaries: { 'No calls after 11pm': 'kept' } });
  const p = pattern([good, good, good]);
  expect(p.read).toBe('green');
  expect(p.feelShift).toBe(2);
  expect(p.wordsMatch).toBe(1);
  expect(p.boundariesKept).toBe(1);
  expect(feelLine(p.feelShift)).toMatch(/better after/);
  expect(suggestAfterHours(p)).toBe(true);
});

test('red pattern: red flags, feeling worse, broken promises, crossed boundaries', () => {
  const bad = ci({ before: 4, after: 2, red: ['Cancels last minute, often'], words: { said: 'I will call', did: 'Ghosted', matched: false }, boundaries: { 'No last-minute plans': 'crossed' } });
  const p = pattern([bad, bad]);
  expect(p.read).toBe('red');
  expect(headline(p, 'X').text).toBe('The pattern says: protect your peace.');
  expect(questions(p).length).toBeGreaterThan(1);
  expect(suggestAfterHours(p)).toBe(false);
});

test('mixed signals in between', () => {
  const p = pattern([ci({ green: ['Asks about my day'], yellow: ['Slow to reply'] }), ci({ yellow: ['Vague about plans'], green: ['Consistent texting'] })]);
  expect(p.read).toBe('mixed');
});

test('feeling unsafe always comes first', () => {
  const p = pattern([ci({ green: ['Keeps their word'], red: ['I feel unsafe'], after: 5 })]);
  expect(p.safety).toBe(true);
  expect(p.read).toBe('red');
  expect(headline(p, 'X').emoji).toBe('🛑');
});

test('the pattern looks at recent check-ins', () => {
  const bad = ci({ red: ['Ignores my boundaries'], before: 4, after: 1 });
  const good = ci({ green: ['Keeps their word', 'Supports my goals'], before: 3, after: 5 });
  expect(pattern([bad, bad, good, good, good, good, good, good]).read).toBe('green');
});
