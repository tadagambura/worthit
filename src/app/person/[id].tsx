import * as Linking from 'expo-linking';
import { router, Stack as RouterStack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { track } from '@/kit/analytics';
import { useCelebrate } from '@/kit/celebrate';
import { formatDay } from '@/kit/dates';
import { useFeedback } from '@/kit/feedback';
import { shareText } from '@/kit/share';
import { useTheme } from '@/kit/theme';
import { Body, Button, Card, EmptyState, Field, H2, IconButton, Label, Muted, Note, Row, Screen, Section, Sheet, Stack, Strong } from '@/kit/ui';
import { feelLine, headline, questions, suggestAfterHours } from '@/domain/clarity';
import { patternOf, usePeople } from '@/state/people';

const pct = (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`);

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePeople((s) => s.people.find((x) => x.id === id));
  const { c } = useTheme();
  const { confirm, toast } = useFeedback();
  const celebrate = useCelebrate();
  const [note, setNote] = useState('');
  const [boundary, setBoundary] = useState('');
  const [ending, setEnding] = useState(false);
  const [lesson, setLesson] = useState('');
  if (!p) return <Screen edges={[]}><EmptyState title="Not here any more" action={<Button title="Back" onPress={() => router.replace('/')} />} /></Screen>;

  const pat = patternOf(p);
  const h = headline(pat, p.nickname);
  const total = pat.flags.green + pat.flags.yellow + pat.flags.red;
  const showAH = suggestAfterHours(pat) && !p.afterHoursShown;

  return (
    <Screen edges={[]} testID="person">
      <RouterStack.Screen options={{ title: `${p.emoji} ${p.nickname}` }} />
      <Card tone="alt" testID="pattern">
        <Label>The pattern so far</Label>
        <Row gap={10}>
          <Text style={{ fontSize: 40 }}>{h.emoji}</Text>
          <Strong style={{ flex: 1 }} testID="pattern-headline">{h.text}</Strong>
        </Row>
        {total ? (
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }} accessible accessibilityLabel={`${pat.flags.green} green, ${pat.flags.yellow} yellow and ${pat.flags.red} red flags`}>
            <View style={{ flex: pat.flags.green, backgroundColor: '#2E9E5B' }} />
            <View style={{ flex: pat.flags.yellow, backgroundColor: '#E8B92E' }} />
            <View style={{ flex: pat.flags.red, backgroundColor: '#D64545' }} />
          </View>
        ) : null}
        <Muted>{`💚 ${pat.flags.green} · 💛 ${pat.flags.yellow} · 🚩 ${pat.flags.red} · words matched actions ${pct(pat.wordsMatch)} · boundaries kept ${pct(pat.boundariesKept)}`}</Muted>
        {feelLine(pat.feelShift) ? <Body>{feelLine(pat.feelShift)}</Body> : null}
        <Row wrap gap={8}>
          <Button small title="Check in" icon="pulse-outline" onPress={() => router.push(`/checkin?id=${p.id}`)} testID="person-checkin" />
          {pat.read !== 'not-enough' && !pat.safety ? <Button small variant="secondary" title="Share" icon="share-outline" onPress={() => shareText(`${h.emoji} My situationship, according to WorthIt?: ${h.text.replace(p.nickname, 'them')}`, 'pattern')} /> : null}
        </Row>
      </Card>

      {pat.safety ? (
        <>
          <Note tone="warning">{"You said you feel unsafe. That matters more than anything else here. If you're in danger, call 999. The National Domestic Abuse Helpline is free and open 24/7: 0808 2000 247."}</Note>
          <Button small variant="secondary" title="Call 0808 2000 247" onPress={() => Linking.openURL('tel:08082000247')} />
        </>
      ) : null}

      {showAH ? (
        <Card tone="primary" testID="afterhours-nudge">
          <Strong color={c.primaryText}>{`Things look lovely with ${p.nickname} 💞`}</Strong>
          <Body color={c.primaryText}>Maybe you two might like AfterHours: better questions, games and date nights. Who knows, this might turn out to be more than a situationship.</Body>
          <Row gap={8}>
            <Button small variant="accent" title="Have a look" onPress={() => { track('core_action_started', { what: 'afterhours_nudge' }); usePeople.getState().markAfterHoursShown(p.id); WebBrowser.openBrowserAsync('https://kaoticchainz.com/#afterhours'); }} />
            <Button small variant="secondary" title="Not now" onPress={() => usePeople.getState().markAfterHoursShown(p.id)} testID="afterhours-dismiss" />
          </Row>
        </Card>
      ) : null}

      {pat.read !== 'not-enough' ? (
        <Section title="Worth asking">
          {questions(pat).map((q) => (
            <Body key={q}>{`💬 ${q}`}</Body>
          ))}
        </Section>
      ) : null}

      <Section title="Your boundaries with them">
        {p.boundaries.map((b) => (
          <Row key={b}>
            <Body style={{ flex: 1 }}>{`🛡️ ${b}`}</Body>
            <IconButton icon="close" label={`Remove boundary ${b}`} onPress={() => usePeople.getState().removeBoundary(p.id, b)} />
          </Row>
        ))}
        <Field label="Add a boundary" value={boundary} onChangeText={setBoundary} placeholder="e.g. No plans made after 10pm the same day" maxLength={60} testID="boundary-input" />
        <Button small variant="secondary" title="Add boundary" disabled={!boundary.trim()} onPress={() => { usePeople.getState().addBoundary(p.id, boundary.trim()); setBoundary(''); }} testID="boundary-add" />
        <Muted>Each check-in asks whether your boundaries were kept.</Muted>
      </Section>

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
        {p.checkIns.filter((x) => x.note).slice(-3).map((x, i) => (
          <Muted key={i}>{`${formatDay(x.day)} reflection: ${x.note}`}</Muted>
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
              celebrate({ scene: 'next', emoji: '🚪', title: 'NEXT!', body: 'Kaos shuts the door dramatically. Onwards.' });
              router.back();
            }}
          />
        </Stack>
      </Sheet>
    </Screen>
  );
}
