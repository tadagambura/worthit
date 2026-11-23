import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { track } from '@/kit/analytics';
import { useCelebrate } from '@/kit/celebrate';
import { useTheme } from '@/kit/theme';
import { Button, Chip, EmptyState, Muted, Row, Screen, Section, Stack, Strong } from '@/kit/ui';
import { DIMS, GREEN_FLAGS, neutral, RED_FLAGS, score, verdict, type Dim } from '@/domain/score';
import { usePeople } from '@/state/people';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = usePeople((s) => s.people.find((p) => p.id === id));
  const { c, radius } = useTheme();
  const celebrate = useCelebrate();
  const last = person?.checkIns[person.checkIns.length - 1];
  const [ratings, setRatings] = useState<Record<Dim, number>>(last?.ratings ?? neutral());
  const [green, setGreen] = useState<string[]>([]);
  const [red, setRed] = useState<string[]>([]);
  if (!person) return <Screen edges={[]}><EmptyState title="Not found" /></Screen>;
  const s = score({ ratings, green, red });
  const v = verdict(s);
  const toggle = (list: string[], set: (x: string[]) => void, f: string) => set(list.includes(f) ? list.filter((x) => x !== f) : [...list, f]);

  const save = () => {
    usePeople.getState().checkIn(person.id, { ratings, green, red });
    track('core_action_completed', { what: 'check_in', band: v.tone });
    if (v.tone === 'great') celebrate({ scene: 'high', emoji: '💒', title: `${s}/100: ${v.label}!`, body: 'Wedding bells. Two stickmen slow-motion run at each other… and miss.' });
    else if (v.tone === 'low') celebrate({ scene: 'low', emoji: '🚨', title: `${s}/100: ${v.label}`, body: 'Red-flag sirens. The stickman ducks behind the sofa.' });
    router.replace(`/person/${person.id}`);
  };

  return (
    <Screen edges={['bottom']} testID="checkin" footer={<Button title={`Save check-in (${s}/100)`} onPress={save} testID="checkin-save" />}>
      <Strong>{`${person.emoji} ${person.nickname}: how's it really going?`}</Strong>
      {DIMS.map((d) => (
        <Stack key={d.key} gap={6}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Strong>{d.label}</Strong>
            <Muted>{ratings[d.key] <= 2 ? d.low : ratings[d.key] >= 4 ? d.high : 'Somewhere between'}</Muted>
          </Row>
          <View accessibilityRole="radiogroup" accessibilityLabel={d.label} style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = ratings[d.key] === n;
              return (
                <Pressable key={n} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} accessibilityLabel={`${d.label} ${n} of 5`} onPress={() => setRatings({ ...ratings, [d.key]: n })} testID={`rate-${d.key}-${n}`} style={{ flex: 1, height: 44, borderRadius: radius - 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : c.surface, borderWidth: 1.5, borderColor: on ? c.primary : c.border }}>
                  <Text style={{ color: on ? c.primaryText : c.text, fontWeight: '700' }}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </Stack>
      ))}
      <Section title="Green flags 💚">
        <Row wrap gap={8}>
          {GREEN_FLAGS.map((f) => (
            <Chip key={f} label={f} selected={green.includes(f)} onPress={() => toggle(green, setGreen, f)} />
          ))}
        </Row>
      </Section>
      <Section title="Red flags 🚩">
        <Row wrap gap={8}>
          {RED_FLAGS.map((f) => (
            <Chip key={f} label={f} selected={red.includes(f)} onPress={() => toggle(red, setRed, f)} testID={`red-${f}`} />
          ))}
        </Row>
      </Section>
      <Muted>{`Live score: ${s}/100 · ${v.emoji} ${v.label}`}</Muted>
    </Screen>
  );
}
