import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { PaywallSheet } from '@/kit/Paywall';
import { usePremium } from '@/kit/premium';
import { useTheme } from '@/kit/theme';
import { Button, Card, EmptyState, H1, Muted, Row, Screen, Section, Stack, Strong } from '@/kit/ui';
import { trend, verdict } from '@/domain/score';
import { FREE_PEOPLE } from '@/brand';
import { latestScore, usePeople } from '@/state/people';

export default function Ranking() {
  const { c, font } = useTheme();
  const people = usePeople((s) => s.people);
  const { isPremium } = usePremium();
  const [paywall, setPaywall] = useState(false);
  const active = people.filter((p) => !p.ended);
  const ranked = [...active].sort((a, b) => (latestScore(b) ?? -1) - (latestScore(a) ?? -1));
  const ended = people.filter((p) => p.ended);
  const add = () => (!isPremium && active.length >= FREE_PEOPLE ? setPaywall(true) : router.push('/person/new'));

  return (
    <Screen testID="ranking">
      <H1>WorthIt?</H1>
      {active.length === 0 ? (
        <EmptyState icon="search-outline" title="Who are you seeing?" body="Add a nickname (never a real name) and do a 20-second check-in." action={<Button title="Add someone" icon="add" onPress={add} testID="add-person" />} />
      ) : (
        <>
          <Stack gap={10}>
            {ranked.map((p, i) => {
              const s = latestScore(p);
              const v = s == null ? null : verdict(s);
              const t = isPremium ? trend(p.checkIns) : null;
              return (
                <Card key={p.id} onPress={() => router.push(`/person/${p.id}`)} testID={`person-${p.nickname}`} accessibilityLabel={`${i + 1}. ${p.nickname}${s == null ? ', no check-in yet' : `, ${s} out of 100, ${v!.label}`}`}>
                  <Row gap={12}>
                    <Text style={{ fontFamily: font.display, fontSize: 18, color: c.textMuted, width: 26 }}>{s == null ? '–' : `${i + 1}`}</Text>
                    <Text style={{ fontSize: 30 }}>{p.emoji}</Text>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Strong>{p.nickname}</Strong>
                      <Muted>{s == null ? 'No check-in yet' : `${v!.emoji} ${v!.label}${t ? ` · ${t > 0 ? '▲' : '▼'} ${Math.abs(t)}` : ''}`}</Muted>
                    </Stack>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text testID={`score-${p.nickname}`} style={{ fontFamily: font.display, fontSize: 26, color: s == null ? c.textMuted : s >= 50 ? c.primary : c.text }}>{s ?? '?'}</Text>
                    </View>
                  </Row>
                </Card>
              );
            })}
          </Stack>
          <Button title="Add someone" icon="add" variant="secondary" onPress={add} testID="add-person" />
        </>
      )}
      {ended.length ? (
        <Section title="Ended">
          {ended.map((p) => (
            <Card key={p.id} onPress={() => router.push(`/person/${p.id}`)}>
              <Row gap={10}>
                <Text style={{ fontSize: 22, opacity: 0.6 }}>{p.emoji}</Text>
                <Muted>{`${p.nickname} · ${p.ended!.lesson ? `"${p.ended!.lesson}"` : 'NEXT!'}`}</Muted>
              </Row>
            </Card>
          ))}
        </Section>
      ) : null}
      <Muted center>Private to this phone. Scores rate behaviours and how you feel, not people.</Muted>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} reason={`Free WorthIt? tracks ${FREE_PEOPLE} people at a time. Busy? Premium has no limit.`} />
    </Screen>
  );
}
