// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Ads configuration: the one place that decides which apps show which ads, and how often.
// Tune the whole portfolio from here (built in) or from kaoticchainz.com/ads/config.json
// (remote, no app update needed). Remote values are clamped to SAFE_BOUNDS, so a typo can
// never flood people with ads or break policy.
import { hashString } from '../arcade/engine';
import type { AdPolicy, AppAds, DeepPartial, Experiment, Placement, RemoteAdsConfig, ResolvedAds } from './types';

export const REMOTE_CONFIG_URL = 'https://kaoticchainz.com/ads/config.json';

/**
 * Portfolio defaults. Ambitious but retention-first:
 * - Full-screen ads only from the 3rd session and a day after install, so people get value first.
 * - Every 3 minutes at most, 3 a session, 8 a day.
 * - Rewarded ads are opt-in and lightly capped.
 */
export const DEFAULT_POLICY: AdPolicy = {
  minSessionsForFullscreen: 3,
  minInstallHoursForFullscreen: 24,
  sessionGraceSeconds: 45,
  interstitialGapSeconds: 180,
  maxFullscreenPerSession: 3,
  maxFullscreenPerDay: 8,
  rewardedCooldownSeconds: 120,
  maxRewardedPerDay: 12,
  lapsedDays: 7,
  appOpen: { minInstallDays: 3, minSessions: 5, minBackgroundMinutes: 30, maxPerDay: 1, gapAfterFullscreenSeconds: 600 },
  loadTimeoutSeconds: 8,
  maxRetries: 3,
};

/** Hard limits on any override (app or remote). [min, max]. */
export const SAFE_BOUNDS = {
  minSessionsForFullscreen: [2, 50],
  minInstallHoursForFullscreen: [0, 720],
  sessionGraceSeconds: [20, 600],
  interstitialGapSeconds: [60, 3600],
  maxFullscreenPerSession: [0, 5],
  maxFullscreenPerDay: [0, 15],
  rewardedCooldownSeconds: [0, 1800],
  maxRewardedPerDay: [0, 30],
  lapsedDays: [2, 60],
  loadTimeoutSeconds: [3, 20],
  maxRetries: [0, 5],
  appOpen: {
    minInstallDays: [1, 60],
    minSessions: [3, 100],
    minBackgroundMinutes: [10, 1440],
    maxPerDay: [0, 2],
    gapAfterFullscreenSeconds: [120, 7200],
  },
  everyNth: [1, 20],
  dailyCap: [0, 20],
} as const;

// ---------- placements shared by every app (wired inside the kit) ----------

/**
 * Arcade: an interstitial between rounds, plus opt-in rewarded ads: "double your coins",
 * a once-a-day bonus, and a revive (continue a round once, never offered after a rigged loss:
 * KC games never change difficulty to sell a revive).
 */
const ARCADE: Record<string, Placement> = {
  arcade_break: { format: 'interstitial', enabled: true, everyNth: 2 },
  arcade_double: { format: 'rewarded', enabled: true, dailyCap: 5 },
  arcade_daily: { format: 'rewarded', enabled: true, dailyCap: 1 },
  arcade_revive: { format: 'rewarded', enabled: true, dailyCap: 5 },
};
/** One native ad in the learning-card library, clearly labelled. */
const LEARN: Record<string, Placement> = { learn_native: { format: 'native', enabled: true } };
/** Declared but off: switched on per app by an experiment, so its retention cost gets measured. */
const APP_OPEN_OFF: Record<string, Placement> = { app_open: { format: 'app_open', enabled: false } };

const banner = (...ids: string[]): Record<string, Placement> => Object.fromEntries(ids.map((id) => [id, { format: 'banner', enabled: true } as Placement]));
const brk = (id: string, everyNth = 1): Record<string, Placement> => ({ [id]: { format: 'interstitial', enabled: true, everyNth } });

/**
 * Per-app ads. The rules each app's `money.Ads` line promises (docs/portfolio.json) are kept:
 * a placement only exists where it's allowed. Screens that must never show ads simply have none.
 */
export const APP_ADS: Record<string, AppAds> = {
  // Banner only on the app's own screens: never on safe-to-spend, deposits or lessons.
  stackup: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('stacks_banner'), ...ARCADE } },
  // Banner on the stats screen only.
  loopday: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('stats_banner'), ...LEARN, ...ARCADE } },
  // Light: stock and sold lists, never on item forms.
  flipped: { enabled: true, audience: 'adult', maxRating: 'T', npaOnly: false, tracking: true, placements: { ...banner('stock_banner', 'sold_banner'), ...LEARN, ...ARCADE } },
  // Leisure sessions: the best inventory in the portfolio. Breaks at the end of a deck and a quiz.
  afterhours: { enabled: true, audience: 'adult', maxRating: 'T', npaOnly: false, tracking: true, placements: { ...banner('decks_banner'), ...brk('deck_break', 1), ...brk('quiz_break', 1), ...ARCADE, ...APP_OPEN_OFF } },
  // Light, never on pay screens or shift forms.
  shiftledger: { enabled: true, audience: 'adult', maxRating: 'T', npaOnly: false, tracking: true, placements: { ...banner('shifts_banner', 'rights_banner'), ...ARCADE } },
  // Never on the check-in, result or coach screens.
  worthit: { enabled: true, audience: 'adult', maxRating: 'T', npaOnly: false, tracking: true, placements: { ...banner('people_banner'), ...LEARN, ...ARCADE } },
  // For parents, but children may be looking: parent-only screens, child-directed, G, no tracking,
  // nothing full-screen and nothing in the family arcade.
  kidquest: { enabled: true, audience: 'family', maxRating: 'G', npaOnly: true, tracking: false, placements: { ...banner('plan_banner', 'why_banner') } },
  // Never during the plant-revive moment.
  thirsty: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('plants_banner'), ...LEARN, ...ARCADE, ...APP_OPEN_OFF } },
  // None in family or kids' areas or on check-ins, and its arcade is a family arcade. The admin
  // calendar is Premium-only, so the free inventory is the chores list. Children in a household
  // may see it: non-personalised, G-rated, no tracking prompt.
  reset: { enabled: true, audience: 'general', maxRating: 'G', npaOnly: true, tracking: false, placements: { ...banner('chores_banner') } },
  // Nothing inside the vault. No tracking prompt in a password app.
  grannysvault: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: false, placements: { ...LEARN, ...ARCADE } },
  // Never on the dump page or Today (the focus list).
  braindump: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('later_banner'), ...LEARN, ...ARCADE } },

  // Wave 2 (planned: wire the placements when each app is built).
  plateweek: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('meals_banner', 'list_banner'), ...LEARN, ...ARCADE } },
  daymark: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('list_banner'), ...ARCADE } },
  keepit: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('receipts_banner'), ...LEARN, ...ARCADE } },
  // A finished focus session is the perfect break; never during one.
  studysprint: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('plan_banner'), ...brk('focus_break', 1), ...LEARN, ...ARCADE } },
  pawplan: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('log_banner'), ...LEARN, ...ARCADE } },
  tripsplit: { enabled: true, audience: 'general', maxRating: 'PG', npaOnly: false, tracking: true, placements: { ...banner('trips_banner'), ...ARCADE } },
};

/** Apps without an entry get no ads at all. */
export function appAds(app: string): AppAds | null {
  return APP_ADS[app] ?? null;
}

// ---------- cross-promotion (KC house ads) ----------

export type HouseApp = { slug: string; name: string; line: string; emoji: string; theme: string };

/** Every KC app that can be promoted. Only apps marked live in the remote config are shown. */
export const HOUSE_APPS: HouseApp[] = [
  { slug: 'stackup', name: 'StackUp', line: "Know what's safe to spend, then stack the rest", emoji: '🪙', theme: 'green' },
  { slug: 'loopday', name: 'LoopDay', line: 'Tiny habits that forgive you', emoji: '🔁', theme: 'orange' },
  { slug: 'flipped', name: 'Flipped', line: 'Know your real profit from reselling', emoji: '🏷️', theme: 'brown' },
  { slug: 'afterhours', name: 'AfterHours', line: 'Better questions for couples and friends', emoji: '🌙', theme: 'pink' },
  { slug: 'shiftledger', name: 'ShiftLedger', line: "Know what you'll actually be paid", emoji: '🧾', theme: 'navy' },
  { slug: 'worthit', name: 'WorthIt?', line: 'Is your situationship worth it?', emoji: '💭', theme: 'purple' },
  { slug: 'kidquest', name: 'KidQuest', line: 'Screen-free activity ideas in seconds', emoji: '🧭', theme: 'sky' },
  { slug: 'thirsty', name: 'Thirsty', line: 'Keep your plants alive, and watch them grow', emoji: '🪴', theme: 'turquoise' },
  { slug: 'reset', name: 'Reset', line: 'Share the mental load at home', emoji: '🏡', theme: 'gold' },
  { slug: 'grannysvault', name: "Granny's Vault", line: 'Passwords and the "if anything happens" info', emoji: '🔐', theme: 'burgundy' },
  { slug: 'braindump', name: 'Brain Dump', line: 'Empty your head. It sorts itself.', emoji: '🧠', theme: 'lime' },
  { slug: 'plateweek', name: 'PlateWeek', line: "Plan the week's meals, and the shop writes itself", emoji: '🍽️', theme: 'red' },
  { slug: 'daymark', name: 'Daymark', line: 'Countdown to anything, never miss a birthday', emoji: '📅', theme: 'magenta' },
  { slug: 'keepit', name: 'KeepIt', line: 'Buy smarter, keep the receipts', emoji: '🧾', theme: 'indigo' },
  { slug: 'studysprint', name: 'StudySprint', line: 'A revision timetable that plans itself', emoji: '📚', theme: 'lavender' },
  { slug: 'pawplan', name: 'PawPlan', line: "Your pet's care, all in one place", emoji: '🐾', theme: 'coral' },
  { slug: 'tripsplit', name: 'TripSplit', line: 'Split trip costs and settle up fast', emoji: '🧳', theme: 'mint' },
];

/**
 * Which KC app to promote. Never the app itself, never one already installed, only live ones.
 * Rotates by a seed so different slots and sessions show different apps.
 */
export function pickHouseApp(current: string, live: ResolvedAds['live'], installed: ReadonlySet<string>, seed: number, platform: 'ios' | 'android'): (HouseApp & { url: string }) | null {
  const pool = HOUSE_APPS.filter((h) => h.slug !== current && !installed.has(h.slug) && live[h.slug]?.[platform]);
  if (!pool.length) return null;
  const h = pool[Math.abs(seed) % pool.length];
  return { ...h, url: live[h.slug]![platform]! };
}

// ---------- merging and clamping ----------

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;

/** Applies an override on top of a policy, field by field, clamped. Unknown fields are ignored. */
export function mergePolicy(base: AdPolicy, over?: DeepPartial<AdPolicy> | null): AdPolicy {
  if (!over || typeof over !== 'object') return base;
  const out = { ...base, appOpen: { ...base.appOpen } };
  for (const key of Object.keys(SAFE_BOUNDS) as (keyof typeof SAFE_BOUNDS)[]) {
    if (key === 'appOpen' || key === 'everyNth' || key === 'dailyCap') continue;
    if (key in over) (out as Record<string, unknown>)[key] = clamp((over as Record<string, unknown>)[key], SAFE_BOUNDS[key], base[key]);
  }
  const ao = over.appOpen;
  if (ao && typeof ao === 'object') {
    for (const key of Object.keys(SAFE_BOUNDS.appOpen) as (keyof AdPolicy['appOpen'])[]) {
      if (key in ao) out.appOpen[key] = clamp((ao as Record<string, unknown>)[key], SAFE_BOUNDS.appOpen[key], base.appOpen[key]);
    }
  }
  return out;
}

/**
 * Applies placement overrides. Only placements the app already declares can change (the code
 * has to render them), and an override can't change a placement's format.
 */
export function mergePlacements(base: Record<string, Placement>, over?: Record<string, Partial<Placement>> | null): Record<string, Placement> {
  if (!over || typeof over !== 'object') return base;
  const out: Record<string, Placement> = {};
  for (const [id, p] of Object.entries(base)) {
    const o = over[id];
    if (!o || typeof o !== 'object') {
      out[id] = p;
      continue;
    }
    out[id] = {
      format: p.format,
      enabled: typeof o.enabled === 'boolean' ? o.enabled : p.enabled,
      ...(p.everyNth != null || o.everyNth != null ? { everyNth: clamp(o.everyNth, SAFE_BOUNDS.everyNth, p.everyNth ?? 1) } : {}),
      ...(p.dailyCap != null || o.dailyCap != null ? { dailyCap: clamp(o.dailyCap, SAFE_BOUNDS.dailyCap, p.dailyCap ?? 5) } : {}),
    };
  }
  return out;
}

/** Stable variant for one install in one experiment. */
export function variantFor(installId: string, exp: Experiment): Experiment['variants'][number] | null {
  const variants = (exp.variants ?? []).filter((v) => v && typeof v.id === 'string' && typeof v.weight === 'number' && v.weight > 0);
  const total = variants.reduce((a, v) => a + v.weight, 0);
  if (!total) return null;
  let n = hashString(`${installId}:${exp.id}`) % total;
  for (const v of variants) {
    if (n < v.weight) return v;
    n -= v.weight;
  }
  return variants[variants.length - 1];
}

/** Sanity-checks a downloaded config. Returns null if it isn't one. */
export function parseRemote(json: unknown): RemoteAdsConfig | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const r = json as RemoteAdsConfig;
  if (typeof r.version !== 'number') return null;
  return r;
}

/**
 * The config an app runs with: built-in app config, then remote portfolio policy, then remote
 * app overrides, then the experiment variant this install is in. Compliance settings
 * (audience, rating, NPA, tracking) only ever come from the code.
 */
export function resolveAds(app: string, remote: RemoteAdsConfig | null, installId: string): ResolvedAds {
  const local = appAds(app);
  const live = remote?.live && typeof remote.live === 'object' ? remote.live : {};
  if (!local) {
    return { app, enabled: false, audience: 'general', maxRating: 'G', npaOnly: true, tracking: false, placements: {}, policy: DEFAULT_POLICY, variants: [], live };
  }
  let policy = mergePolicy(mergePolicy(DEFAULT_POLICY, local.policy), remote?.policy);
  let placements = local.placements;
  const appOver = remote?.apps?.[app];
  policy = mergePolicy(policy, appOver?.policy);
  placements = mergePlacements(placements, appOver?.placements);

  const variants: string[] = [];
  for (const exp of Array.isArray(remote?.experiments) ? remote!.experiments : []) {
    if (!exp || typeof exp.id !== 'string') continue;
    const inApp = exp.apps === '*' || (Array.isArray(exp.apps) && exp.apps.includes(app));
    if (!inApp) continue;
    const v = variantFor(installId, exp);
    if (!v) continue;
    variants.push(`${exp.id}:${v.id}`);
    policy = mergePolicy(policy, v.policy);
    placements = mergePlacements(placements, v.placements);
  }

  const enabled = local.enabled && remote?.enabled !== false && appOver?.enabled !== false;
  // Family apps: never anything full-screen, whatever a remote config says.
  if (local.audience === 'family') {
    placements = Object.fromEntries(Object.entries(placements).map(([id, p]) => [id, p.format === 'banner' || p.format === 'native' ? p : { ...p, enabled: false }]));
  }
  return { app, enabled, audience: local.audience, maxRating: local.maxRating, npaOnly: local.npaOnly || local.audience === 'family', tracking: local.tracking && local.audience !== 'family', placements, policy, variants, live };
}
