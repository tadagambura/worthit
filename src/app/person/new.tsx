import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { track } from '@/kit/analytics';
import { useCelebrate } from '@/kit/celebrate';
import { useTheme } from '@/kit/theme';
import { Button, Field, Muted, Note, Screen, Section } from '@/kit/ui';
import { usePeople } from '@/state/people';

const EMOJIS = ['😎', '🥰', '🤠', '🧐', '😈', '🦊', '🐻', '🌶️', '🎸', '⚽', '🎨', '📚'];

export default function NewPerson() {
  const { c } = useTheme();
  const celebrate = useCelebrate();
  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState('😎');
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (!nickname.trim()) return setErr('Give them a nickname, like "Gym guy" or "Bumble Sam".');
    const id = usePeople.getState().add(nickname.trim(), emoji);
    track('core_action_completed', { what: 'person_added' });
    celebrate({ scene: 'detective', emoji: '🕵️', title: 'Case opened', body: 'The detective inspects the fingerprint. Now, how is it going?' });
    router.replace(`/checkin?id=${id}`);
  };
  return (
    <Screen edges={['bottom']} testID="person-new" footer={<Button title="Add and check in" onPress={save} testID="person-save" />}>
      <Field label="Nickname" value={nickname} onChangeText={(t) => { setNickname(t); setErr(null); }} placeholder='e.g. "Gym guy"' maxLength={24} testID="person-nickname" />
      <Muted>Please use a nickname, not a real name. It keeps them private too.</Muted>
      <Section title="Pick an icon">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {EMOJIS.map((e) => (
            <Pressable key={e} accessibilityRole="radio" aria-checked={emoji === e} accessibilityState={{ checked: emoji === e }} accessibilityLabel={`Icon ${e}`} onPress={() => setEmoji(e)} style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: emoji === e ? c.primary : 'transparent', backgroundColor: c.surface }}>
              <Text style={{ fontSize: 26 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
      {err ? <Note tone="warning">{err}</Note> : null}
    </Screen>
  );
}
