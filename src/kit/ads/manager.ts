// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The KC Ads runtime: one per app process. It owns consent, the remote config, the frequency
// counters and the preloaded full-screen ads. Rules: never block the person waiting for an
// ad, never show one that isn't already loaded, and keep the app working if anything fails.
import { setAnalyticsContext, track, type Props } from '../analytics';
import { kv } from '../storage';
import { uid } from '../store';
import { mergePolicy, parseRemote, resolveAds, REMOTE_CONFIG_URL } from './config';
import { decideAppOpen, decideBreak, decideInline, decideRewarded, freshCounters, fullscreenRules, recordBreak, recordFullscreen, recordRewarded, rollDay, SESSION_TIMEOUT_MS, startSession, type Ctx } from './policy';
import type { AdSdk, ConsentResult, FullscreenAd, SdkEvent } from './sdk.types';
import type { AdCounters, AdFormat, AdPolicy, BlockReason, DeepPartial, EntryPoint, FullscreenFormat, RemoteAdsConfig, ResolvedAds, SessionState } from './types';
import { isFullscreen } from './types';
import { unitFor } from './units';

/** Full-screen ads go stale: Google says interstitial and rewarded after 1 hour, app open after 4. */
const EXPIRY_MS: Record<FullscreenFormat, number> = { interstitial: 55 * 60e3, rewarded: 55 * 60e3, rewarded_interstitial: 55 * 60e3, app_open: 3.75 * 3600e3 };
const REMOTE_MAX_AGE_MS = 6 * 3600e3;
/** If a full-screen ad never reports "closed", carry on anyway. */
const SHOW_WATCHDOG_MS = 3 * 60e3;

type SlotStatus = 'idle' | 'loading' | 'ready' | 'showing' | 'failed';
type Slot = {
  placement: string;
  format: FullscreenFormat;
  ad: FullscreenAd | null;
  status: SlotStatus;
  loadedAt: number;
  retries: number;
  network: string | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Listener for the show in progress. */
  showing: ((e: SdkEvent) => void) | null;
};

type Persisted = { installId: string; counters: AdCounters };

export type AdsDeps = {
  sdk: AdSdk;
  testMode: boolean;
  platform: 'ios' | 'android' | 'web';
  now?: () => number;
  fetchRemote?: () => Promise<unknown>;
  /** Units from the build env, per platform: { placement: unitId }. */
  units?: Record<string, string>;
  testDeviceIds?: string[];
  debugEEA?: boolean;
  /** Test builds only: loosen the rules to try every placement on a fresh install (still clamped). */
  testPolicy?: DeepPartial<AdPolicy> | null;
};

const QUIET: BlockReason[] = ['premium', 'disabled', 'unknown_placement', 'unsupported'];

export class AdsManager {
  readonly app: string;
  cfg: ResolvedAds;
  consent: ConsentResult = { canRequestAds: false, privacyOptionsRequired: false };
  premium = false;
  /** True once consent and SDK initialisation have finished. */
  started = false;
  private starting: Promise<void> | null = null;
  private deps: Required<Omit<AdsDeps, 'units' | 'testDeviceIds' | 'debugEEA' | 'testPolicy'>> & Pick<AdsDeps, 'units' | 'testDeviceIds' | 'debugEEA' | 'testPolicy'>;
  private state: Persisted;
  private session: SessionState;
  private slots = new Map<string, Slot>();
  private listeners = new Set<() => void>();
  private version = 0;
  private backgroundAt = 0;
  private entry: { kind: EntryPoint; at: number } = { kind: 'launcher', at: 0 };
  private inline = { impressions: 0, clicks: 0, micros: 0, currency: 'USD', byPlacement: {} as Record<string, number> };
  /** Last few decisions, for the Settings debug panel in test builds. */
  readonly recent: { at: number; placement: string; result: string }[] = [];

  constructor(app: string, deps: AdsDeps) {
    this.app = app;
    this.deps = {
      now: () => Date.now(),
      fetchRemote: async () => {
        const res = await fetch(REMOTE_CONFIG_URL, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      },
      ...deps,
    };
    const now = this.deps.now();
    this.state = this.load(now);
    const cached = this.cachedRemote();
    this.cfg = this.resolve(cached?.config ?? null);
    const s = startSession(this.state.counters, now, this.cfg.policy.lapsedDays);
    this.session = s.session;
    this.save({ ...this.state, counters: s.counters });
    this.publishVariants();
  }

  // ---------- persistence ----------

  private key = (k: string) => `${this.app}.ads.${k}`;

  private load(now: number): Persisted {
    try {
      const raw = kv.get(this.key('state'));
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p && typeof p.installId === 'string' && p.counters && typeof p.counters.installAt === 'number') {
          return { installId: p.installId, counters: { ...freshCounters(now), ...p.counters } };
        }
      }
    } catch {
      // Corrupt state: start again (only costs the new-user grace period).
    }
    return { installId: uid('i'), counters: freshCounters(now) };
  }

  private save(next: Persisted) {
    this.state = next;
    try {
      kv.set(this.key('state'), JSON.stringify(next));
    } catch {
      // Storage full or blocked: keep going in memory.
    }
  }

  private setCounters(c: AdCounters) {
    this.save({ ...this.state, counters: c });
  }

  private cachedRemote(): { config: ReturnType<typeof parseRemote>; at: number } | null {
    try {
      const raw = kv.get(this.key('remote'));
      if (!raw) return null;
      const r = JSON.parse(raw) as { config: unknown; at: number };
      return { config: parseRemote(r.config), at: Number(r.at) || 0 };
    } catch {
      return null;
    }
  }

  /** Refreshes the remote config (at most every 6 hours). Failures keep the last good copy. */
  async refreshRemote(force = false): Promise<void> {
    const cached = this.cachedRemote();
    if (!force && cached && this.deps.now() - cached.at < REMOTE_MAX_AGE_MS) return;
    try {
      const json = await withTimeout(this.deps.fetchRemote(), 5000);
      const parsed = parseRemote(json);
      if (!parsed) return;
      kv.set(this.key('remote'), JSON.stringify({ config: parsed, at: this.deps.now() }));
      this.cfg = this.resolve(parsed);
      this.publishVariants();
      this.emit();
    } catch {
      // Offline or the site is down: the built-in and cached config still work.
    }
  }

  private resolve(remote: RemoteAdsConfig | null): ResolvedAds {
    const cfg = resolveAds(this.app, remote, this.state.installId);
    return this.deps.testMode && this.deps.testPolicy ? { ...cfg, policy: mergePolicy(cfg.policy, this.deps.testPolicy) } : cfg;
  }

  private publishVariants() {
    setAnalyticsContext({ ads_variant: this.cfg.variants.join(',') || null });
  }

  // ---------- subscriptions (React re-renders through these) ----------

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  // ---------- lifecycle ----------

  setPremium(p: boolean) {
    if (this.premium === p) return;
    this.premium = p;
    if (p) this.dropAll();
    this.emit();
  }

  /** Consent first, then the SDK, then preloading. Safe to call more than once. */
  start(): Promise<void> {
    if (this.started) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = (async () => {
      void this.refreshRemote();
      const { sdk } = this.deps;
      if (!sdk.supported || !this.cfg.enabled || !this.hasAnyPlacement()) return;
      const testDeviceIds = this.deps.testDeviceIds ?? [];
      const consent = await sdk.gatherConsent({ underAgeOfConsent: this.cfg.audience === 'family', debugEEA: !!this.deps.debugEEA, testDeviceIds });
      // Test builds only use Google's test units, so a consent error there (common with sample app ids) doesn't stop testing.
      this.consent = consent.error && this.deps.testMode ? { ...consent, canRequestAds: true } : consent;
      track('ad_consent', { can_request: this.consent.canRequestAds, options_required: this.consent.privacyOptionsRequired, error: consent.error ? 'yes' : null });
      if (!this.consent.canRequestAds) return;
      await sdk.initialize({ maxRating: this.cfg.maxRating, childDirected: this.cfg.audience === 'family', underAgeOfConsent: this.cfg.audience === 'family', testDeviceIds });
      this.started = true;
      this.warmUp();
    })()
      .catch(() => {
        // Ads failing to start must never affect the app.
      })
      .finally(() => {
        this.starting = null;
        this.emit();
      });
    return this.starting;
  }

  private hasAnyPlacement() {
    return Object.values(this.cfg.placements).some((p) => p.enabled);
  }

  /** The app went to the background. */
  onBackground() {
    const now = this.deps.now();
    this.backgroundAt = now;
    this.setCounters({ ...this.state.counters, lastActiveAt: now });
    this.flushInline();
  }

  /**
   * The app came back. After 30 minutes away it's a new session, and possibly an app-open ad.
   * Returns true if an app-open ad was shown.
   */
  async onForeground(): Promise<boolean> {
    const now = this.deps.now();
    const away = this.backgroundAt ? now - this.backgroundAt : 0;
    this.backgroundAt = 0;
    if (away < SESSION_TIMEOUT_MS) return false;
    const s = startSession(this.state.counters, now, this.cfg.policy.lapsedDays);
    this.session = s.session;
    this.setCounters(s.counters);
    void this.refreshRemote();
    const entry = now - this.entry.at < 5000 ? this.entry.kind : 'launcher';
    const d = decideAppOpen(this.cfg, this.state.counters, this.session, { ...this.ctx(), entry, backgroundMs: away });
    if (!d.ok) {
      this.note('app_open', d.reason);
      this.warmUp();
      return false;
    }
    const shown = await this.showSlot('app_open', { appOpen: true });
    this.warmUp();
    return shown;
  }

  /** How the person arrived (call from notification and deep-link handlers). */
  markEntry(kind: EntryPoint) {
    this.entry = { kind, at: this.deps.now() };
  }

  private ctx(outcome?: Ctx['outcome']): Ctx {
    return { now: this.deps.now(), premium: this.premium, canRequestAds: this.started && this.consent.canRequestAds, outcome };
  }

  // ---------- inline (banner, native) ----------

  /** Ad unit for an inline placement, or null when it shouldn't show third-party ads. */
  inlineUnit(placement: string): string | null {
    const p = this.cfg.placements[placement];
    if (!p || isFullscreen(p.format)) return null;
    if (!decideInline(this.cfg, placement, this.ctx()).ok) return null;
    return this.unit(placement, p.format);
  }

  /** Whether an inline slot should exist at all (so its space can be reserved, house ad as fallback). */
  inlineSlot(placement: string): boolean {
    const p = this.cfg.placements[placement];
    return !!p && p.enabled && this.cfg.enabled && !this.premium && !isFullscreen(p.format);
  }

  get npa(): boolean {
    return this.cfg.npaOnly;
  }

  /** Banner and native telemetry: impressions and revenue are summed per session. */
  inlineEvent(placement: string, format: AdFormat, e: SdkEvent) {
    if (e.type === 'impression') {
      this.inline.impressions++;
      this.inline.byPlacement[placement] = (this.inline.byPlacement[placement] ?? 0) + 1;
    } else if (e.type === 'clicked') {
      this.inline.clicks++;
      track('ad_click', { placement, format });
    } else if (e.type === 'paid') {
      this.inline.micros += e.micros;
      this.inline.currency = e.currency || this.inline.currency;
    } else if (e.type === 'failed') {
      track('ad_failed', { placement, format, code: e.code, no_fill: e.noFill });
    }
    if (this.inline.impressions >= 20) this.flushInline();
  }

  private flushInline() {
    if (!this.inline.impressions && !this.inline.micros) return;
    const top = Object.entries(this.inline.byPlacement).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    track('ad_inline_summary', { impressions: this.inline.impressions, clicks: this.inline.clicks, revenue_micros: this.inline.micros, currency: this.inline.currency, top_placement: top });
    this.inline = { impressions: 0, clicks: 0, micros: 0, currency: this.inline.currency, byPlacement: {} };
  }

  // ---------- full-screen ----------

  private unit(placement: string, format: AdFormat): string | null {
    return unitFor(placement, format, { testMode: this.deps.testMode, platform: this.deps.platform, units: this.deps.units });
  }

  private slot(placement: string): Slot | null {
    const p = this.cfg.placements[placement];
    if (!p || !isFullscreen(p.format)) return null;
    let s = this.slots.get(placement);
    if (!s) {
      s = { placement, format: p.format, ad: null, status: 'idle', loadedAt: 0, retries: 0, network: null, timer: null, showing: null };
      this.slots.set(placement, s);
    }
    return s;
  }

  private fresh(s: Slot) {
    return s.status === 'ready' && this.deps.now() - s.loadedAt < EXPIRY_MS[s.format];
  }

  /** Starts loading a placement if it could plausibly be shown. Never waits. */
  prepare(placement: string) {
    if (!this.started || this.premium || !this.consent.canRequestAds) return;
    const p = this.cfg.placements[placement];
    if (!p?.enabled || !this.cfg.enabled) return;
    const s = this.slot(placement);
    if (!s || s.status === 'loading' || s.status === 'showing' || this.fresh(s)) return;
    if (s.status === 'failed' && s.retries > this.cfg.policy.maxRetries) return;
    this.loadSlot(s);
  }

  /** Preloads what the frequency rules would allow soon. Rewarded ads load when their screen opens. */
  private warmUp() {
    if (!this.started || this.premium) return;
    for (const [id, p] of Object.entries(this.cfg.placements)) {
      if (!p.enabled) continue;
      if (p.format === 'interstitial') {
        // Only once full-screen ads are allowed for this person, so requests aren't wasted on new users.
        if (fullscreenRules(this.cfg, this.state.counters, this.session, this.deps.now()).ok) this.prepare(id);
      } else if (p.format === 'app_open') {
        const c = this.state.counters;
        const ao = this.cfg.policy.appOpen;
        if (c.sessions >= ao.minSessions - 1 && this.deps.now() - c.installAt >= (ao.minInstallDays - 1) * 86400e3) this.prepare(id);
      }
    }
  }

  private loadSlot(s: Slot) {
    const unitId = this.unit(s.placement, s.format);
    if (!unitId) {
      s.status = 'failed';
      s.retries = Number.MAX_SAFE_INTEGER;
      return;
    }
    s.ad?.destroy();
    s.status = 'loading';
    s.network = null;
    if (s.timer) clearTimeout(s.timer);
    const ad = this.deps.sdk.createFullscreen(s.format, unitId, this.npa, (e) => this.onSlotEvent(s, ad, e));
    s.ad = ad;
    s.timer = setTimeout(() => {
      if (s.ad === ad && s.status === 'loading') this.onSlotEvent(s, ad, { type: 'failed', noFill: false, code: 'timeout', phase: 'load' });
    }, this.cfg.policy.loadTimeoutSeconds * 1000);
    try {
      ad.load();
    } catch {
      this.onSlotEvent(s, ad, { type: 'failed', noFill: false, code: 'load-threw', phase: 'load' });
    }
  }

  private onSlotEvent(s: Slot, ad: FullscreenAd, e: SdkEvent) {
    if (s.ad !== ad) return; // a stale ad's late event
    const props: Props = { placement: s.placement, format: s.format };
    if (e.type === 'loaded') {
      if (s.timer) clearTimeout(s.timer);
      s.status = 'ready';
      s.loadedAt = this.deps.now();
      s.retries = 0;
      s.network = e.network;
      track('ad_loaded', { ...props, network: e.network });
      this.emit();
      return;
    }
    if (e.type === 'failed' && e.phase === 'load' && s.status === 'loading') {
      if (s.timer) clearTimeout(s.timer);
      s.status = 'failed';
      s.retries++;
      track('ad_failed', { ...props, code: e.code, no_fill: e.noFill, retry: s.retries });
      ad.destroy();
      s.ad = null;
      if (s.retries <= this.cfg.policy.maxRetries) {
        // Exponential backoff: 10s, 20s, 40s… capped at 2 minutes.
        const wait = Math.min(120e3, 10e3 * 2 ** (s.retries - 1));
        s.timer = setTimeout(() => {
          if (s.status === 'failed' && !this.premium) this.loadSlot(s);
        }, wait);
      }
      this.emit();
      return;
    }
    s.showing?.(e);
    if (e.type === 'paid') track('ad_revenue', { ...props, revenue_micros: e.micros, currency: e.currency, precision: e.precision, network: e.network ?? s.network });
    else if (e.type === 'clicked') track('ad_click', props);
    else if (e.type === 'impression') track('ad_impression', { ...props, network: s.network });
  }

  /** Shows a loaded slot and resolves when it closes. Records it against the caps when it starts. */
  private showSlot(placement: string, opts: { appOpen?: boolean; rewarded?: boolean; onEvent?: (e: SdkEvent) => void } = {}): Promise<boolean> {
    const s = this.slots.get(placement);
    if (!s || !s.ad || !this.fresh(s)) {
      if (s && s.status === 'ready') s.status = 'idle'; // expired
      this.note(placement, 'not_loaded');
      this.prepare(placement);
      return Promise.resolve(false);
    }
    const ad = s.ad;
    s.status = 'showing';
    const now = this.deps.now();
    if (opts.rewarded) {
      this.setCounters(recordRewarded(this.state.counters, placement, now));
    } else {
      const r = recordFullscreen(this.state.counters, this.session, now, !!opts.appOpen);
      this.session = r.session;
      this.setCounters(r.counters);
    }
    this.note(placement, 'shown');
    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (shown: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        s.showing = null;
        ad.destroy();
        if (s.ad === ad) {
          s.ad = null;
          s.status = 'idle';
        }
        this.emit();
        // Warm the next one for this placement.
        this.prepare(placement);
        resolve(shown);
      };
      const watchdog = setTimeout(() => finish(true), SHOW_WATCHDOG_MS);
      s.showing = (e) => {
        opts.onEvent?.(e);
        if (e.type === 'closed') finish(true);
        else if (e.type === 'failed' && e.phase === 'show') finish(false);
      };
      ad.show().catch(() => finish(false));
    });
  }

  private note(placement: string, result: string) {
    this.recent.unshift({ at: this.deps.now(), placement, result });
    this.recent.length = Math.min(this.recent.length, 12);
    if (result !== 'shown' && !QUIET.includes(result as BlockReason)) track('ad_skipped', { placement, reason: result });
  }

  /**
   * A natural break (a finished round, deck or quiz). Shows an interstitial if the rules allow
   * and one is already loaded; otherwise returns straight away. Resolves after the ad closes.
   */
  async atBreak(placement: string, outcome: Ctx['outcome'] = 'success'): Promise<boolean> {
    if (!this.cfg.placements[placement]) return false;
    this.setCounters(rollDay(this.state.counters, this.deps.now()));
    const b = recordBreak(this.state.counters, placement);
    this.setCounters(b.counters);
    const d = decideBreak(this.cfg, placement, this.state.counters, this.session, this.ctx(outcome), b.count);
    if (!d.ok) {
      this.note(placement, d.reason);
      if (d.reason === 'not_nth_break' || d.reason === 'too_soon' || d.reason === 'session_grace' || d.reason === 'rewarded_cooldown') this.prepare(placement);
      return false;
    }
    return this.showSlot(placement);
  }

  /** A rewarded offer can be shown now (allowed and already loaded). */
  rewardedReady(placement: string): boolean {
    if (!decideRewarded(this.cfg, placement, this.state.counters, this.ctx()).ok) return false;
    const s = this.slots.get(placement);
    return !!s && this.fresh(s);
  }

  /** Rewarded allowed for this person right now (ignores loading), so screens can prepare it. */
  rewardedAllowed(placement: string): boolean {
    return decideRewarded(this.cfg, placement, this.state.counters, this.ctx()).ok;
  }

  /** Plays a rewarded ad the person chose to watch. `earned` is true only if Google reports the reward. */
  async showRewarded(placement: string): Promise<{ earned: boolean }> {
    const d = decideRewarded(this.cfg, placement, this.state.counters, this.ctx());
    if (!d.ok) {
      this.note(placement, d.reason);
      return { earned: false };
    }
    let earned = false;
    await this.showSlot(placement, {
      rewarded: true,
      onEvent: (e) => {
        if (e.type !== 'reward') return;
        earned = true;
        track('ad_reward', { placement, amount: e.amount });
      },
    });
    return { earned };
  }

  async showPrivacyOptions(): Promise<void> {
    try {
      this.consent = await this.deps.sdk.showPrivacyOptions();
      track('ad_consent', { can_request: this.consent.canRequestAds, options_required: this.consent.privacyOptionsRequired, changed: true });
      if (!this.consent.canRequestAds) this.dropAll();
    } finally {
      this.emit();
    }
  }

  openInspector() {
    return this.deps.sdk.openInspector();
  }

  private dropAll() {
    for (const s of this.slots.values()) {
      if (s.timer) clearTimeout(s.timer);
      if (s.status !== 'showing') {
        s.ad?.destroy();
        s.ad = null;
        s.status = 'idle';
      }
    }
  }

  /** For the test-build debug panel. */
  debug() {
    const c = this.state.counters;
    return {
      started: this.started,
      consent: this.consent,
      variants: this.cfg.variants,
      sessions: c.sessions,
      fullscreenToday: c.fullscreenToday,
      rewardedToday: c.rewardedToday,
      slots: [...this.slots.values()].map((s) => `${s.placement}: ${s.status}${s.network ? ` (${s.network})` : ''}`),
      recent: this.recent,
    };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
