// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Types for KC Ads. Read kit/ADS.md first.

export type AdFormat = 'banner' | 'native' | 'interstitial' | 'rewarded' | 'rewarded_interstitial' | 'app_open';
export type FullscreenFormat = 'interstitial' | 'rewarded' | 'rewarded_interstitial' | 'app_open';

export const isFullscreen = (f: AdFormat): f is FullscreenFormat => f !== 'banner' && f !== 'native';
export const isRewarded = (f: AdFormat) => f === 'rewarded' || f === 'rewarded_interstitial';

/** One place in one app where an ad can appear. Ad units are made per app and placement. */
export type Placement = {
  format: AdFormat;
  enabled: boolean;
  /** Interstitials at a natural break: show on every Nth break at most (1 = every break). */
  everyNth?: number;
  /** Rewarded: most views of this placement per day. */
  dailyCap?: number;
};

/** Frequency rules. Portfolio defaults live in config.ts; apps and remote config can tune them within SAFE_BOUNDS. */
export type AdPolicy = {
  /** No interstitial or app-open ad until this session number (1 = from the first session). */
  minSessionsForFullscreen: number;
  /** …and not until this many hours after install. */
  minInstallHoursForFullscreen: number;
  /** No interstitial in the first N seconds of a session. */
  sessionGraceSeconds: number;
  /** Minimum gap between full-screen ads (interstitial or app open). */
  interstitialGapSeconds: number;
  maxFullscreenPerSession: number;
  maxFullscreenPerDay: number;
  /** After someone watches a rewarded ad, no interstitial for this long. */
  rewardedCooldownSeconds: number;
  maxRewardedPerDay: number;
  /** Someone back after this many days away gets a session with no full-screen ads. */
  lapsedDays: number;
  appOpen: {
    minInstallDays: number;
    minSessions: number;
    /** Only when the app comes back after at least this long in the background. */
    minBackgroundMinutes: number;
    maxPerDay: number;
    /** No app-open ad within this long of any other full-screen ad. */
    gapAfterFullscreenSeconds: number;
  };
  /** Give up on a load after this long (the app never waits for it). */
  loadTimeoutSeconds: number;
  /** Retries after a failed or empty load, with exponential backoff. */
  maxRetries: number;
};

/**
 * Who the app is for. 'family' means children may see the screen: requests are tagged for
 * child-directed treatment, non-personalised and G-rated (Google Families policy, UK Children's Code).
 */
export type Audience = 'adult' | 'general' | 'family';

export type ContentRating = 'G' | 'PG' | 'T' | 'MA';

export type AppAds = {
  enabled: boolean;
  audience: Audience;
  maxRating: ContentRating;
  /** Only ever request non-personalised ads, whatever the consent. */
  npaOnly: boolean;
  /** iOS: allowed to ask for tracking permission (ATT) through the UMP IDFA message. */
  tracking: boolean;
  placements: Record<string, Placement>;
  policy?: DeepPartial<AdPolicy>;
};

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** An A/B test. Variants are assigned by a stable hash of the install id. */
export type Experiment = {
  id: string;
  /** Slugs, or '*' for every app. */
  apps: string[] | '*';
  variants: { id: string; weight: number; policy?: DeepPartial<AdPolicy>; placements?: Record<string, Partial<Placement>> }[];
};

/** kaoticchainz.com/ads/config.json. Everything is optional; values are clamped on the device. */
export type RemoteAdsConfig = {
  version: number;
  /** Global kill switch. */
  enabled?: boolean;
  policy?: DeepPartial<AdPolicy>;
  apps?: Record<string, { enabled?: boolean; policy?: DeepPartial<AdPolicy>; placements?: Record<string, Partial<Placement>> }>;
  experiments?: Experiment[];
  /** KC apps that are live in the stores, with their store links, so other apps can promote them. */
  live?: Record<string, { ios?: string; android?: string }>;
};

/** The config an app actually runs with, after remote overrides and its experiment variant. */
export type ResolvedAds = {
  app: string;
  enabled: boolean;
  audience: Audience;
  maxRating: ContentRating;
  npaOnly: boolean;
  tracking: boolean;
  placements: Record<string, Placement>;
  policy: AdPolicy;
  /** "experiment:variant" pairs, for analytics. Empty when not in a test. */
  variants: string[];
  live: Record<string, { ios?: string; android?: string }>;
};

/** Persisted counters the frequency rules read. */
export type AdCounters = {
  installAt: number;
  sessions: number;
  /** When the app was last in use (for lapsed-user detection). */
  lastActiveAt: number;
  day: string;
  fullscreenToday: number;
  appOpenToday: number;
  rewardedToday: number;
  /** Rewarded views per placement today. */
  placementToday: Record<string, number>;
  /** Natural breaks reached per placement, lifetime (drives everyNth). */
  breaks: Record<string, number>;
  lastFullscreenAt: number;
  lastRewardedAt: number;
};

/** In-memory state for the current session. */
export type SessionState = {
  startedAt: number;
  fullscreen: number;
  /** Came back after lapsedDays or more away. */
  lapsed: boolean;
};

/** How the user got into the app this time (Duolingo-style entry point). */
export type EntryPoint = 'launcher' | 'notification' | 'link';

export type BlockReason =
  | 'disabled'
  | 'unknown_placement'
  | 'premium'
  | 'no_consent'
  | 'after_failure'
  | 'new_user'
  | 'lapsed_user'
  | 'session_grace'
  | 'too_soon'
  | 'rewarded_cooldown'
  | 'session_cap'
  | 'daily_cap'
  /** The timing model chose to wait for a better moment (only ever after the policy allowed it). */
  | 'smart_hold'
  | 'placement_cap'
  | 'not_nth_break'
  | 'entry_point'
  | 'short_background'
  | 'not_loaded'
  | 'unsupported';

export type Decision = { ok: true } | { ok: false; reason: BlockReason };
