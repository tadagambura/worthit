import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { track } from '@/kit/analytics';
import { useCelebrate } from '@/kit/celebrate';
import { useTheme } from '@/kit/theme';
import { Button, Chip, EmptyState, Field, Muted, Row, Screen, Section, Segmented, Stack, Strong } from '@/kit/ui';
import { blank, GREEN_FLAGS, pattern, RED_FLAGS, YELLOW_FLAGS, type CheckIn } from '@/domain/clarity';
import { usePeople } from '@/state/people';

const FACES = ['😣', '😕', '😐', '🙂', '😌'];

function Feel({ label, value, onChange, id }: { label: string; value: number; onChange: (n: number) => void; id: string }) {
  const { c, radius } = useTheme();
  return (
    <Stack gap={6}>
      <Strong>{label}</Strong>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 6 }}>
        {FACES.map((f, i) => {
          const on = value === i + 1;
          return (
            <Pressable key={f} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} accessibilityLabel={`${label}: ${i + 1} of 5`} onPress={() => onChange(i + 1)} testID={`${id}-${i + 1}`} style={{ flex: 1, height: 48, borderRadius: radius - 4, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : c.surface, borderWidth: 1.5, borderColor: on ? c.primary : c.border }}>
              <Text style={{ fontSize: 22 }}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
    </Stack>
  );
}

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = usePeople((s) => s.people.find((p) => p.id === id));
  const celebrate = useCelebrate();
  const [ci, setCi] = useState<Omit<CheckIn, 'day'>>(blank());
  const [said, setSaid] = useState('');
  const [did, setDid] = useState('');
  const [matched, setMatched] = useState<'yes' | 'no'>('yes');
  if (!person) return <Screen edges={[]}><EmptyState title="Not found" /></Screen>;
  const toggle = (k: 'green' | 'yellow' | 'red', f: string) => setCi({ ...ci, [k]: ci[k].includes(f) ? ci[k].filter((x) => x !== f) : [...ci[k], f] });

  const save = () => {
    const entry = { ...ci, words: said.trim() || did.trim() ? { said: said.trim(), did: did.trim(), matched: matched === 'yes' } : null };
    usePeople.getState().checkIn(person.id, entry);
    const p = pattern([...person.checkIns, { ...entry, day: '' }]);
    track('core_action_completed', { what: 'check_in', read: p.read });
    if (p.read === 'green') celebrate({ scene: 'high', emoji: '💒', title: 'Mostly green!', body: 'Wedding bells. Two stickmen slow-motion run at each other… and miss.' });
    else if (p.read === 'red') celebrate({ scene: 'low', emoji: '🚨', title: 'Red-flag sirens', body: 'Kaos ducks behind the sofa. Protect your peace.' });
    if (router.canGoBack()) router.back();
    else router.replace(`/person/${person.id}`);
  };

  return (
    <Screen edges={['bottom']} testID="checkin" footer={<Button title="Save check-in" onPress={save} testID="checkin-save" />}>
      <Strong>{`${person.emoji} ${person.nickname}: how was it, really?`}</Strong>
      <Feel label="Before seeing or talking to them, I felt…" value={ci.before} onChange={(n) => setCi({ ...ci, before: n })} id="before" />
      <Feel label="Afterwards, I felt…" value={ci.after} onChange={(n) => setCi({ ...ci, after: n })} id="after" />
      {(
        [
          ['green', 'Green flags 💚', GREEN_FLAGS],
          ['yellow', 'Yellow flags 💛', YELLOW_FLAGS],
          ['red', 'Red flags 🚩', RED_FLAGS],
        ] as const
      ).map(([k, title, list]) => (
        <Section key={k} title={title}>
          <Row wrap gap={8}>
            {list.map((f) => (
              <Chip key={f} label={f} selected={ci[k].includes(f)} onPress={() => toggle(k, f)} testID={`${k}-${f}`} />
            ))}
          </Row>
        </Section>
      ))}
      <Section title="Words vs actions (optional)">
        <Field label="What they said" value={said} onChangeText={setSaid} placeholder="e.g. I'll call you tomorrow" maxLength={80} testID="said" />
        <Field label="What they did" value={did} onChangeText={setDid} placeholder="e.g. Called the next evening" maxLength={80} testID="did" />
        <Segmented label="Did they match?" options={[{ value: 'yes', label: 'Matched' }, { value: 'no', label: "Didn't match" }]} value={matched} onChange={setMatched} testID="matched" />
      </Section>
      {person.boundaries.length ? (
        <Section title="Your boundaries this time">
          {person.boundaries.map((b) => (
            <Stack key={b} gap={4}>
              <Muted>{b}</Muted>
              <Row gap={8}>
                <Chip label="Kept" selected={ci.boundaries[b] === 'kept'} onPress={() => setCi({ ...ci, boundaries: { ...ci.boundaries, [b]: 'kept' } })} testID={`kept-${b}`} />
                <Chip label="Crossed" selected={ci.boundaries[b] === 'crossed'} onPress={() => setCi({ ...ci, boundaries: { ...ci.boundaries, [b]: 'crossed' } })} testID={`crossed-${b}`} />
              </Row>
            </Stack>
          ))}
        </Section>
      ) : null}
      <Field label="Private reflection (optional)" value={ci.note ?? ''} onChangeText={(t) => setCi({ ...ci, note: t })} multiline maxLength={400} placeholder="What's really going on in your head?" testID="reflection" />
    </Screen>
  );
}
