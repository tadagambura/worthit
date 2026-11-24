// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Ads frequency rules, as pure functions so they're tested once for every app.
// Every "should this ad show?" question in the portfolio is answered here, nowhere else.
import { dayKey } from '../dates';
import type { AdCounters, Decision, EntryPoint, Placement, ResolvedAds, SessionState } from './types';

const SEC = 1000;
const HOUR = 3600 * SEC;
const DAY = 24 * HOUR;

/** A new session starts when the app comes back after this long in the background. */
export const SESSION_TIMEOUT_MS = 30 * 60 * SEC;

export function freshCounters(now: number): AdCounters {
  return {
    installAt: now,
    sessions: 0,
    lastActiveAt: now,
    day: dayKey(new Date(now)),
    fullscreenToday: 0,
    appOpenToday: 0,
    rewardedToday: 0,
    placementToday: {},
    breaks: {},
    lastFullscreenAt: 0,
    lastRewardedAt: 0,
  };
}

/** Resets the daily counters when the local day changes. */
export function rollDay(c: AdCounters, now: number): AdCounters {
  const today = dayKey(new Date(now));
  if (c.day === today) return c;
  return { ...c, day: today, fullscreenToday: 0, appOpenToday: 0, rewardedToday: 0, placementToday: {} };
}

/** Starts a session: counts it and spots people coming back after a long gap. */
export function startSession(c: AdCounters, now: number, lapsedDays: number): { counters: AdCounters; session: SessionState } {
  const rolled = rollDay(c, now);
  const lapsed = rolled.sessions > 0 && now - rolled.lastActiveAt >= lapsedDays * DAY;
  return {
    counters: { ...rolled, sessions: rolled.sessions + 1, lastActiveAt: now },
    session: { startedAt: now, fullscreen: 0, lapsed },
  };
}

export type Ctx = {
  now: number;
  premium: boolean;
  /** UMP says ads may be requested (consent gathered, or not needed). */
  canRequestAds: boolean;
  /** What just happened before this break. Never interrupt straight after a failure. */
  outcome?: 'success' | 'failure' | 'neutral';
};

const no = (reason: Extract<Decision, { ok: false }>['reason']): Decision => ({ ok: false, reason });
const yes: Decision = { ok: true };

function base(cfg: ResolvedAds, placementId: string, ctx: Ctx): Decision | Placement {
  if (!cfg.enabled) return no('disabled');
  const p = cfg.placements[placementId];
  if (!p) return no('unknown_placement');
  if (!p.enabled) return no('disabled');
  if (ctx.premium) return no('premium');
  if (!ctx.canRequestAds) return no('no_consent');
  return p;
}

/** Shared new-user, lapsed-user and cap rules for anything full-screen that isn't rewarded. */
export function fullscreenRules(cfg: ResolvedAds, c: AdCounters, s: SessionState, now: number): Decision {
  const pol = cfg.policy;
  if (c.sessions < pol.minSessionsForFullscreen) return no('new_user');
  if (now - c.installAt < pol.minInstallHoursForFullscreen * HOUR) return no('new_user');
  if (s.lapsed) return no('lapsed_user');
  if (s.fullscreen >= pol.maxFullscreenPerSession) return no('session_cap');
  if (c.fullscreenToday >= pol.maxFullscreenPerDay) return no('daily_cap');
  return yes;
}

/** Banners and native ads: on wherever the placement exists, for free users who can get ads. */
export function decideInline(cfg: ResolvedAds, placementId: string, ctx: Ctx): Decision {
  const b = base(cfg, placementId, ctx);
  return 'ok' in b ? b : yes;
}

/**
 * An interstitial at a natural break. `breakCount` is this placement's break number including
 * this one (so everyNth = 2 shows on breaks 2, 4, 6…).
 */
export function decideBreak(cfg: ResolvedAds, placementId: string, c: AdCounters, s: SessionState, ctx: Ctx, breakCount: number): Decision {
  const b = base(cfg, placementId, ctx);
  if ('ok' in b) return b;
  if (b.format !== 'interstitial') return no('unknown_placement');
  if (ctx.outcome === 'failure') return no('after_failure');
  const pol = cfg.policy;
  const rules = fullscreenRules(cfg, c, s, ctx.now);
  if (!rules.ok) return rules;
  if (ctx.now - s.startedAt < pol.sessionGraceSeconds * SEC) return no('session_grace');
  if (c.lastFullscreenAt && ctx.now - c.lastFullscreenAt < pol.interstitialGapSeconds * SEC) return no('too_soon');
  if (c.lastRewardedAt && ctx.now - c.lastRewardedAt < pol.rewardedCooldownSeconds * SEC) return no('rewarded_cooldown');
  const nth = Math.max(1, b.everyNth ?? 1);
  if (breakCount % nth !== 0) return no('not_nth_break');
  return yes;
}

/** Whether a rewarded offer may be shown (the person still chooses to watch). */
export function decideRewarded(cfg: ResolvedAds, placementId: string, c: AdCounters, ctx: Ctx): Decision {
  const b = base(cfg, placementId, ctx);
  if ('ok' in b) return b;
  if (b.format !== 'rewarded' && b.format !== 'rewarded_interstitial') return no('unknown_placement');
  if (c.rewardedToday >= cfg.policy.maxRewardedPerDay) return no('daily_cap');
  if ((c.placementToday[placementId] ?? 0) >= (b.dailyCap ?? cfg.policy.maxRewardedPerDay)) return no('placement_cap');
  return yes;
}

/** An app-open ad when the app comes back to the foreground. Only from the launcher, never from a notification or link. */
export function decideAppOpen(cfg: ResolvedAds, c: AdCounters, s: SessionState, ctx: Ctx & { entry: EntryPoint; backgroundMs: number }): Decision {
  const b = base(cfg, 'app_open', ctx);
  if ('ok' in b) return b;
  if (b.format !== 'app_open') return no('unknown_placement');
  const ao = cfg.policy.appOpen;
  if (ctx.entry !== 'launcher') return no('entry_point');
  if (ctx.backgroundMs < ao.minBackgroundMinutes * 60 * SEC) return no('short_background');
  if (c.sessions < ao.minSessions) return no('new_user');
  if (ctx.now - c.installAt < ao.minInstallDays * DAY) return no('new_user');
  const rules = fullscreenRules(cfg, c, s, ctx.now);
  if (!rules.ok) return rules;
  if (c.appOpenToday >= ao.maxPerDay) return no('daily_cap');
  if (c.lastFullscreenAt && ctx.now - c.lastFullscreenAt < ao.gapAfterFullscreenSeconds * SEC) return no('too_soon');
  return yes;
}

// ---------- recording what happened ----------

export function recordBreak(c: AdCounters, placementId: string): { counters: AdCounters; count: number } {
  const count = (c.breaks[placementId] ?? 0) + 1;
  return { counters: { ...c, breaks: { ...c.breaks, [placementId]: count } }, count };
}

export function recordFullscreen(c: AdCounters, s: SessionState, now: number, appOpen = false): { counters: AdCounters; session: SessionState } {
  const r = rollDay(c, now);
  return {
    counters: { ...r, fullscreenToday: r.fullscreenToday + 1, appOpenToday: r.appOpenToday + (appOpen ? 1 : 0), lastFullscreenAt: now },
    session: { ...s, fullscreen: s.fullscreen + 1 },
  };
}

export function recordRewarded(c: AdCounters, placementId: string, now: number): AdCounters {
  const r = rollDay(c, now);
  return { ...r, rewardedToday: r.rewardedToday + 1, placementToday: { ...r.placementToday, [placementId]: (r.placementToday[placementId] ?? 0) + 1 }, lastRewardedAt: now };
}
