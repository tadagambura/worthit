// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Product analytics adapter. One shared event taxonomy, tagged with app_id, so one PostHog
// project can serve every app (see docs/research: PostHog free tier = 1 project).
//
// Privacy rules, enforced here:
// - Property values must be numbers, booleans, short enums or null. Strings over 40 characters
//   are dropped, so free text (names, notes, amounts typed by people) can't leak by accident.
// - No events are sent until an EXPO_PUBLIC_POSTHOG_KEY exists. Until then, events go to an
//   in-memory debug log you can see in Settings in development builds.
import { kv } from './storage';
import { dayKey, diffDays } from './dates';

export type EventName =
  | 'app_opened'
  | 'return_session'
  | 'onboarding_completed'
  | 'core_action_started'
  | 'core_action_completed'
  | 'value_delivered'
  | 'milestone_reached'
  | 'share_completed'
  | 'reminder_enabled'
  | 'reminder_disabled'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'purchase_restored'
  | 'data_exported'
  | 'data_deleted'
  | 'error_shown';

type Value = string | number | boolean | null;
export type Props = Record<string, Value>;

type Sink = (event: string, props: Props) => void;

const log: { event: string; props: Props; at: string }[] = [];
let app = 'unknown';
let sink: Sink | null = null;

export function initAnalytics(appId: string, liveSink?: Sink) {
  app = appId;
  sink = liveSink ?? null;
  const today = dayKey();
  const lastKey = `${appId}.analytics.lastOpen`;
  const last = kv.get(lastKey);
  track('app_opened');
  if (last && last !== today) track('return_session', { days_since_last: diffDays(last, today) });
  kv.set(lastKey, today);
}

export function track(event: EventName, props: Props = {}) {
  const clean: Props = { app_id: app };
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 40) continue;
    clean[k] = v;
  }
  log.push({ event, props: clean, at: new Date().toISOString() });
  if (log.length > 200) log.shift();
  try {
    sink?.(event, clean);
  } catch {
    // Analytics must never break the app.
  }
}

export const analyticsMode = () => (sink ? 'live' : 'debug');
export const debugEvents = () => [...log].reverse();
