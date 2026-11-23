// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Inputs that work the same with a finger, a keyboard and a screen reader, on phone and web.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { addDays, diffDays, formatDay, relativeDay, todayKey, type DayKey } from './dates';
import { parseGBP, toInput, type Pence } from './money';
import { Body, Field, IconButton, Muted, Row } from './ui';
import { useTheme } from './theme';

/** A £ amount field. Calls onChange with pence, or null while the text isn't a valid amount. */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  testID,
  autoFocus,
  onSubmit,
}: {
  label: string;
  value: Pence | null;
  onChange: (p: Pence | null) => void;
  hint?: string;
  testID?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const [text, setText] = useState(value != null ? toInput(value) : '');
  const [touched, setTouched] = useState(false);
  // Controlled: if the screen changes the value (a suggested fee, a reset), show it.
  useEffect(() => {
    const current = text.trim() === '' ? null : parseGBP(text);
    if (value !== current) setText(value == null ? '' : toInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const parsed = text.trim() === '' ? null : parseGBP(text);
  const error = touched && text.trim() !== '' && parsed == null ? 'Enter an amount like 12 or 12.50' : null;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      prefix="£"
      value={text}
      inputMode="decimal"
      keyboardType="decimal-pad"
      placeholder="0.00"
      autoFocus={autoFocus}
      testID={testID}
      returnKeyType="done"
      onSubmitEditing={onSubmit}
      onBlur={() => setTouched(true)}
      onChangeText={(t) => {
        setText(t);
        onChange(t.trim() === '' ? null : parseGBP(t));
      }}
    />
  );
}

/** Pick a day with big − / + buttons. No native picker, so it behaves the same everywhere. */
export function DateStepper({ label, value, onChange, min, max, testID }: { label: string; value: DayKey; onChange: (k: DayKey) => void; min?: DayKey; max?: DayKey; testID?: string }) {
  const { c, radius } = useTheme();
  const can = (k: DayKey) => (!min || diffDays(min, k) >= 0) && (!max || diffDays(k, max) >= 0);
  const step = (n: number) => {
    const k = addDays(value, n);
    if (can(k)) onChange(k);
  };
  return (
    <View style={{ gap: 6 }} testID={testID}>
      <Body style={{ fontWeight: '600' }}>{label}</Body>
      <Row style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: radius, backgroundColor: c.surface, paddingHorizontal: 4, justifyContent: 'space-between' }}>
        <IconButton icon="remove" label="Previous day" onPress={() => step(-1)} testID={testID ? `${testID}-prev` : undefined} />
        <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${label}: ${formatDay(value, 'long')}`} accessibilityLiveRegion="polite">
          <Body style={{ fontWeight: '700' }} testID={testID ? `${testID}-value` : undefined}>
            {formatDay(value, 'long')}
          </Body>
          <Muted>{relativeDay(value, todayKey())}</Muted>
        </View>
        <IconButton icon="add" label="Next day" onPress={() => step(1)} testID={testID ? `${testID}-next` : undefined} />
      </Row>
    </View>
  );
}
