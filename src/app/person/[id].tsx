import { router, Stack as RouterStack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Text } from 'react-native';
import { useCelebrate } from '@/kit/celebrate';
import { formatDay } from '@/kit/dates';
import { useFeedback } from '@/kit/feedback';
import { usePremium } from '@/kit/premium';
import { shareText } from '@/kit/share';
import { useTheme } from '@/kit/theme';
import { Body, Button, Card, EmptyState, Field, H2, IconButton, Label, Muted, Note, Row, Screen, Section, Sheet, Stack, Strong } from '@/kit/ui';
import { balancedTake, score, verdict } from '@/domain/score';
import { usePeople } from '@/state/people';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePeople((s) => s.people.find((x) => x.id === id));
  const { c, font } = useTheme();
  const { isPremium } = usePremium();
  const { confirm, toast } = useFeedback();
  const celebrate = useCelebrate();
  const [note, setNote] = useState('');
  const [ending, setEnding] = useState(false);
  const [lesson, setLesson] = useState('');
  if (!p) return <Screen edges={[]}><EmptyState title="Not here any more" action={<Button title="Back" onPress={() => router.replace('/')} />} /></Screen>;

  const last = p.checkIns[p.checkIns.length - 1];
  const s = last ? score(last) : null;
  const v = s == null ? null : verdict(s);
  const take = last ? balancedTake(last) : null;

  return (
    <Screen edges={[]} testID="person">
      <RouterStack.Screen options={{ title: `${p.emoji} ${p.nickname}` }} />
      <Card tone="alt">
        <Label>Worth It score</Label>
        <Row style={{ alignItems: 'flex-end' }} gap={8}>
          <Text testID="person-score" style={{ fontFamily: font.display, fontSize: 52, color: c.primary }}>{s ?? '?'}</Text>
          <Muted>/ 100</Muted>
        </Row>
        <Strong>{v ? `${v.emoji} ${v.label}` : 'Do a check-in to get a score'}</Strong>
        {last ? <Muted>{`Last check-in ${formatDay(last.day)} · ${p.checkIns.length} in total`}</Muted> : null}
        <Row wrap gap={8}>
          <Button small title={last ? 'New check-in' : 'Check in'} icon="pulse-outline" onPress={() => router.push(`/checkin?id=${p.id}`)} testID="person-checkin" />
          {s != null ? <Button small variant="secondary" title="Share my score" icon="share-outline" onPress={() => shareText(`My situationship scored ${s}/100 on WorthIt?. ${v!.label} ${v!.emoji}`, 'score')} /> : null}
        </Row>
      </Card>

      {take?.safety ? (
        <Note tone="warning">{"You said you feel unsafe. That matters more than any score. If you're in danger call 999. The National Domestic Abuse Helpline is free and open 24/7: 0808 2000 247."}</Note>
      ) : null}
      {take?.safety ? <Button small variant="secondary" title="Call 0808 2000 247" onPress={() => Linking.openURL('tel:08082000247')} /> : null}

      {take ? (
        <Section title="A balanced take (from your answers, no AI)">
          <Card testID="take">
            <Strong>Going well</Strong>
            {take.strengths.length ? take.strengths.map((x) => <Body key={x}>{`💚 ${x}`}</Body>) : <Muted>Nothing stands out yet.</Muted>}
            <Strong>Worth watching</Strong>
            {take.concerns.length ? take.concerns.map((x) => <Body key={x}>{`🚩 ${x}`}</Body>) : <Muted>No red flags from what you said.</Muted>}
            {take.questions.length ? (
              <>
                <Strong>Questions worth asking</Strong>
                {take.questions.map((x) => <Body key={x}>{`💬 ${x}`}</Body>)}
              </>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {isPremium && p.checkIns.length > 1 ? (
        <Section title="Over time">
          <Muted>{p.checkIns.map((x) => `${formatDay(x.day)}: ${score(x)}`).join(' · ')}</Muted>
        </Section>
      ) : null}

      <Section title="Private notes">
        <Field label="Add a note" value={note} onChangeText={setNote} placeholder="What happened, how it felt…" multiline maxLength={500} testID="note-input" />
        <Button small variant="secondary" title="Save note" disabled={!note.trim()} onPress={() => { usePeople.getState().addNote(p.id, note.trim()); setNote(''); }} testID="note-save" />
        {p.notes.map((n) => (
          <Row key={n.id} style={{ alignItems: 'flex-start' }}>
            <Stack gap={2} style={{ flex: 1 }}>
              <Muted>{formatDay(n.day)}</Muted>
              <Body>{n.text}</Body>
            </Stack>
            <IconButton icon="trash-outline" label="Delete note" onPress={() => usePeople.getState().removeNote(p.id, n.id)} />
          </Row>
        ))}
      </Section>

      {p.ended ? (
        <Button title="Actually, it's back on" variant="secondary" onPress={() => usePeople.getState().reopen(p.id)} />
      ) : (
        <Button title="It's over" variant="secondary" icon="exit-outline" onPress={() => setEnding(true)} testID="person-end" />
      )}
      <Button
        title="Delete everything about them"
        variant="danger"
        onPress={async () => {
          if (!(await confirm({ title: `Delete ${p.nickname}?`, body: 'Notes and check-ins are removed from this phone.', confirmLabel: 'Delete', destructive: true }))) return;
          const removed = usePeople.getState().remove(p.id);
          router.back();
          toast('Deleted.', { actionLabel: 'Undo', onAction: () => removed && usePeople.getState().restore(removed) });
        }}
      />

      <Sheet visible={ending} onClose={() => setEnding(false)} title="Closing the door">
        <Stack>
          <H2>What did you learn?</H2>
          <Field label="One line for future you (optional)" value={lesson} onChangeText={setLesson} maxLength={120} placeholder="e.g. I deserve someone who texts back" testID="end-lesson" />
          <Button
            title="NEXT!"
            testID="end-save"
            onPress={() => {
              usePeople.getState().end(p.id, lesson.trim());
              setEnding(false);
              celebrate({ scene: 'next', emoji: '🚪', title: 'NEXT!', body: 'The door shuts dramatically. Onwards.' });
              router.back();
            }}
          />
        </Stack>
      </Sheet>
    </Screen>
  );
}
