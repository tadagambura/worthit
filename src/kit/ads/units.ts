// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Which ad unit a placement uses.
// - Test builds (dev, EXPO_PUBLIC_TEST_MODE=1): always Google's official test units, so nobody
//   on the team can ever load, see or tap a live ad (invalid traffic gets AdMob accounts banned).
// - Release builds: the app's own units from its EAS environment. A placement without a unit
//   shows no third-party ad (the slot falls back to a KC house ad). Units are never invented.
//
// Env, one JSON object per platform, placement → unit id (kept out of the public repos):
//   EXPO_PUBLIC_ADMOB_UNITS_IOS='{"stats_banner":"ca-app-pub-…/…","arcade_break":"ca-app-pub-…/…"}'
//   EXPO_PUBLIC_ADMOB_UNITS_ANDROID='{…}'
import type { AdFormat } from './types';

/** Google's published test ad units (developers.google.com/admob, also TestIds in the SDK). */
export const GOOGLE_TEST_UNITS: Record<AdFormat, { ios: string; android: string }> = {
  banner: { ios: 'ca-app-pub-3940256099942544/2435281174', android: 'ca-app-pub-3940256099942544/9214589741' },
  native: { ios: 'ca-app-pub-3940256099942544/3986624511', android: 'ca-app-pub-3940256099942544/2247696110' },
  interstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
  rewarded: { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' },
  rewarded_interstitial: { ios: 'ca-app-pub-3940256099942544/6978759866', android: 'ca-app-pub-3940256099942544/5354046379' },
  app_open: { ios: 'ca-app-pub-3940256099942544/5575463023', android: 'ca-app-pub-3940256099942544/9257395921' },
};

const UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;

/** Parses a units env value. Anything that isn't a real-looking AdMob unit id is dropped. */
export function parseUnits(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === 'string' && UNIT.test(v.trim()) && !v.includes('3940256099942544')) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** This build's units for the current platform. Expo inlines EXPO_PUBLIC_* at build time. */
export function envUnits(platform: 'ios' | 'android' | 'web'): Record<string, string> {
  if (platform === 'ios') return parseUnits(process.env.EXPO_PUBLIC_ADMOB_UNITS_IOS);
  if (platform === 'android') return parseUnits(process.env.EXPO_PUBLIC_ADMOB_UNITS_ANDROID);
  return {};
}

export function unitFor(placement: string, format: AdFormat, o: { testMode: boolean; platform: 'ios' | 'android' | 'web'; units?: Record<string, string> }): string | null {
  if (o.platform === 'web') return null;
  if (o.testMode) return GOOGLE_TEST_UNITS[format][o.platform];
  return o.units?.[placement] ?? null;
}
