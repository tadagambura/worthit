// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Ads for apps. Read kit/ADS.md. Everything an app needs:
//   <Screen banner={<AdBanner placement="stats_banner" />}>        a sticky banner above the tab bar
//   const adBreak = useAdBreak(); await adBreak('deck_break');     an interstitial at a natural break
//   const offer = useRewardedAd('arcade_double');                  an opt-in rewarded ad
//   <NativeAdCard placement="learn_native" />                      a labelled native ad in a list
// <AdsProvider> is already inside <KitRoot>. Premium users never see third-party ads.
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { track } from '../analytics';
import { TEST_MODE } from '../env';
import { PaywallSheet } from '../Paywall';
import { prefsStore } from '../prefs';
import { usePremium } from '../premium';
import { useTheme } from '../theme';
import { swatch } from '../themes';
import { HOUSE_APPS, pickHouseApp } from './config';
import { AdsManager } from './manager';
import { sdk } from './sdk';
import type { SdkEvent } from './sdk.types';
import { envUnits } from './units';
import { SdkBanner, SdkNative, viewsSupported } from './views';

const PLATFORM = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
/** Shows dashed placeholders where ads go, on web, for checking placements: EXPO_PUBLIC_ADS_PREVIEW=1. */
const PREVIEW = process.env.EXPO_PUBLIC_ADS_PREVIEW === '1';

let shared: AdsManager | null = null;

/** One manager per app process. */
export function adsFor(app: string): AdsManager {
  if (shared && shared.app === app) return shared;
  shared = new AdsManager(app, {
    sdk,
    testMode: TEST_MODE,
    platform: PLATFORM,
    units: envUnits(PLATFORM),
    testDeviceIds: (process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICES ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
    debugEEA: TEST_MODE && process.env.EXPO_PUBLIC_ADS_DEBUG_EEA === '1',
    testPolicy: TEST_MODE ? parseTestPolicy(process.env.EXPO_PUBLIC_ADS_TEST_POLICY) : null,
  });
  return shared;
}

/** EXPO_PUBLIC_ADS_TEST_POLICY='{"minInstallHoursForFullscreen":0,"minSessionsForFullscreen":2}' (test builds only). */
function parseTestPolicy(raw: string | undefined) {
  try {
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

const Ctx = createContext<AdsManager | null>(null);
const Installed = createContext<ReadonlySet<string>>(new Set());

export function AdsProvider({ app, children }: { app: string; children: ReactNode }) {
  const m = adsFor(app);
  const { isPremium, ready } = usePremium();
  // Named like a hook so the React Compiler treats it as one (an inline call got cached and crashed with #311).
  const usePrefs = prefsStore(app);
  const onboarded = usePrefs((s) => s.onboarded);
  const [installed, setInstalled] = useState<ReadonlySet<string>>(new Set());
  const live = useAdsValue(m, (x) => x.cfg.live, {});

  useEffect(() => {
    if (ready) m.setPremium(isPremium);
  }, [m, ready, isPremium]);

  // Consent and ads start after onboarding, so the first thing anyone sees is the app, not a form.
  useEffect(() => {
    if (ready && !isPremium && onboarded) void m.start();
  }, [m, ready, isPremium, onboarded]);

  useEffect(() => {
    if (PLATFORM === 'web') return;
    const state = AppState.addEventListener('change', (s) => {
      if (s === 'background') m.onBackground();
      // A beat later, so a notification tap or deep link is known before deciding on an app-open ad.
      else if (s === 'active') setTimeout(() => void m.onForeground(), 800);
    });
    const link = Linking.addEventListener('url', () => m.markEntry('link'));
    const note = Notifications.addNotificationResponseReceivedListener(() => m.markEntry('notification'));
    return () => {
      state.remove();
      link.remove();
      note.remove();
    };
  }, [m]);

  // Which live KC apps are already on this phone, so cross-promotion skips them.
  const liveKey = Object.keys(live).sort().join(',');
  useEffect(() => {
    if (PLATFORM === 'web' || !liveKey) return;
    let alive = true;
    const slugs = liveKey.split(',').filter((s) => s !== app);
    Promise.all(slugs.map((s) => Linking.canOpenURL(`${s}://`).then((ok) => (ok ? s : null), () => null))).then((found) => {
      if (alive) setInstalled(new Set(found.filter((s): s is string => !!s)));
    });
    return () => {
      alive = false;
    };
  }, [liveKey, app]);

  return (
    <Ctx.Provider value={m}>
      <Installed.Provider value={installed}>{children}</Installed.Provider>
    </Ctx.Provider>
  );
}

/** The ads manager. Null outside <AdsProvider>. Read live values with useAdsValue, never m.x() in render. */
export function useAds(): AdsManager | null {
  return useContext(Ctx);
}
const noopSub = () => () => {};

/**
 * A live value from the manager, as a store snapshot. The manager is a mutable object, so
 * reading it during render (m.rewardedReady(…)) gets memoised by the React Compiler and goes
 * stale. Snapshots must be primitives or stable references.
 */
export function useAdsValue<T>(m: AdsManager | null, read: (m: AdsManager) => T, fallback: T): T {
  const get = () => (m ? read(m) : fallback);
  return useSyncExternalStore(m?.subscribe ?? noopSub, get, get);
}

/**
 * Returns a function to call at a natural break: a finished round, deck or quiz, never in the
 * middle of a task or after a failure. It resolves once any ad has closed (or straight away).
 */
export function useAdBreak() {
  const m = useContext(Ctx);
  return useCallback((placement: string, outcome: 'success' | 'failure' | 'neutral' = 'success') => (m ? m.atBreak(placement, outcome) : Promise.resolve(false)), [m]);
}

/** An opt-in rewarded ad. Show the offer only while `ready`; `show()` resolves with whether the reward was earned. */
export function useRewardedAd(placement: string) {
  const m = useAds();
  const allowed = useAdsValue(m, (x) => x.rewardedAllowed(placement), false);
  const ready = useAdsValue(m, (x) => x.rewardedReady(placement), false);
  useEffect(() => {
    if (m && allowed) m.prepare(placement);
  }, [m, allowed, placement]);
  const show = useCallback(async () => (m ? m.showRewarded(placement) : { earned: false }), [m, placement]);
  return { ready, allowed, show };
}

// ---------- house ads (KC cross-promotion and Premium) ----------

/** Store link with attribution, so installs from cross-promotion can be counted. */
export function withRef(url: string, from: string, placement: string): string {
  const sep = url.includes('?') ? '&' : '?';
  if (url.includes('play.google.com')) return `${url}${sep}referrer=${encodeURIComponent(`utm_source=kc_${from}&utm_medium=house_ad&utm_campaign=${placement}`)}`;
  if (url.includes('apps.apple.com')) return `${url}${sep}ct=kc_${from}_${placement}`.slice(0, 2048);
  return url;
}

function HouseStrip({ app, placement, height, seed }: { app: string; placement: string; height: number; seed: number }) {
  const { c, radius } = useTheme();
  const m = useContext(Ctx);
  const installed = useContext(Installed);
  const [paywall, setPaywall] = useState(false);
  const live = useAdsValue(m, (x) => x.cfg.live, {});
  const pick = PLATFORM !== 'web' ? pickHouseApp(app, live, installed, seed, PLATFORM) : null;
  useEffect(() => {
    if (pick) track('house_ad_impression', { target: pick.slug, placement });
  }, [pick?.slug, placement]);

  if (pick) {
    return (
      <Pressable
        onPress={() => {
          track('house_ad_click', { target: pick.slug, placement });
          void Linking.openURL(withRef(pick.url, app, placement));
        }}
        accessibilityRole="link"
        accessibilityLabel={`From Kaotic Chainz: ${pick.name}. ${pick.line}`}
        style={[styles.strip, { height, borderRadius: radius, backgroundColor: c.surfaceAlt }]}
        testID="house-ad"
      >
        <View style={[styles.emoji, { backgroundColor: swatch(pick.theme) }]}>
          <Text style={{ fontSize: 20 }}>{pick.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '800' }} numberOfLines={1}>
            {pick.name}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
            {pick.line}
          </Text>
        </View>
        <Text style={{ color: c.textMuted, fontSize: 10 }}>KC app</Text>
      </Pressable>
    );
  }
  // No other KC app to suggest yet: the space promotes going ad-free instead.
  return (
    <>
      <Pressable onPress={() => setPaywall(true)} accessibilityRole="button" accessibilityLabel="Go ad-free with Premium" style={[styles.strip, { height, borderRadius: radius, backgroundColor: c.surfaceAlt }]} testID="house-premium">
        <Text style={{ fontSize: 20 }}>✨</Text>
        <Text style={{ color: c.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          Go ad-free with Premium
        </Text>
        <Text style={{ color: c.primary, fontWeight: '800' }}>See plans</Text>
      </Pressable>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} reason="Premium removes every ad, in every corner of the app." />
    </>
  );
}

// ---------- banner ----------

const RESERVED = 60;

/**
 * A sticky anchored adaptive banner. Its space is reserved from the first frame, so nothing
 * jumps when the ad arrives. If no ad comes back, the space shows a KC house ad instead.
 * Put it in <Screen banner={…}>, never next to buttons people tap a lot.
 */
export function AdBanner({ placement }: { placement: string }) {
  const m = useAds();
  const slot = useAdsValue(m, (x) => x.inlineSlot(placement), false);
  const liveUnit = useAdsValue(m, (x) => x.inlineUnit(placement), null);
  const { c, brand } = useTheme();
  const [height, setHeight] = useState(RESERVED);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1000));
  const onEvent = useCallback(
    (e: SdkEvent) => {
      m?.inlineEvent(placement, 'banner', e);
      if (e.type === 'loaded') setLoaded(true);
      if (e.type === 'failed') {
        setLoaded(false);
        // Retry with backoff (20s, 40s, 80s), showing the house ad meanwhile.
        if (attempt < (m?.cfg.policy.maxRetries ?? 3)) setTimeout(() => setAttempt((a) => a + 1), 20e3 * 2 ** attempt);
        else setGaveUp(true);
      }
    },
    [m, placement, attempt],
  );

  if (!m || !slot) return null;
  if (!viewsSupported) {
    return PREVIEW ? <View style={[styles.preview, { height: RESERVED, borderColor: c.border }]}><Text style={{ color: c.textMuted }}>{`Ad · ${placement}`}</Text></View> : null;
  }
  const unit = gaveUp ? null : liveUnit;
  return (
    <View style={{ height: height + 10, paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, backgroundColor: c.bg, alignItems: 'center' }} testID={`ad-${placement}`}>
      {unit ? <SdkBanner key={attempt} unitId={unit} npa={m.npa} onEvent={onEvent} onHeight={(h) => h > 0 && setHeight(h)} /> : null}
      {!loaded ? (
        <View style={[StyleSheet.absoluteFill, { top: 5, bottom: 5, paddingHorizontal: 12 }]}>
          <HouseStrip app={brand.slug} placement={placement} height={height} seed={seed} />
        </View>
      ) : null}
    </View>
  );
}

// ---------- native ----------

/** A native ad card for lists. Labelled "Ad", visually set apart, at most one per screen. Renders nothing until filled. */
export function NativeAdCard({ placement }: { placement: string }) {
  const m = useAds();
  const unit = useAdsValue(m, (x) => x.inlineUnit(placement), null);
  const [failed, setFailed] = useState(false);
  const onEvent = useCallback(
    (e: SdkEvent) => {
      m?.inlineEvent(placement, 'native', e);
      if (e.type === 'failed') setFailed(true);
    },
    [m, placement],
  );
  if (!m || !viewsSupported || failed || !unit) return null;
  return <SdkNative unitId={unit} npa={m.npa} onEvent={onEvent} />;
}

// ---------- Settings ----------

/** Rows for KitSettings: ad choices (UK GDPR), report an ad (App Store 2.5.18), and test-build tools. */
export function useAdSettings() {
  const m = useAds();
  const { isPremium } = usePremium();
  const hasPlacements = useAdsValue(m, (x) => Object.keys(x.cfg.placements).length > 0, false);
  const privacyRequired = useAdsValue(m, (x) => x.consent.privacyOptionsRequired, false);
  const version = useAdsValue(m, (x) => x.getVersion(), 0);
  // Web never loads ads, so there's nothing to choose, report or remove there.
  if (!m || !sdk.supported || !hasPlacements) return null;
  return {
    showAdsRow: !isPremium,
    privacyRequired,
    showPrivacyOptions: () => m.showPrivacyOptions(),
    inspector: TEST_MODE && sdk.supported ? () => m.openInspector() : null,
    debug: TEST_MODE ? m.debug(version) : null,
  };
}

export { HOUSE_APPS };

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  emoji: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  preview: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', margin: 4 },
});
