// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Google Mobile Ads (react-native-google-mobile-ads 17) behind the KC Ads contract.
// The library is required lazily, so importing this file never touches native code (tests,
// and screens that render before ads start).
import type * as GMA from 'react-native-google-mobile-ads';
import type { AdSdk, ConsentResult, SdkEvent } from './sdk.types';
import type { FullscreenFormat } from './types';

let cached: typeof GMA | null = null;
export function gma(): typeof GMA {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cached ??= require('react-native-google-mobile-ads') as typeof GMA;
  return cached;
}

function consentResult(info: { canRequestAds: boolean; privacyOptionsRequirementStatus: unknown }): ConsentResult {
  return { canRequestAds: info.canRequestAds, privacyOptionsRequired: info.privacyOptionsRequirementStatus === gma().AdsConsentPrivacyOptionsRequirementStatus.REQUIRED };
}

/** Micros from a paid event: the exact string when the SDK gives one. */
export function paidMicros(p: { value: number; valueMicros?: string | null }): number {
  const exact = p.valueMicros != null ? Number(p.valueMicros) : NaN;
  return Number.isFinite(exact) ? exact : Math.round((p.value || 0) * 1_000_000);
}

export const sdk: AdSdk = {
  supported: true,

  async gatherConsent({ underAgeOfConsent, debugEEA, testDeviceIds }) {
    const { AdsConsent, AdsConsentDebugGeography } = gma();
    try {
      // Every launch, as Google requires. Shows the UK/EEA form only when it's needed.
      const info = await AdsConsent.gatherConsent({
        tagForUnderAgeOfConsent: underAgeOfConsent,
        testDeviceIdentifiers: testDeviceIds,
        ...(debugEEA ? { debugGeography: AdsConsentDebugGeography.EEA } : {}),
      });
      return consentResult(info);
    } catch (e) {
      // A form error mustn't block the app. Google: still try to request ads if a previous session allowed it.
      try {
        return { ...consentResult(await AdsConsent.getConsentInfo()), error: String((e as Error)?.message ?? e) };
      } catch {
        return { canRequestAds: false, privacyOptionsRequired: false, error: String((e as Error)?.message ?? e) };
      }
    }
  },

  async showPrivacyOptions() {
    return consentResult(await gma().AdsConsent.showPrivacyOptionsForm());
  },

  async initialize(rc) {
    const { default: mobileAds, MaxAdContentRating } = gma();
    const rating = { G: MaxAdContentRating.G, PG: MaxAdContentRating.PG, T: MaxAdContentRating.T, MA: MaxAdContentRating.MA }[rc.maxRating];
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: rating,
      tagForChildDirectedTreatment: rc.childDirected,
      // The UMP SDK doesn't pass this on to ad requests, so it's set here too.
      tagForUnderAgeOfConsent: rc.underAgeOfConsent,
      testDeviceIdentifiers: rc.testDeviceIds,
    });
    await mobileAds().initialize();
  },

  createFullscreen(format: FullscreenFormat, unitId: string, npa: boolean, on: (e: SdkEvent) => void) {
    const { InterstitialAd, RewardedAd, RewardedInterstitialAd, AppOpenAd, AdEventType, RewardedAdEventType } = gma();
    const opts = { requestNonPersonalizedAdsOnly: npa };
    const ad =
      format === 'interstitial'
        ? InterstitialAd.createForAdRequest(unitId, opts)
        : format === 'rewarded'
          ? RewardedAd.createForAdRequest(unitId, opts)
          : format === 'rewarded_interstitial'
            ? RewardedInterstitialAd.createForAdRequest(unitId, opts)
            : AppOpenAd.createForAdRequest(unitId, opts);
    const rewarded = format === 'rewarded' || format === 'rewarded_interstitial';
    const network = () => ad.responseInfo?.loadedAdapterResponse?.adSourceName ?? null;

    const off = (ad as unknown as { addAdEventsListener: (l: (e: { type: string; payload: unknown }) => void) => () => void }).addAdEventsListener(({ type, payload }) => {
      switch (type) {
        case AdEventType.LOADED:
        case RewardedAdEventType.LOADED:
          on({ type: 'loaded', network: network() });
          break;
        case AdEventType.ERROR: {
          const err = (payload ?? {}) as { reason?: string; code?: string; phase?: 'load' | 'show' };
          on({ type: 'failed', noFill: err.reason === 'no-fill' || err.reason === 'mediation-no-fill', code: String(err.reason ?? err.code ?? 'unknown'), phase: err.phase ?? 'load' });
          break;
        }
        case AdEventType.IMPRESSION:
          on({ type: 'impression' });
          break;
        case AdEventType.CLICKED:
          on({ type: 'clicked' });
          break;
        case AdEventType.CLOSED:
          on({ type: 'closed' });
          break;
        case AdEventType.PAID: {
          const p = payload as GMA.PaidEvent;
          on({ type: 'paid', micros: paidMicros(p), currency: p.currency, precision: Number(p.precision), network: p.responseInfo?.loadedAdapterResponse?.adSourceName ?? network() });
          break;
        }
        case RewardedAdEventType.EARNED_REWARD:
          if (rewarded) {
            const r = (payload ?? {}) as { amount?: number; type?: string };
            on({ type: 'reward', amount: Number(r.amount ?? 1), kind: String(r.type ?? 'reward') });
          }
          break;
      }
    });

    return {
      load: () => ad.load(),
      show: () => ad.show(),
      destroy: () => {
        off();
        ad.destroy();
      },
    };
  },

  async openInspector() {
    await gma().default().openAdInspector();
  },
};
