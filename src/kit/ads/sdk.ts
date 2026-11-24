// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Web and test stand-in for the ads SDK: Google Mobile Ads doesn't run on web, so nothing
// third-party is ever requested here. Phones use sdk.native.ts.
import type { AdSdk } from './sdk.types';

export const sdk: AdSdk = {
  supported: false,
  gatherConsent: async () => ({ canRequestAds: false, privacyOptionsRequired: false }),
  showPrivacyOptions: async () => ({ canRequestAds: false, privacyOptionsRequired: false }),
  initialize: async () => {},
  createFullscreen: () => ({ load: () => {}, show: () => Promise.reject(new Error('Ads are not supported here')), destroy: () => {} }),
  openInspector: async () => {},
};
