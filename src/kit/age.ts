// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Age assurance for adult (18+) content. Layers, strongest first:
//   1. The store's own age signal (Apple Declared Age Range, Google Play Age Signals), via a
//      native module when the build includes one. A store "under 18" always blocks.
//   2. An optional third-party age-assurance provider (for example Yoti or Persona), for when
//      the law asks for "highly effective age assurance". If the app requires one and none is
//      configured, adult content stays locked (fail closed).
//   3. Date of birth, typed by the person. We keep only "18+ confirmed on <date>", never the
//      date of birth itself. Entering an under-18 date locks the check for a day, so it can't
//      simply be retried with a different year.
import { requireOptionalNativeModule } from 'expo';

export type AgeStatus = 'adult' | 'minor' | 'unknown';
export type AgeMethod = 'store' | 'provider' | 'self_declared';

export type AgeRecord = {
  /** Result of the last check. */
  status: AgeStatus;
  method: AgeMethod | null;
  checkedAt: string | null;
  /** After an under-18 answer, no new attempt before this time. */
  lockedUntil: string | null;
};

export const EMPTY_AGE: AgeRecord = { status: 'unknown', method: null, checkedAt: null, lockedUntil: null };

export const ADULT_AGE = 18;
const LOCK_MS = 24 * 60 * 60 * 1000;
/** Ask again after a year, so a shared or handed-down phone gets re-checked. */
const RECHECK_MS = 365 * 24 * 60 * 60 * 1000;

/** Whole years between a date of birth and today. Handles leap-day birthdays (they turn a year older on 1 March). */
export function ageOn(dob: { y: number; m: number; d: number }, today: Date): number {
  let age = today.getFullYear() - dob.y;
  const m = today.getMonth() + 1;
  const d = today.getDate();
  if (m < dob.m || (m === dob.m && d < dob.d)) age--;
  return age;
}

export function validDob(dob: { y: number; m: number; d: number }, today: Date): boolean {
  if (!Number.isInteger(dob.y) || !Number.isInteger(dob.m) || !Number.isInteger(dob.d)) return false;
  if (dob.y < today.getFullYear() - 120 || dob.m < 1 || dob.m > 12 || dob.d < 1) return false;
  const days = new Date(Date.UTC(dob.y, dob.m, 0)).getUTCDate();
  if (dob.d > days) return false;
  return new Date(dob.y, dob.m - 1, dob.d).getTime() <= today.getTime();
}

export type AgeDecision = { allowed: boolean; reason: 'ok' | 'needs_check' | 'minor' | 'locked' | 'needs_provider' | 'store_minor' };

export type AgePolicy = {
  /** Require a third-party age-assurance provider (not just a typed date of birth). */
  requireProvider: boolean;
};

export const DEFAULT_AGE_POLICY: AgePolicy = { requireProvider: false };

/** Can this person see adult content right now? */
export function decideAge(rec: AgeRecord, storeSignal: AgeStatus, policy: AgePolicy, now: Date): AgeDecision {
  if (storeSignal === 'minor') return { allowed: false, reason: 'store_minor' };
  if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now.getTime()) return { allowed: false, reason: 'locked' };
  if (rec.status === 'minor') return { allowed: false, reason: 'minor' };
  const fresh = rec.checkedAt != null && now.getTime() - new Date(rec.checkedAt).getTime() < RECHECK_MS;
  if (policy.requireProvider) {
    if (rec.status === 'adult' && rec.method === 'provider' && fresh) return { allowed: true, reason: 'ok' };
    if (storeSignal === 'adult') return { allowed: true, reason: 'ok' };
    return { allowed: false, reason: 'needs_provider' };
  }
  if (storeSignal === 'adult') return { allowed: true, reason: 'ok' };
  if (rec.status === 'adult' && fresh) return { allowed: true, reason: 'ok' };
  return { allowed: false, reason: 'needs_check' };
}

/** Record a typed date of birth. Returns the new record; the date itself is never stored. */
export function recordDob(dob: { y: number; m: number; d: number }, now: Date): AgeRecord {
  const adult = ageOn(dob, now) >= ADULT_AGE;
  return adult
    ? { status: 'adult', method: 'self_declared', checkedAt: now.toISOString(), lockedUntil: null }
    : { status: 'minor', method: 'self_declared', checkedAt: now.toISOString(), lockedUntil: new Date(now.getTime() + LOCK_MS).toISOString() };
}

/** After the lock expires, a minor result can be retried (someone else may be holding the phone). */
export function clearExpiredLock(rec: AgeRecord, now: Date): AgeRecord {
  if (rec.status === 'minor' && rec.lockedUntil && new Date(rec.lockedUntil).getTime() <= now.getTime()) return EMPTY_AGE;
  return rec;
}

// ---------- store signals (native, optional) ----------

type AgeSignalModule = { getAgeStatus: () => Promise<AgeStatus> };
let signals: AgeSignalModule | null = null;
try {
  // A small native module wrapping Apple's DeclaredAgeRange and Google Play's Age Signals API.
  // Not in the build yet: until it is, this returns 'unknown' and the other layers decide.
  signals = requireOptionalNativeModule<AgeSignalModule>('KCAgeSignals');
} catch {
  signals = null;
}

export async function storeAgeSignal(): Promise<AgeStatus> {
  if (!signals) return 'unknown';
  try {
    return await signals.getAgeStatus();
  } catch {
    return 'unknown';
  }
}

// ---------- third-party providers (optional) ----------

export type AgeProvider = { name: string; verify: () => Promise<AgeStatus> };
let provider: AgeProvider | null = null;

/** Apps register a provider at start-up once one is contracted. */
export function setAgeProvider(p: AgeProvider | null) {
  provider = p;
}

export function ageProvider(): AgeProvider | null {
  return provider;
}

export function recordProvider(result: AgeStatus, now: Date): AgeRecord {
  if (result === 'adult') return { status: 'adult', method: 'provider', checkedAt: now.toISOString(), lockedUntil: null };
  if (result === 'minor') return { status: 'minor', method: 'provider', checkedAt: now.toISOString(), lockedUntil: new Date(now.getTime() + LOCK_MS).toISOString() };
  return EMPTY_AGE;
}
