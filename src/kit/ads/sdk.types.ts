// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The contract between KC Ads and the Google Mobile Ads SDK. sdk.native.ts implements it on
// phones; sdk.ts is the web/test stand-in. Nothing else in the kit touches the SDK.
import type { ContentRating, FullscreenFormat } from './types';

export type ConsentResult = {
  canRequestAds: boolean;
  /** Show a "Privacy & ad choices" entry in Settings (UMP requirement in the UK/EEA). */
  privacyOptionsRequired: boolean;
  error?: string;
};

export type RequestConfig = {
  maxRating: ContentRating;
  childDirected: boolean;
  underAgeOfConsent: boolean;
  testDeviceIds: string[];
};

export type SdkEvent =
  | { type: 'loaded'; network: string | null }
  | { type: 'failed'; noFill: boolean; code: string; phase: 'load' | 'show' }
  | { type: 'impression' }
  | { type: 'clicked' }
  | { type: 'closed' }
  | { type: 'paid'; micros: number; currency: string; precision: number; network: string | null }
  | { type: 'reward'; amount: number; kind: string };

export type FullscreenAd = {
  load(): void;
  /** Rejects if the ad isn't loaded or the platform refuses to show it. */
  show(): Promise<void>;
  destroy(): void;
};

export type AdSdk = {
  /** False on web and in tests: the kit renders nothing third-party there. */
  supported: boolean;
  gatherConsent(o: { underAgeOfConsent: boolean; debugEEA: boolean; testDeviceIds: string[] }): Promise<ConsentResult>;
  showPrivacyOptions(): Promise<ConsentResult>;
  initialize(rc: RequestConfig): Promise<void>;
  createFullscreen(format: FullscreenFormat, unitId: string, npa: boolean, on: (e: SdkEvent) => void): FullscreenAd;
  /** Google's Ad Inspector, for test builds: shows each ad source and why it did or didn't fill. */
  openInspector(): Promise<void>;
};
