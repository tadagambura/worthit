// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { applyAppIcon } from './appIcon';
import { prefsStore } from './prefs';
import { usePremiumOptional } from './premium';
import { effectiveTheme, forcedScheme, palettesFor } from './themes';
import { Platform, useColorScheme } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
};

export type Plan = { id: 'yearly' | 'monthly' | 'lifetime'; label: string; price: string; note?: string };

export type Brand = {
  slug: string;
  name: string;
  tagline: string;
  /** Font family names registered with expo-font. Body text uses the system font for readability. */
  fonts: { display: string };
  /** The hand-tuned palette, offered as the "Original" theme. */
  light: Palette;
  dark: Palette;
  /** Default theme id from themes.ts (also used on the website). */
  defaultTheme: string;
  /** Corner radius used by cards and buttons. Part of each app's identity. */
  radius: number;
  /** @deprecated Prices now live in plans.ts and come from the store. Ignored. */
  plans?: Plan[];
  /** What Premium adds in this app (the paywall's right-hand column). */
  premiumPerks: string[];
  /** What stays free forever (the paywall's left-hand column). */
  freeFeatures?: string[];
  privacyUrl: string;
  termsUrl: string;
  supportEmail: string;
};

export type Theme = {
  brand: Brand;
  /** The theme being shown (the chosen one, or the default if the choice needs Premium). */
  themeId: string;
  /** What the person picked, kept even while it's locked so it comes back with Premium. */
  chosenTheme: string | undefined;
  c: Palette;
  dark: boolean;
  radius: number;
  space: (n: number) => number;
  font: { display: string; body: string | undefined };
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  const scheme = useColorScheme();
  const usePrefs = prefsStore(brand.slug);
  const chosen = usePrefs((s) => s.theme);
  const premium = usePremiumOptional()?.isPremium ?? false;
  const themeId = effectiveTheme(chosen, brand.defaultTheme, premium);
  const dark = (forcedScheme(themeId) ?? scheme) === 'dark';
  useEffect(() => {
    applyAppIcon(themeId, brand.defaultTheme);
  }, [themeId, brand.defaultTheme]);
  const theme = useMemo<Theme>(() => {
    const p = palettesFor(themeId) ?? { light: brand.light, dark: brand.dark };
    return {
      brand,
      themeId,
      chosenTheme: chosen,
      c: dark ? p.dark : p.light,
      dark,
      radius: brand.radius,
      space: (n: number) => n * 4,
      font: { display: brand.fonts.display, body: Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined },
    };
  }, [brand, dark, themeId, chosen]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}
