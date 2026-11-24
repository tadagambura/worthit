// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { APP_ADS, DEFAULT_POLICY, mergePlacements, mergePolicy, parseRemote, pickHouseApp, resolveAds, variantFor } from '../ads/config';
import { AdsManager } from '../ads/manager';
import { decideAppOpen, decideBreak, decideInline, decideRewarded, freshCounters, recordFullscreen, recordRewarded, rollDay, startSession } from '../ads/policy';
import type { AdSdk, SdkEvent } from '../ads/sdk.types';
import { GOOGLE_TEST_UNITS, parseUnits, unitFor } from '../ads/units';
import type { AdCounters, ResolvedAds, SessionState } from '../ads/types';

const H = 3600e3;
const D = 24 * H;
const T0 = new Date('2026-12-01T09:00:00').getTime();

const cfgFor = (app = 'afterhours') => resolveAds(app, null, 'install-1');
const ctx = (now: number, over: Partial<{ premium: boolean; canRequestAds: boolean; outcome: 'success' | 'failure' | 'neutral' }> = {}) => ({ now, premium: false, canRequestAds: true, ...over });

/** A user on day 3, session 5, 10 minutes into the session, with no ads seen yet. */
function veteran(now = T0 + 3 * D): { c: AdCounters; s: SessionState } {
  const c = { ...freshCounters(T0), sessions: 5, lastActiveAt: now - 600e3, day: rollDay(freshCounters(T0), now).day };
  return { c, s: { startedAt: now - 600e3, fullscreen: 0, lapsed: false } };
}

describe('ads config', () => {
  test('every app config is internally valid', () => {
    for (const [slug, a] of Object.entries(APP_ADS)) {
      for (const [id, p] of Object.entries(a.placements)) {
        expect(['banner', 'native', 'interstitial', 'rewarded', 'rewarded_interstitial', 'app_open']).toContain(p.format);
        if (id.endsWith('_banner')) expect(p.format).toBe('banner');
        if (id.endsWith('_break')) expect(p.format).toBe('interstitial');
      }
      if (a.audience === 'family') {
        expect(a.npaOnly).toBe(true);
        expect(a.tracking).toBe(false);
        expect(a.maxRating).toBe('G');
        expect(Object.values(a.placements).every((p) => p.format === 'banner' || p.format === 'native')).toBe(true);
      }
      expect(slug).toMatch(/^[a-z]+$/);
    }
  });

  test('owner rules: protected apps keep their limits', () => {
    // StackUp: banner only on its own screens (lessons never), Granny's Vault: nothing in the vault.
    expect(Object.keys(APP_ADS.stackup.placements).filter((k) => !k.startsWith('arcade_'))).toEqual(['stacks_banner']);
    expect(Object.keys(APP_ADS.grannysvault.placements).some((k) => k.includes('vault') || k.includes('emergency'))).toBe(false);
    expect(Object.keys(APP_ADS.reset.placements)).toEqual(['chores_banner']);
    expect(APP_ADS.reset.npaOnly).toBe(true);
    expect(APP_ADS.kidquest.audience).toBe('family');
    expect(APP_ADS.grannysvault.tracking).toBe(false);
  });

  test('remote overrides are clamped to safe bounds', () => {
    const p = mergePolicy(DEFAULT_POLICY, { interstitialGapSeconds: 5, maxFullscreenPerDay: 999, minSessionsForFullscreen: 0, appOpen: { maxPerDay: 10 } });
    expect(p.interstitialGapSeconds).toBe(60);
    expect(p.maxFullscreenPerDay).toBe(15);
    expect(p.minSessionsForFullscreen).toBe(2);
    expect(p.appOpen.maxPerDay).toBe(2);
    // Junk is ignored.
    expect(mergePolicy(DEFAULT_POLICY, { interstitialGapSeconds: 'soon' as unknown as number })).toEqual(DEFAULT_POLICY);
  });

  test('remote placements can tune but not invent placements or change formats', () => {
    const base = APP_ADS.loopday.placements;
    const out = mergePlacements(base, { stats_banner: { enabled: false }, made_up: { format: 'interstitial', enabled: true }, arcade_break: { format: 'banner', everyNth: 0 } });
    expect(out.stats_banner.enabled).toBe(false);
    expect(out.made_up).toBeUndefined();
    expect(out.arcade_break.format).toBe('interstitial');
    expect(out.arcade_break.everyNth).toBe(1);
  });

  test('family apps never get full-screen ads, whatever the remote says', () => {
    const r = resolveAds('kidquest', { version: 1, apps: { kidquest: { placements: { plan_banner: { enabled: true } } } }, policy: {} }, 'x');
    expect(r.npaOnly).toBe(true);
    expect(r.tracking).toBe(false);
    expect(Object.values(r.placements).every((p) => p.format === 'banner')).toBe(true);
  });

  test('kill switches: global and per app', () => {
    expect(resolveAds('loopday', { version: 1, enabled: false }, 'x').enabled).toBe(false);
    expect(resolveAds('loopday', { version: 1, apps: { loopday: { enabled: false } } }, 'x').enabled).toBe(false);
    expect(resolveAds('loopday', { version: 1, apps: { flipped: { enabled: false } } }, 'x').enabled).toBe(true);
    expect(resolveAds('not-an-app', null, 'x').enabled).toBe(false);
  });

  test('experiments assign stable variants roughly by weight', () => {
    const exp = { id: 'aoa_v1', apps: ['afterhours'], variants: [{ id: 'control', weight: 50 }, { id: 'on', weight: 50, placements: { app_open: { enabled: true } } }] };
    expect(variantFor('abc', exp)?.id).toBe(variantFor('abc', exp)?.id);
    let on = 0;
    for (let i = 0; i < 2000; i++) if (variantFor(`install-${i}`, exp)?.id === 'on') on++;
    expect(on).toBeGreaterThan(850);
    expect(on).toBeLessThan(1150);
    const ids = Array.from({ length: 50 }, (_, i) => `i${i}`);
    const resolved = ids.map((id) => resolveAds('afterhours', { version: 1, experiments: [exp] }, id));
    for (const r of resolved) {
      expect(r.variants).toHaveLength(1);
      expect(r.placements.app_open.enabled).toBe(r.variants[0] === 'aoa_v1:on');
    }
    // Not in the experiment's apps: no variant.
    expect(resolveAds('loopday', { version: 1, experiments: [exp] }, 'abc').variants).toEqual([]);
  });

  test('parseRemote rejects things that are not a config', () => {
    expect(parseRemote(null)).toBeNull();
    expect(parseRemote([])).toBeNull();
    expect(parseRemote({ enabled: true })).toBeNull();
    expect(parseRemote({ version: 2 })).toEqual({ version: 2 });
  });

  test('house ads: never itself, never installed, only live apps', () => {
    const live = { stackup: { ios: 'https://apps.apple.com/app/id1', android: 'https://play.google.com/store/apps/details?id=com.kaoticchainz.stackup' }, loopday: { android: 'https://play.google.com/x' } };
    expect(pickHouseApp('stackup', live, new Set(), 0, 'ios')).toBeNull();
    expect(pickHouseApp('loopday', live, new Set(), 0, 'ios')?.slug).toBe('stackup');
    expect(pickHouseApp('loopday', live, new Set(['stackup']), 0, 'ios')).toBeNull();
    expect(pickHouseApp('flipped', live, new Set(), 1, 'android')?.slug).toMatch(/stackup|loopday/);
    expect(pickHouseApp('flipped', {}, new Set(), 0, 'android')).toBeNull();
  });
});

describe('ads policy', () => {
  const cfg = cfgFor('afterhours');

  test('inline ads: free users with consent only', () => {
    expect(decideInline(cfg, 'decks_banner', ctx(T0)).ok).toBe(true);
    expect(decideInline(cfg, 'decks_banner', ctx(T0, { premium: true }))).toEqual({ ok: false, reason: 'premium' });
    expect(decideInline(cfg, 'decks_banner', ctx(T0, { canRequestAds: false }))).toEqual({ ok: false, reason: 'no_consent' });
    expect(decideInline(cfg, 'nope', ctx(T0))).toEqual({ ok: false, reason: 'unknown_placement' });
  });

  test('new users are protected from full-screen ads', () => {
    const c = { ...freshCounters(T0), sessions: 1 };
    const s = { startedAt: T0, fullscreen: 0, lapsed: false };
    expect(decideBreak(cfg, 'deck_break', c, s, ctx(T0 + 600e3), 1)).toEqual({ ok: false, reason: 'new_user' });
    // Third session but only 2 hours after install: still protected.
    expect(decideBreak(cfg, 'deck_break', { ...c, sessions: 3 }, s, ctx(T0 + 2 * H), 1)).toEqual({ ok: false, reason: 'new_user' });
  });

  test('a veteran at a natural break gets an interstitial', () => {
    const now = T0 + 3 * D;
    const { c, s } = veteran(now);
    expect(decideBreak(cfg, 'deck_break', c, s, ctx(now), 1)).toEqual({ ok: true });
  });

  test('never straight after a failure, never in the session grace period', () => {
    const now = T0 + 3 * D;
    const { c, s } = veteran(now);
    expect(decideBreak(cfg, 'deck_break', c, s, ctx(now, { outcome: 'failure' }), 1)).toEqual({ ok: false, reason: 'after_failure' });
    expect(decideBreak(cfg, 'deck_break', c, { ...s, startedAt: now - 10e3 }, ctx(now), 1)).toEqual({ ok: false, reason: 'session_grace' });
  });

  test('gap, rewarded cooldown, session and daily caps', () => {
    const now = T0 + 3 * D;
    const { c, s } = veteran(now);
    expect(decideBreak(cfg, 'deck_break', { ...c, lastFullscreenAt: now - 60e3 }, s, ctx(now), 1)).toEqual({ ok: false, reason: 'too_soon' });
    expect(decideBreak(cfg, 'deck_break', { ...c, lastRewardedAt: now - 30e3 }, s, ctx(now), 1)).toEqual({ ok: false, reason: 'rewarded_cooldown' });
    expect(decideBreak(cfg, 'deck_break', c, { ...s, fullscreen: 3 }, ctx(now), 1)).toEqual({ ok: false, reason: 'session_cap' });
    expect(decideBreak(cfg, 'deck_break', { ...c, fullscreenToday: 8 }, s, ctx(now), 1)).toEqual({ ok: false, reason: 'daily_cap' });
  });

  test('everyNth: arcade breaks show on every 2nd round', () => {
    const now = T0 + 3 * D;
    const { c, s } = veteran(now);
    expect(decideBreak(cfg, 'arcade_break', c, s, ctx(now), 1)).toEqual({ ok: false, reason: 'not_nth_break' });
    expect(decideBreak(cfg, 'arcade_break', c, s, ctx(now), 2)).toEqual({ ok: true });
  });

  test('lapsed users get a quiet session', () => {
    const c0 = { ...freshCounters(T0), sessions: 10, lastActiveAt: T0 };
    const back = T0 + 9 * D;
    const { session } = startSession(c0, back, DEFAULT_POLICY.lapsedDays);
    expect(session.lapsed).toBe(true);
    expect(decideBreak(cfg, 'deck_break', c0, { ...session, startedAt: back - 600e3 }, ctx(back), 1)).toEqual({ ok: false, reason: 'lapsed_user' });
    expect(startSession(c0, T0 + 2 * D, 7).session.lapsed).toBe(false);
  });

  test('rewarded: opt-in, capped per placement and per day', () => {
    const c = freshCounters(T0);
    expect(decideRewarded(cfg, 'arcade_double', c, ctx(T0)).ok).toBe(true);
    let n = c;
    for (let i = 0; i < 5; i++) n = recordRewarded(n, 'arcade_double', T0 + i);
    expect(decideRewarded(cfg, 'arcade_double', n, ctx(T0))).toEqual({ ok: false, reason: 'placement_cap' });
    expect(decideRewarded(cfg, 'arcade_daily', recordRewarded(c, 'arcade_daily', T0), ctx(T0))).toEqual({ ok: false, reason: 'placement_cap' });
    expect(decideRewarded(cfg, 'arcade_daily', { ...c, rewardedToday: 12 }, ctx(T0))).toEqual({ ok: false, reason: 'daily_cap' });
    // A new day resets the caps.
    expect(decideRewarded(cfg, 'arcade_double', rollDay(n, T0 + D), ctx(T0 + D)).ok).toBe(true);
    // Interstitials aren't rewarded placements.
    expect(decideRewarded(cfg, 'deck_break', c, ctx(T0)).ok).toBe(false);
  });

  test('app open: off by default, launcher only, long background, after day 3', () => {
    const on: ResolvedAds = { ...cfg, placements: { ...cfg.placements, app_open: { format: 'app_open', enabled: true } } };
    const now = T0 + 4 * D;
    const { c, s } = veteran(now);
    const base = { ...ctx(now), entry: 'launcher' as const, backgroundMs: 2 * H };
    expect(decideAppOpen(cfg, c, s, base)).toEqual({ ok: false, reason: 'disabled' });
    expect(decideAppOpen(on, c, s, base)).toEqual({ ok: true });
    expect(decideAppOpen(on, c, s, { ...base, entry: 'notification' })).toEqual({ ok: false, reason: 'entry_point' });
    expect(decideAppOpen(on, c, s, { ...base, backgroundMs: 5 * 60e3 })).toEqual({ ok: false, reason: 'short_background' });
    expect(decideAppOpen(on, { ...c, appOpenToday: 1 }, s, base)).toEqual({ ok: false, reason: 'daily_cap' });
    expect(decideAppOpen(on, { ...c, installAt: now - D }, s, base)).toEqual({ ok: false, reason: 'new_user' });
  });

  test('recording a full-screen ad counts it for the day and the session', () => {
    const { c, s } = veteran();
    const r = recordFullscreen(c, s, T0 + 3 * D, true);
    expect(r.counters.fullscreenToday).toBe(1);
    expect(r.counters.appOpenToday).toBe(1);
    expect(r.session.fullscreen).toBe(1);
    expect(r.counters.lastFullscreenAt).toBe(T0 + 3 * D);
  });
});

describe('ad units', () => {
  test('test builds always use Google test units, even with real units configured', () => {
    const units = { stats_banner: 'ca-app-pub-1234567890123456/1234567890' };
    expect(unitFor('stats_banner', 'banner', { testMode: true, platform: 'android', units })).toBe(GOOGLE_TEST_UNITS.banner.android);
    expect(unitFor('stats_banner', 'banner', { testMode: false, platform: 'android', units })).toBe(units.stats_banner);
  });
  test('release builds without a unit show no third-party ad, and web never does', () => {
    expect(unitFor('stats_banner', 'banner', { testMode: false, platform: 'ios', units: {} })).toBeNull();
    expect(unitFor('stats_banner', 'banner', { testMode: true, platform: 'web' })).toBeNull();
  });
  test('unit env parsing drops junk and Google test units', () => {
    expect(parseUnits('{"a":"ca-app-pub-1234567890123456/1234567890","b":"nope","c":"ca-app-pub-3940256099942544/1033173712"}')).toEqual({ a: 'ca-app-pub-1234567890123456/1234567890' });
    expect(parseUnits('not json')).toEqual({});
    expect(parseUnits(undefined)).toEqual({});
  });
});

// ---------- the runtime, against a fake SDK ----------

type FakeAd = { format: string; unitId: string; on: (e: SdkEvent) => void; loads: number; shown: number; destroyed: boolean };

function fakeSdk(opts: { fill?: boolean; consent?: boolean } = {}) {
  const ads: FakeAd[] = [];
  const sdk: AdSdk = {
    supported: true,
    gatherConsent: async () => ({ canRequestAds: opts.consent !== false, privacyOptionsRequired: true }),
    showPrivacyOptions: async () => ({ canRequestAds: false, privacyOptionsRequired: true }),
    initialize: async () => {},
    createFullscreen: (format, unitId, _npa, on) => {
      const a: FakeAd = { format, unitId, on, loads: 0, shown: 0, destroyed: false };
      ads.push(a);
      return {
        load: () => {
          a.loads++;
          if (opts.fill === false) on({ type: 'failed', noFill: true, code: 'no-fill', phase: 'load' });
          else on({ type: 'loaded', network: 'AdMob Network' });
        },
        show: async () => {
          a.shown++;
          on({ type: 'impression' });
          on({ type: 'paid', micros: 12000, currency: 'GBP', precision: 3, network: 'AdMob Network' });
          if (format === 'rewarded') on({ type: 'reward', amount: 1, kind: 'coins' });
          setTimeout(() => on({ type: 'closed' }), 0);
        },
        destroy: () => {
          a.destroyed = true;
        },
      };
    },
    openInspector: async () => {},
  };
  return { sdk, ads };
}

describe('ads manager', () => {
  let clock = T0;
  const now = () => clock;
  beforeEach(() => {
    jest.useFakeTimers();
    clock = T0;
  });
  afterEach(() => jest.useRealTimers());

  const make = (app: string, f = fakeSdk()) => {
    const m = new AdsManager(`${app}`, { sdk: f.sdk, testMode: true, platform: 'android', now, fetchRemote: async () => ({ version: 1 }) });
    return { m, ...f };
  };

  test('nothing full-screen for a brand-new user, but rewarded works', async () => {
    const { m, ads } = make('afterhours');
    await m.start();
    expect(m.started).toBe(true);
    expect(await m.atBreak('deck_break')).toBe(false);
    m.prepare('arcade_double');
    expect(m.rewardedReady('arcade_double')).toBe(true);
    const p = m.showRewarded('arcade_double');
    await jest.runOnlyPendingTimersAsync();
    expect(await p).toEqual({ earned: true });
    expect(ads.find((a) => a.format === 'rewarded')?.unitId).toBe(GOOGLE_TEST_UNITS.rewarded.android);
  });

  test('premium users get nothing, and consent refusal means no requests', async () => {
    const { m, ads } = make('loopday');
    m.setPremium(true);
    await m.start();
    m.prepare('arcade_double');
    expect(m.rewardedReady('arcade_double')).toBe(false);
    expect(m.inlineUnit('stats_banner')).toBeNull();
    expect(m.inlineSlot('stats_banner')).toBe(false);
    expect(ads).toHaveLength(0);

    const f = fakeSdk({ consent: false });
    const n = new AdsManager('flipped', { sdk: f.sdk, testMode: false, platform: 'android', now, fetchRemote: async () => ({ version: 1 }) });
    await n.start();
    expect(n.started).toBe(false);
    expect(n.inlineUnit('stock_banner')).toBeNull();
    // The slot still exists, so the house ad can fill it.
    expect(n.inlineSlot('stock_banner')).toBe(true);
  });

  test('no-fill retries with backoff, then stops', async () => {
    const f = fakeSdk({ fill: false });
    const { m, ads } = make('afterhours', f);
    await m.start();
    m.prepare('arcade_double');
    expect(ads).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(10e3);
    expect(ads).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(20e3);
    await jest.advanceTimersByTimeAsync(40e3);
    expect(ads).toHaveLength(4); // first try + 3 retries
    await jest.advanceTimersByTimeAsync(10 * 60e3);
    expect(ads).toHaveLength(4);
    expect(m.rewardedReady('arcade_double')).toBe(false);
  });

  test('loaded ads expire and are never shown stale', async () => {
    const { m } = make('thirsty');
    await m.start();
    m.prepare('arcade_double');
    expect(m.rewardedReady('arcade_double')).toBe(true);
    clock += 2 * H;
    expect(m.rewardedReady('arcade_double')).toBe(false);
  });
});
