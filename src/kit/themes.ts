// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// 20 interchangeable themes. Each app has a default (see Brand.defaultTheme), and people can switch
// in Settings. Six are free in every app (freeThemes); the rest come with Premium. The theme also
// picks the app icon colour where the phone supports alternate icons (appIcon.ts). Palettes are generated from a hue and then nudged until they pass WCAG AA contrast
// in both light and dark mode, so no theme can ship unreadable text (kit tests enforce this).
import type { Palette } from './theme';

export type ThemeDef = {
  id: string;
  name: string;
  hue: number;
  sat: number;
  accentHue: number;
  /** Light-mode primary lightness to start from (lower = deeper colour). */
  depth?: number;
  /** Buttons use dark text on a bright colour (gold, lime) instead of white text on a deep one. */
  ink?: boolean;
  /** Black and White ignore the phone's light/dark setting: Black is always dark, White always light. */
  mono?: 'black' | 'white';
};

/** The 20 Kaotic Chainz themes. Ids are stable (saved in prefs and used for app icon names). */
export const THEMES: ThemeDef[] = [
  { id: 'green', name: 'Deep green', hue: 152, sat: 70, accentHue: 45, depth: 30 },
  { id: 'purple', name: 'Deep purple', hue: 272, sat: 60, accentHue: 45, depth: 36 },
  { id: 'pink', name: 'Pink', hue: 330, sat: 78, accentHue: 45 },
  { id: 'turquoise', name: 'Turquoise', hue: 178, sat: 80, accentHue: 15 },
  { id: 'orange', name: 'Orange', hue: 26, sat: 90, accentHue: 200 },
  { id: 'brown', name: 'Brown', hue: 25, sat: 45, accentHue: 40, depth: 30 },
  { id: 'black', name: 'Black', hue: 0, sat: 0, accentHue: 45, mono: 'black' },
  { id: 'white', name: 'White', hue: 0, sat: 0, accentHue: 210, mono: 'white' },
  { id: 'gold', name: 'Gold', hue: 44, sat: 88, accentHue: 270, ink: true },
  { id: 'gray', name: 'Gray', hue: 210, sat: 6, accentHue: 25 },
  { id: 'navy', name: 'Navy', hue: 224, sat: 62, accentHue: 45, depth: 28 },
  { id: 'burgundy', name: 'Burgundy', hue: 345, sat: 60, accentHue: 40, depth: 30 },
  { id: 'sky', name: 'Sky blue', hue: 205, sat: 85, accentHue: 40 },
  { id: 'red', name: 'Red', hue: 4, sat: 78, accentHue: 45 },
  { id: 'lime', name: 'Lime', hue: 84, sat: 80, accentHue: 290, ink: true },
  { id: 'lavender', name: 'Lavender', hue: 258, sat: 45, accentHue: 330 },
  { id: 'magenta', name: 'Magenta', hue: 300, sat: 65, accentHue: 50 },
  { id: 'mint', name: 'Mint', hue: 162, sat: 55, accentHue: 340, ink: true },
  { id: 'coral', name: 'Coral', hue: 10, sat: 85, accentHue: 190, ink: true },
  { id: 'indigo', name: 'Indigo', hue: 240, sat: 65, accentHue: 50 },
];

/** Old theme ids from earlier builds, mapped to their closest current theme. */
export const RENAMED: Record<string, string> = {
  forest: 'green',
  sage: 'mint',
  teal: 'turquoise',
  ocean: 'sky',
  plum: 'magenta',
  rose: 'pink',
  sunset: 'orange',
  mustard: 'gold',
  slate: 'gray',
  original: 'green',
};

export function currentThemeId(id: string | undefined): string | undefined {
  if (!id) return id;
  return RENAMED[id] ?? id;
}

/** Six themes are free in every app: the app's own default plus these, in this order. */
export const FREE_THEME_BASE = ['black', 'white', 'gray', 'navy', 'sky', 'green'];
export const FREE_THEME_COUNT = 6;

export function freeThemes(defaultTheme: string): string[] {
  return [defaultTheme, ...FREE_THEME_BASE.filter((id) => id !== defaultTheme)].slice(0, FREE_THEME_COUNT);
}

export function themeIsFree(id: string, defaultTheme: string): boolean {
  return freeThemes(defaultTheme).includes(id);
}

/** The theme actually shown: the chosen one if allowed, otherwise the app default. The choice is kept. */
export function effectiveTheme(chosen: string | undefined, defaultTheme: string, premium: boolean): string {
  const id = currentThemeId(chosen) ?? defaultTheme;
  if (!THEMES.some((t) => t.id === id)) return defaultTheme;
  return premium || themeIsFree(id, defaultTheme) ? id : defaultTheme;
}

// ---------- colour maths ----------

function hsl(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Darken (or lighten) a colour along lightness until it reaches the target contrast against `against`. */
function fit(h: number, s: number, l: number, against: string, target: number, dir: -1 | 1): string {
  let col = hsl(h, s, l);
  while (contrast(col, against) < target && l > 2 && l < 98) {
    l += dir;
    col = hsl(h, s, l);
  }
  return col;
}

const FIXED = {
  light: { success: '#1B7A35', warning: '#8A5300', danger: '#B3261E' },
  dark: { success: '#7FD99A', warning: '#F3B44C', danger: '#FF8A80' },
};

export function makePalettes(t: ThemeDef): { light: Palette; dark: Palette } {
  if (t.mono) return monoPalettes(t);
  const { hue: h, sat: s, accentHue: ah } = t;
  const lightBg = hsl(h, Math.min(40, s), 97);
  const lightText = hsl(h, 30, 10);
  const lightPrimary = t.ink ? fit(h, s, 52, lightText, 4.8, 1) : fit(h, s, t.depth ?? 42, '#FFFFFF', 4.6, -1);
  const lightPrimaryText = t.ink ? lightText : '#FFFFFF';
  const lightAccent = fit(ah, 80, 52, lightText, 4.6, 1);
  const light: Palette = {
    bg: lightBg,
    surface: '#FFFFFF',
    surfaceAlt: hsl(h, Math.min(45, s), 92),
    text: lightText,
    textMuted: fit(h, Math.min(12, s), 40, lightBg, 4.8, -1),
    border: hsl(h, Math.min(30, s), 85),
    primary: lightPrimary,
    primaryText: lightPrimaryText,
    accent: lightAccent,
    accentText: lightText,
    focus: t.ink ? lightText : lightPrimary,
    ...FIXED.light,
  };
  const darkBg = hsl(h, Math.min(28, s), 7);
  const darkText = hsl(h, Math.min(30, s), 94);
  const darkPrimaryText = hsl(h, Math.min(45, s), 9);
  const darkPrimary = fit(h, Math.min(80, s + 10), 68, darkPrimaryText, 4.8, 1);
  const dark: Palette = {
    bg: darkBg,
    surface: hsl(h, Math.min(24, s), 11),
    surfaceAlt: hsl(h, Math.min(22, s), 16),
    text: darkText,
    textMuted: fit(h, Math.min(14, s), 66, darkBg, 4.8, 1),
    border: hsl(h, Math.min(20, s), 23),
    primary: darkPrimary,
    primaryText: darkPrimaryText,
    accent: fit(ah, 80, 66, darkPrimaryText, 4.8, 1),
    accentText: darkPrimaryText,
    focus: darkPrimary,
    ...FIXED.dark,
  };
  return { light, dark };
}

function monoPalettes(t: ThemeDef): { light: Palette; dark: Palette } {
  if (t.mono === 'white') {
    const p: Palette = {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#F2F2F2',
      text: '#111111',
      textMuted: '#555555',
      border: '#DDDDDD',
      primary: '#1A1A1A',
      primaryText: '#FFFFFF',
      accent: fit(t.accentHue, 80, 52, '#111111', 4.6, 1),
      accentText: '#111111',
      focus: '#1A1A1A',
      ...FIXED.light,
    };
    return { light: p, dark: p };
  }
  const p: Palette = {
    bg: '#000000',
    surface: '#0E0E0E',
    surfaceAlt: '#1A1A1A',
    text: '#F5F5F5',
    textMuted: '#A8A8A8',
    border: '#2A2A2A',
    primary: '#FFFFFF',
    primaryText: '#000000',
    accent: fit(t.accentHue, 85, 60, '#000000', 4.8, 1),
    accentText: '#000000',
    focus: '#FFFFFF',
    ...FIXED.dark,
  };
  return { light: p, dark: p };
}

/** Black is always dark and White always light, whatever the phone is set to. */
export function forcedScheme(id: string): 'dark' | 'light' | null {
  const t = THEMES.find((x) => x.id === id);
  return t?.mono === 'black' ? 'dark' : t?.mono === 'white' ? 'light' : null;
}

/** The colour that represents a theme in pickers, on the website and on the app icon. */
export function swatch(id: string): string {
  const t = THEMES.find((x) => x.id === id);
  if (!t) return '#888888';
  if (t.mono === 'black') return '#111111';
  if (t.mono === 'white') return '#FFFFFF';
  return palettesFor(id)!.light.primary;
}

const cache = new Map<string, { light: Palette; dark: Palette }>();
export function palettesFor(id: string): { light: Palette; dark: Palette } | null {
  const def = THEMES.find((t) => t.id === id);
  if (!def) return null;
  let p = cache.get(id);
  if (!p) {
    p = makePalettes(def);
    cache.set(id, p);
  }
  return p;
}
