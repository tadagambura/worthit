// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// 20 interchangeable themes. Each app has a default (see Brand.defaultTheme), and people can switch
// in Settings. Palettes are generated from a hue and then nudged until they pass WCAG AA contrast
// in both light and dark mode, so no theme can ship unreadable text (kit tests enforce this).
import type { Palette } from './theme';

export type ThemeDef = { id: string; name: string; hue: number; sat: number; accentHue: number };

export const THEMES: ThemeDef[] = [
  { id: 'green', name: 'Money green', hue: 152, sat: 70, accentHue: 45 },
  { id: 'forest', name: 'Forest', hue: 130, sat: 45, accentHue: 30 },
  { id: 'sage', name: 'Sage', hue: 155, sat: 22, accentHue: 265 },
  { id: 'mint', name: 'Mint', hue: 165, sat: 60, accentHue: 340 },
  { id: 'turquoise', name: 'Turquoise', hue: 180, sat: 75, accentHue: 15 },
  { id: 'teal', name: 'Teal', hue: 188, sat: 55, accentHue: 25 },
  { id: 'ocean', name: 'Ocean', hue: 205, sat: 75, accentHue: 40 },
  { id: 'sky', name: 'Sky', hue: 215, sat: 80, accentHue: 40 },
  { id: 'navy', name: 'Navy', hue: 225, sat: 60, accentHue: 175 },
  { id: 'indigo', name: 'Indigo', hue: 245, sat: 60, accentHue: 50 },
  { id: 'purple', name: 'Purple', hue: 270, sat: 55, accentHue: 45 },
  { id: 'lavender', name: 'Lavender', hue: 262, sat: 40, accentHue: 330 },
  { id: 'plum', name: 'Plum', hue: 310, sat: 45, accentHue: 35 },
  { id: 'pink', name: 'Pink', hue: 330, sat: 75, accentHue: 45 },
  { id: 'rose', name: 'Rose', hue: 345, sat: 60, accentHue: 160 },
  { id: 'burgundy', name: 'Burgundy', hue: 348, sat: 55, accentHue: 40 },
  { id: 'coral', name: 'Coral', hue: 8, sat: 75, accentHue: 190 },
  { id: 'sunset', name: 'Sunset', hue: 22, sat: 85, accentHue: 45 },
  { id: 'mustard', name: 'Mustard', hue: 42, sat: 80, accentHue: 220 },
  { id: 'slate', name: 'Slate', hue: 215, sat: 12, accentHue: 25 },
];

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
  const { hue: h, sat: s, accentHue: ah } = t;
  const lightBg = hsl(h, Math.min(40, s), 97);
  const lightText = hsl(h, 30, 10);
  const lightPrimary = fit(h, s, 42, '#FFFFFF', 4.6, -1);
  const lightAccent = fit(ah, 80, 52, lightText, 4.6, 1);
  const light: Palette = {
    bg: lightBg,
    surface: '#FFFFFF',
    surfaceAlt: hsl(h, Math.min(45, s), 92),
    text: lightText,
    textMuted: fit(h, 12, 40, lightBg, 4.8, -1),
    border: hsl(h, Math.min(30, s), 85),
    primary: lightPrimary,
    primaryText: '#FFFFFF',
    accent: lightAccent,
    accentText: lightText,
    focus: lightPrimary,
    ...FIXED.light,
  };
  const darkBg = hsl(h, Math.min(28, s), 7);
  const darkText = hsl(h, 30, 94);
  const darkPrimaryText = hsl(h, 45, 9);
  const darkPrimary = fit(h, Math.min(80, s + 10), 68, darkPrimaryText, 4.8, 1);
  const dark: Palette = {
    bg: darkBg,
    surface: hsl(h, Math.min(24, s), 11),
    surfaceAlt: hsl(h, Math.min(22, s), 16),
    text: darkText,
    textMuted: fit(h, 14, 66, darkBg, 4.8, 1),
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
