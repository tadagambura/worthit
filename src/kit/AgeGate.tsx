// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The 18+ check UI and hook. See age.ts for the rules.
//   const adult = useAdultAccess(brand.slug);
//   if (!adult.allowed) <AgeCheckSheet visible … onDone={…} />
import { useCallback, useEffect, useMemo, useState } from 'react';
import { track } from './analytics';
import {
  ageProvider,
  clearExpiredLock,
  decideAge,
  DEFAULT_AGE_POLICY,
  EMPTY_AGE,
  recordDob,
  recordProvider,
  storeAgeSignal,
  validDob,
  type AgeDecision,
  type AgePolicy,
  type AgeRecord,
  type AgeStatus,
} from './age';
import { View } from 'react-native';
import { persisted } from './store';
import { Body, Button, Field, H2, Muted, Note, Row, Sheet, Stack } from './ui';

type AgeState = AgeRecord & { save: (r: AgeRecord) => void };
const stores = new Map<string, ReturnType<typeof make>>();
function make(app: string) {
  return persisted<AgeState>(`${app}.age`, 1, (set) => ({ ...EMPTY_AGE, save: (r) => set({ ...r }) }));
}
function ageStore(app: string) {
  let s = stores.get(app);
  if (!s) {
    s = make(app);
    stores.set(app, s);
  }
  return s;
}

export type AdultAccess = AgeDecision & {
  record: AgeRecord;
  storeSignal: AgeStatus;
  submitDob: (dob: { y: number; m: number; d: number }) => { ok: boolean; message: string };
  verifyWithProvider: (() => Promise<{ ok: boolean; message: string }>) | null;
  /** "Not me / hide adult content": forget the confirmation on this device. */
  forget: () => void;
};

export function useAdultAccess(app: string, policy: AgePolicy = DEFAULT_AGE_POLICY): AdultAccess {
  const useAge = ageStore(app);
  const rec = useAge();
  const [signal, setSignal] = useState<AgeStatus>('unknown');
  useEffect(() => {
    storeAgeSignal().then(setSignal);
  }, []);
  const now = new Date();
  const record: AgeRecord = clearExpiredLock({ status: rec.status, method: rec.method, checkedAt: rec.checkedAt, lockedUntil: rec.lockedUntil }, now);
  const decision = decideAge(record, signal, policy, now);

  const submitDob = useCallback(
    (dob: { y: number; m: number; d: number }) => {
      const today = new Date();
      if (!validDob(dob, today)) return { ok: false, message: "That date doesn't look right. Check the day, month and year." };
      const r = recordDob(dob, today);
      rec.save(r);
      track('age_check_completed', { result: r.status, method: 'self_declared' });
      return r.status === 'adult'
        ? { ok: true, message: 'Thanks. Adult decks are unlocked on this device.' }
        : { ok: false, message: "Sorry, these decks are for adults only. Everything else in the app is yours to enjoy." };
    },
    [rec],
  );

  const p = ageProvider();
  const verifyWithProvider = useMemo(
    () =>
      p
        ? async () => {
            const result = await p.verify().catch(() => 'unknown' as const);
            const r = recordProvider(result, new Date());
            rec.save(r);
            track('age_check_completed', { result, method: 'provider' });
            return result === 'adult' ? { ok: true, message: 'Verified. Adult decks are unlocked.' } : { ok: false, message: result === 'minor' ? 'Sorry, adults only.' : "We couldn't verify your age this time. Nothing was saved." };
          }
        : null,
    [p, rec],
  );

  return { ...decision, record, storeSignal: signal, submitDob, verifyWithProvider, forget: () => rec.save(EMPTY_AGE) };
}

const digits = (s: string) => s.replace(/[^0-9]/g, '');

export function AgeCheckSheet({ visible, onClose, onDone, access, what }: { visible: boolean; onClose: () => void; onDone: () => void; access: AdultAccess; what: string }) {
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setD('');
      setM('');
      setY('');
      setMsg(null);
    }
  }, [visible]);

  const blocked = access.reason === 'locked' || access.reason === 'minor' || access.reason === 'store_minor';

  return (
    <Sheet visible={visible} onClose={onClose} title="Adults only (18+)" testID="age-check">
      <Stack gap={12}>
        <H2>{`${what} is for adults aged 18 and over.`}</H2>
        {blocked ? (
          <Note tone="warning">
            {access.reason === 'store_minor'
              ? 'Your app store account says you are under 18, so adult decks stay hidden. Everything else in the app is yours.'
              : 'Adult decks are locked on this phone for now. Everything else in the app is yours to enjoy.'}
          </Note>
        ) : access.reason === 'needs_provider' ? (
          <>
            <Body>To open adult content we need a quick, private age check from our verification partner. We never see your ID.</Body>
            {access.verifyWithProvider ? (
              <Button
                title="Check my age"
                loading={busy}
                testID="age-provider"
                onPress={async () => {
                  setBusy(true);
                  const r = await access.verifyWithProvider!();
                  setBusy(false);
                  setMsg(r.message);
                  if (r.ok) onDone();
                }}
              />
            ) : (
              <Note>Adult decks aren't available in your region yet.</Note>
            )}
          </>
        ) : (
          <>
            <Body>Enter your date of birth. We only keep the answer "18+ confirmed", never the date itself.</Body>
            <Row gap={8}>
              <View style={{ flex: 1 }}>
                <Field label="Day" value={d} onChangeText={(t) => setD(digits(t).slice(0, 2))} keyboardType="number-pad" placeholder="DD" testID="age-day" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Month" value={m} onChangeText={(t) => setM(digits(t).slice(0, 2))} keyboardType="number-pad" placeholder="MM" testID="age-month" />
              </View>
              <View style={{ flex: 1.4 }}>
                <Field label="Year" value={y} onChangeText={(t) => setY(digits(t).slice(0, 4))} keyboardType="number-pad" placeholder="YYYY" testID="age-year" />
              </View>
            </Row>
            <Button
              title="Confirm"
              disabled={!d || !m || y.length !== 4}
              testID="age-confirm"
              onPress={() => {
                const r = access.submitDob({ y: Number(y), m: Number(m), d: Number(d) });
                setMsg(r.message);
                if (r.ok) onDone();
              }}
            />
          </>
        )}
        {msg ? <Muted testID="age-message">{msg}</Muted> : null}
        <Muted>{"Adult decks are text only, for consenting adults. Either of you can skip any card, any time. They never appear in notifications, widgets or 'tonight's card'."}</Muted>
        <Button title="Not for me" variant="ghost" onPress={onClose} testID="age-cancel" />
      </Stack>
    </Sheet>
  );
}
