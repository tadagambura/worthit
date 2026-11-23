// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { addDays, addMonths, diffDays, isDayKey, range, startOfWeek, weekday } from '../dates';
import { formatGBP, parseGBP, splitEvenly, toInput } from '../money';
import { computeStreak, streakMessage } from '../streak';
import { contrast, makePalettes, THEMES } from '../themes';
import { optionOrder } from '../cards';

describe('dates', () => {
  test('adds days across month, year and BST boundaries', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // clocks go forward 29 Mar
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // clocks go back 25 Oct
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  test('diffDays and range', () => {
    expect(diffDays('2026-11-23', '2026-12-15')).toBe(22);
    expect(diffDays('2026-12-15', '2026-11-23')).toBe(-22);
    expect(range('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
  });
  test('weeks start on Monday', () => {
    expect(weekday('2026-11-23')).toBe(1);
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
  });
  test('addMonths clamps to the end of short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1, 31)).toBe('2026-02-28');
    expect(addMonths('2026-02-28', 1, 31)).toBe('2026-03-31');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
  });
  test('validates day keys', () => {
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-2-3')).toBe(false);
    expect(isDayKey('2026-11-23')).toBe(true);
  });
});

describe('money', () => {
  test('parses what people type', () => {
    expect(parseGBP('12')).toBe(1200);
    expect(parseGBP('12.5')).toBe(1250);
    expect(parseGBP('£1,234.56')).toBe(123456);
    expect(parseGBP(' 0.07 ')).toBe(7);
    expect(parseGBP('12.345')).toBeNull();
    expect(parseGBP('abc')).toBeNull();
    expect(parseGBP('')).toBeNull();
    expect(parseGBP('-5')).toBeNull();
  });
  test('formats pence', () => {
    expect(formatGBP(123456)).toBe('£1,234.56');
    expect(formatGBP(500, { whole: true })).toBe('£5');
    expect(formatGBP(-250)).toBe('−£2.50');
    expect(formatGBP(250, { sign: true })).toBe('+£2.50');
    expect(toInput(1250)).toBe('12.50');
    expect(toInput(1200)).toBe('12');
  });
  test('splits evenly without losing a penny', () => {
    const parts = splitEvenly(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe('streak engine', () => {
  const start = '2026-11-01';
  const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

  test('counts consecutive days and leaves today pending', () => {
    const s = computeStreak({ done: days(start, 5), start, today: '2026-11-06' });
    expect(s.current).toBe(5);
    expect(s.status).toBe('pending');
    expect(s.doneToday).toBe(false);
  });

  test('a missed day with no freeze starts repair mode, not a reset', () => {
    const done = [...days(start, 4), '2026-11-06']; // missed the 5th
    const s = computeStreak({ done, start, today: '2026-11-06' });
    expect(s.status).toBe('repairing');
    expect(s.repair).toEqual({ remaining: 2, restores: 4 });
    expect(streakMessage(s)).toBe('Repair mode: 2 days more to bring back your 4-day streak.');
  });

  test('repair restores the old streak after three days in a row', () => {
    const done = [...days(start, 4), ...days('2026-11-06', 3)];
    const s = computeStreak({ done, start, today: '2026-11-08' });
    expect(s.status).toBe('done');
    expect(s.current).toBe(7);
    expect(s.repairedDays).toEqual(['2026-11-05']);
  });

  test('freezes are earned every 7 days and auto-apply', () => {
    const done = [...days(start, 7), ...days('2026-11-09', 2)]; // missed the 8th
    const s = computeStreak({ done, start, today: '2026-11-10' });
    expect(s.frozenDays).toEqual(['2026-11-08']);
    expect(s.current).toBe(9);
    expect(s.freezes).toBe(0);
    expect(s.status).toBe('done');
  });

  test('a gap longer than the repair limit starts fresh', () => {
    const done = [...days(start, 3), '2026-11-08'];
    const s = computeStreak({ done, start, today: '2026-11-08' });
    expect(s.status).toBe('done');
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
  });

  test('unscheduled and rest days are neutral', () => {
    // Only Mondays/Wednesdays/Fridays scheduled; 2026-11-02 is a Monday.
    const mwf = (k: string) => [1, 3, 5].includes(weekday(k));
    const done = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'];
    const s = computeStreak({ done, start, today: '2026-11-10', isScheduled: mwf });
    expect(s.current).toBe(4);
    expect(s.status).toBe('rest');
    const withRest = computeStreak({ done: ['2026-11-01', '2026-11-03'], rest: ['2026-11-02'], start, today: '2026-11-03' });
    expect(withRest.current).toBe(2);
  });

  test('missing again mid-repair keeps the new run as the one to save', () => {
    const done = [...days(start, 5), '2026-11-07', '2026-11-09'];
    const s = computeStreak({ done, start, today: '2026-11-09' });
    expect(s.status).toBe('repairing');
    expect(s.repair?.restores).toBe(1);
  });
});

describe('themes', () => {
  test('there are 20 themes with unique ids', () => {
    expect(THEMES).toHaveLength(20);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(20);
  });
  test.each(THEMES.map((t) => [t.id, t] as const))('%s passes WCAG AA in light and dark mode', (_id, t) => {
    const { light, dark } = makePalettes(t);
    for (const p of [light, dark]) {
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.textMuted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primaryText, p.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accentText, p.accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test('quiz options are shuffled per card, stably, as a permutation', () => {
  expect(optionOrder('c01', 3)).toEqual(optionOrder('c01', 3));
  expect([...optionOrder('c07', 3)].sort()).toEqual([0, 1, 2]);
  const firsts = new Set(Array.from({ length: 30 }, (_, i) => optionOrder(`c${i}`, 3)[0]));
  expect(firsts.size).toBe(3);
});
