// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Learning cards: the "links that make life easier" layer in every app. 20 cards are free, Premium
// unlocks the rest. Every card shows its source. Optional quick quiz. Progress is stored locally.
import * as WebBrowser from 'expo-web-browser';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeAdCard } from './ads';
import { track } from './analytics';
import { formatDay, todayKey, type DayKey } from './dates';
import { PaywallSheet } from './Paywall';
import { usePremium } from './premium';
import { persisted } from './store';
import { useTheme } from './theme';
import { Body, Button, Card, Chip, EmptyState, H2, Muted, Note, ProgressBar, Row, Section, Sheet, Stack, Strong, Toggle } from './ui';

export const FREE_CARDS = 20;
/** One native ad (apps with a learn_native placement), after this many cards: below the fold, never first. */
const NATIVE_AD_AFTER = 3;

/** Stable per-card option order, so the right answer isn't always in the same slot. */
export function optionOrder(id: string, n: number): number[] {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export type LearnCard = {
  id: string;
  topic: string;
  title: string;
  body: string;
  quiz?: { q: string; options: string[]; answer: number; explain: string } | null;
  source: { name: string; url: string };
  tags?: string[];
  plants?: string[];
};
export type CardPack = { pack: string; version: number; checked: string; reviewed: boolean; cards: LearnCard[] };

type CardsState = { read: Record<string, { day: DayKey; correct: boolean | null }>; saved: string[]; markRead: (id: string, correct: boolean | null) => void; toggleSaved: (id: string) => void };

const stores = new Map<string, ReturnType<typeof make>>();
function make(app: string) {
  return persisted<CardsState>(`${app}.cards`, 1, (set) => ({
    read: {},
    saved: [],
    markRead: (id, correct) => set((s) => ({ read: { ...s.read, [id]: s.read[id] ?? { day: todayKey(), correct } } })),
    toggleSaved: (id) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
  }));
}
export function cardsStore(app: string) {
  let s = stores.get(app);
  if (!s) {
    s = make(app);
    stores.set(app, s);
  }
  return s;
}

/** Which cards a person can open: the first FREE_CARDS of the pack, or all with Premium. */
export function unlocked(pack: CardPack, premium: boolean): Set<string> {
  return new Set((premium ? pack.cards : pack.cards.slice(0, FREE_CARDS)).map((c) => c.id));
}

/** The next unread unlocked card, for a "card of the day" slot. */
export function nextCard(pack: CardPack, premium: boolean, read: Record<string, unknown>, prefer?: (c: LearnCard) => boolean): LearnCard | null {
  const open = pack.cards.filter((c) => unlocked(pack, premium).has(c.id) && !read[c.id]);
  return (prefer ? open.find(prefer) : undefined) ?? open[0] ?? null;
}

export function CardView({ card, app, onDone }: { card: LearnCard; app: string; onDone?: () => void }) {
  const { c, radius } = useTheme();
  const useCards = cardsStore(app);
  const st = useCards();
  const [picked, setPicked] = useState<number | null>(null);
  const done = st.read[card.id];
  const finish = (correct: boolean | null) => {
    st.markRead(card.id, correct);
    track('value_delivered', { what: 'card', correct });
  };
  return (
    <Stack gap={12}>
      <Chip label={card.topic} />
      <H2>{card.title}</H2>
      <Body>{card.body}</Body>
      <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(card.source.url)}>
        <Muted color={c.primary}>{`Source: ${card.source.name} ↗`}</Muted>
      </Pressable>
      {card.quiz ? (
        <Stack gap={8}>
          <Strong>{card.quiz.q}</Strong>
          {optionOrder(card.id, card.quiz.options.length).map((i, pos) => {
            const o = card.quiz!.options[i];
            const show = picked != null || !!done;
            const right = i === card.quiz!.answer;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${o}${show && right ? ', correct answer' : ''}`}
                disabled={show}
                onPress={() => {
                  setPicked(i);
                  finish(i === card.quiz!.answer);
                }}
                testID={`card-quiz-${pos}`}
                style={{ padding: 12, borderRadius: radius, borderWidth: 1.5, borderColor: show && right ? c.success : c.border, backgroundColor: show && right ? c.surfaceAlt : c.surface }}
              >
                <Text style={{ color: c.text, fontWeight: '600' }}>{`${show && right ? '✓ ' : ''}${o}`}</Text>
              </Pressable>
            );
          })}
          {picked != null || done ? <Note>{card.quiz.explain}</Note> : null}
        </Stack>
      ) : !done ? (
        <Button title="Got it" onPress={() => finish(null)} testID="card-done" />
      ) : null}
      <Row gap={8}>
        <Button small variant="secondary" title={st.saved.includes(card.id) ? 'Saved ★' : 'Save'} onPress={() => st.toggleSaved(card.id)} />
        {onDone ? <Button small variant="ghost" title="Close" onPress={onDone} /> : null}
      </Row>
      {done ? <Muted>{`Read ${formatDay(done.day)}`}</Muted> : null}
    </Stack>
  );
}

/** The card library: progress, topic filters, optional "relevant to me", locked cards for free users. */
export function CardLibrary({ pack, app, relevant, relevantLabel }: { pack: CardPack; app: string; relevant?: (c: LearnCard) => boolean; relevantLabel?: string }) {
  const { c } = useTheme();
  const { isPremium } = usePremium();
  const useCards = cardsStore(app);
  const st = useCards();
  const [topic, setTopic] = useState<string | null>(null);
  const [mine, setMine] = useState(!!relevant);
  const [open, setOpen] = useState<LearnCard | null>(null);
  const [paywall, setPaywall] = useState(false);
  const free = useMemo(() => unlocked(pack, isPremium), [pack, isPremium]);
  const topics = [...new Set(pack.cards.map((x) => x.topic))];
  const list = pack.cards.filter((x) => (!topic || x.topic === topic) && (!mine || !relevant || relevant(x)));
  const readCount = pack.cards.filter((x) => st.read[x.id]).length;

  return (
    <View style={{ gap: 12 }} testID="card-library">
      <Stack gap={4}>
        <Muted testID="cards-progress">{`${readCount} of ${pack.cards.length} cards read${isPremium ? '' : ` · ${FREE_CARDS} free`}`}</Muted>
        <ProgressBar value={readCount / pack.cards.length} label="Cards read" />
      </Stack>
      {relevant ? <Toggle label={relevantLabel ?? 'Relevant to me'} value={mine} onChange={setMine} testID="cards-mine" /> : null}
      <Row wrap gap={6}>
        <Chip label="All" selected={!topic} onPress={() => setTopic(null)} />
        {topics.map((t) => (
          <Chip key={t} label={t} selected={topic === t} onPress={() => setTopic(topic === t ? null : t)} />
        ))}
      </Row>
      {list.length === 0 ? <EmptyState icon="book-outline" title="No cards here yet" /> : null}
      <Section title="Cards">
        {list.map((x, i) => {
          const locked = !free.has(x.id);
          const read = !!st.read[x.id];
          return (
            <Fragment key={x.id}>
            {i === NATIVE_AD_AFTER ? <NativeAdCard placement="learn_native" /> : null}
            <Card onPress={() => (locked ? setPaywall(true) : setOpen(x))} testID={`card-${x.id}`} accessibilityLabel={`${x.title}${locked ? ', Premium' : read ? ', read' : ''}`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Strong style={{ flex: 1 }}>{`${read ? '✓ ' : ''}${x.title}`}</Strong>
                <Text style={{ color: c.textMuted }}>{locked ? '🔒' : st.saved.includes(x.id) ? '★' : ''}</Text>
              </Row>
              <Muted>{x.topic}</Muted>
            </Card>
            </Fragment>
          );
        })}
      </Section>
      <Muted>{`General information, not professional advice. Checked ${formatDay(pack.checked)}.`}</Muted>
      <Sheet visible={!!open} onClose={() => setOpen(null)} title="Card" testID="card-sheet">
        {open ? <CardView card={open} app={app} onDone={() => setOpen(null)} /> : null}
      </Sheet>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} reason={`${FREE_CARDS} cards are free. Premium unlocks every card, and new ones as they're added.`} />
    </View>
  );
}
